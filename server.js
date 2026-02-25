import "dotenv/config";
import express from "express";
import cors from "cors";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { createRequire } from 'module';
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const execFileAsync = promisify(execFile);
const upload = multer({ dest: "tmp/" });

function safeTruncate(text, maxChars = 12000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function keepImportantLines(text) {
  const lines = text.split("\n");
  const important = lines.filter((l) =>
    /(invoice|factuur|vat|btw|tax|total|subtotal|amount due|balance due|due date|invoice date|iban|kvk|chamber|reference)/i.test(l)
  );
  // If we found enough useful lines, prefer those:
  const joined = important.slice(0, 220).join("\n").trim();
  return joined.length > 200 ? joined : safeTruncate(text, 12000);
}

async function runTesseractTxt(imagePath, outBase) {
  // Produces outBase.txt
  await execFileAsync("tesseract", [
    imagePath,
    outBase,
    "--oem",
    "1",
    "--psm",
    "4",
    "-l",
    "eng",
    "txt",
  ]);
  return `${outBase}.txt`;
}

const INVOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    invoice_number: { type: ["string", "null"] },
    invoice_date: { type: ["string", "null"] },
    due_date: { type: ["string", "null"] },
    vendor: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        vat_id: { type: ["string", "null"] },
      },
    },
    totals: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        subtotal: { type: ["number", "null"] },
        tax: { type: ["number", "null"] },
        total: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          amount: { type: ["number", "null"] },
        },
        required: ["description", "amount"],
      },
    },
  },
  required: ["invoice_number", "items", "totals"],
};

app.post("/api/invoice/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use form field 'file'." });

    const llamaBaseUrl = process.env.LLAMA_BASE_URL || "http://127.0.0.1:8080";
    const llamaKey = process.env.LLAMA_API_KEY || "";

    const uploadedPath = req.file.path; // e.g. tmp/xxxx
    const absUploaded = path.resolve(uploadedPath);
    const outBase = path.resolve("tmp", `ocr_${Date.now()}`);

    // OCR (TXT)
    const txtPath = await runTesseractTxt(absUploaded, outBase);
    const ocrText = fs.readFileSync(txtPath, "utf8");
    const promptText = keepImportantLines(ocrText);

    // image -> base64 data url for VLM
    const imgB64 = fs.readFileSync(absUploaded).toString("base64");
    const dataUrl = `data:${req.file.mimetype || "image/png"};base64,${imgB64}`;

    const systemText =
      "You extract invoice fields. Return ONLY schema-valid JSON. Use null when missing. Never guess. Use OCR evidence.";

    const userText =
      `OCR_TEXT:\n${promptText}\n\n` +
      `Rules:\n- totals must be consistent\n- dates must be YYYY-MM-DD or null\n- do not add extra keys\n`;

    const payload = {
      model: "local",
      temperature: 0,
      response_format: { type: "json_schema", schema: INVOICE_SCHEMA },
      messages: [
        { role: "system", content: systemText },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    };

    const r = await fetch(`${llamaBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(llamaKey ? { Authorization: `Bearer ${llamaKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const raw = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: "llama-server error", status: r.status, body: raw });
    }

    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;
    const invoiceJson = JSON.parse(content);

    // Cleanup temp files (optional)
    try {
      fs.unlinkSync(absUploaded);
      fs.unlinkSync(txtPath);
    } catch { }

    return res.json({ ok: true, result: invoiceJson });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});


const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const pdf = pdfParse.default || pdfParse;



app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());


app.get("/api/emails", async (req, res) => {
  console.log("[DEBUG:IMAP] Starting email fetch request");
  console.log("[DEBUG:IMAP] IMAP_USER:", process.env.IMAP_USER ? "SET" : "MISSING");
  console.log("[DEBUG:IMAP] IMAP_PASSWORD:", process.env.IMAP_PASSWORD ? "SET" : "MISSING");

  const subjectFilter = req.query.subject;
  const onlySubjects = req.query.only_subjects === "true"; // New param to get only subjects
  const limit = parseInt(req.query.limit) || (onlySubjects ? 50 : 20); // Default limits

  console.log("[DEBUG:IMAP] Subject filter:", subjectFilter || "NONE");
  console.log("[DEBUG:IMAP] Only subjects:", onlySubjects);
  console.log("[DEBUG:IMAP] Limit:", limit);

  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 30000,
    },
  };

  try {
    console.log("[DEBUG:IMAP] Attempting to connect to Gmail IMAP...");
    const connection = await imaps.connect(config);
    console.log("[DEBUG:IMAP] Connected successfully, opening INBOX...");
    await connection.openBox("INBOX");
    console.log("[DEBUG:IMAP] INBOX opened successfully");

    // Build search criteria
    let searchCriteria = ["ALL"];
    if (subjectFilter) {
      searchCriteria = [["SUBJECT", subjectFilter]];
      console.log(`[DEBUG:IMAP] Applying SUBJECT filter: "${subjectFilter}"`);
    } else {
      console.log("[DEBUG:IMAP] No subject filter applied, fetching ALL emails");
    }

    // Determine which parts to fetch based on mode
    // Fetch complete email structure to get all headers properly
    const fetchOptions = {
      bodies: onlySubjects ? ["HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)"] : [""],
      struct: true,
      markSeen: false,
    };

    console.log("[DEBUG:IMAP] Search criteria:", JSON.stringify(searchCriteria));
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log("[DEBUG:IMAP] Search returned", messages.length, "messages");

    if (messages.length === 0 && subjectFilter) {
      console.log(`[DEBUG:IMAP] WARNING: No emails found with subject "${subjectFilter}"`);
      console.log("[DEBUG:IMAP] The inbox might not contain any emails with this exact subject");
    }

    // Reverse to show newest first, then apply limit
    const recentMessages = messages.reverse().slice(0, limit);
    console.log("[DEBUG:IMAP] Processing", recentMessages.length, `recent messages (limited to ${limit})`);

    const emails = await Promise.all(
      recentMessages.map(async (item, index) => {
        console.log(`[DEBUG:IMAP] Processing email ${index + 1}/${recentMessages.length}`);

        const headerPart = item.parts.find((part) => part.which === "HEADER");
        const id = item.attributes.uid;
        const idHeader = "Imap-Id: " + id + "\r\n";

        if (onlySubjects) {
          // Only parse specific header fields
          const headerFields = item.parts.find((part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)");
          const parsed = await simpleParser(idHeader + (headerFields ? headerFields.body : ""));
          return {
            id: id,
            subject: parsed.subject || "(No Subject)",
            date: parsed.date
          };
        } else {
          // Full email parsing - get the complete raw email
          const all = item.parts.find((part) => part.which === "");

          if (!all || !all.body) {
            console.log(`[DEBUG:IMAP] Email ${index + 1} - WARNING: No email body found`);
            return {
              id: id,
              subject: "(No Body)",
              from: "unknown",
              date: new Date(),
              snippet: "",
              body: ""
            };
          }

          const parsed = await simpleParser(all.body);

          console.log(`[DEBUG:IMAP] Email ${index + 1} - messageId:`, parsed.messageId || 'MISSING');
          console.log(`[DEBUG:IMAP] Email ${index + 1} - date:`, parsed.date || 'MISSING');
          console.log(`[DEBUG:IMAP] Email ${index + 1} - Subject: "${parsed.subject || '(No Subject)'}"`);
          console.log(`[DEBUG:IMAP] Email ${index + 1} - From: ${parsed.from?.text || 'undefined'}`);

          // Extract attachments (especially PDFs)
          const attachments = [];
          let attachmentText = "";

          if (parsed.attachments && parsed.attachments.length > 0) {
            for (const att of parsed.attachments) {
              const content = att.content.toString('base64');
              attachments.push({
                filename: att.filename || 'attachment',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size,
                content: content
              });

              if (att.contentType === 'application/pdf') {
                try {
                  const data = await pdf(att.content);
                  attachmentText += `\n\n--- Attachment: ${att.filename} ---\n${data.text}\n`;
                } catch (e) {
                  console.error(`Failed to parse PDF ${att.filename}:`, e);
                }
              }
            }
          }

          return {
            id: id,
            messageId: parsed.messageId,
            subject: parsed.subject,
            from: parsed.from?.text,
            date: parsed.date,
            snippet: parsed.text?.substring(0, 100),
            body: parsed.text || parsed.html || "",
            attachments,
            attachmentText
          };
        }
      })
    );

    console.log(`[DEBUG:IMAP] Total emails after filtering: ${emails.length}`);
    console.log("[DEBUG:IMAP] Successfully fetched", emails.length, "emails");

    connection.end();

    // Return appropriate response format
    if (onlySubjects) {
      res.json({ success: true, subjects: emails });
    } else {
      res.json({ success: true, data: emails });
    }
  } catch (err) {
    console.error("[DEBUG:IMAP] Error occurred:", err.message);
    console.error("[DEBUG:IMAP] Full error:", err);
    res.status(500).json({ error: "Failed to fetch emails: " + err.message });
  }
});

// ─── Exact Online OAuth + API ───────────────────────────────────────────────

const EXACT_BASE = process.env.EXACT_BASE_URL || "https://start.exactonline.nl";
const EXACT_CLIENT_ID = process.env.EXACT_CLIENT_ID || "";
const EXACT_CLIENT_SECRET = process.env.EXACT_CLIENT_SECRET || "";
const EXACT_REDIRECT_URI = process.env.EXACT_REDIRECT_URI || "";

// In-memory token store (lost on restart)
const exactTokens = {
  access_token: null,
  refresh_token: null,
  expires_at: 0,
  division: null,
};

async function refreshExactToken() {
  if (!exactTokens.refresh_token) throw new Error("No refresh token available");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: exactTokens.refresh_token,
    client_id: EXACT_CLIENT_ID,
    client_secret: EXACT_CLIENT_SECRET,
  });

  const r = await fetch(`${EXACT_BASE}/api/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Token refresh failed: ${r.status} ${txt}`);
  }

  const data = await r.json();
  exactTokens.access_token = data.access_token;
  exactTokens.refresh_token = data.refresh_token; // Exact rotates refresh tokens
  exactTokens.expires_at = Date.now() + (data.expires_in || 600) * 1000 - 30000;
  console.log("[EXACT] Token refreshed successfully");
}

async function getExactAccessToken() {
  if (!exactTokens.access_token) throw new Error("Not connected to Exact Online");
  if (Date.now() >= exactTokens.expires_at) {
    await refreshExactToken();
  }
  return exactTokens.access_token;
}

async function fetchExactDivision(accessToken) {
  const r = await fetch(`${EXACT_BASE}/api/v1/current/Me?$select=CurrentDivision`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!r.ok) throw new Error(`Failed to fetch division: ${r.status}`);
  const data = await r.json();
  return data?.d?.results?.[0]?.CurrentDivision ?? null;
}

// 1) Redirect to Exact OAuth authorize
app.get("/auth/exact", (req, res) => {
  if (!EXACT_CLIENT_ID || !EXACT_REDIRECT_URI) {
    return res.status(500).json({ error: "EXACT_CLIENT_ID or EXACT_REDIRECT_URI not configured" });
  }

  const params = new URLSearchParams({
    client_id: EXACT_CLIENT_ID,
    redirect_uri: EXACT_REDIRECT_URI,
    response_type: "code",
    force_login: "0",
  });

  res.redirect(`${EXACT_BASE}/api/oauth2/auth?${params.toString()}`);
});

// 2) OAuth callback — exchange code for tokens
app.get("/auth/exact/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: EXACT_REDIRECT_URI,
      client_id: EXACT_CLIENT_ID,
      client_secret: EXACT_CLIENT_SECRET,
    });

    const tokenRes = await fetch(`${EXACT_BASE}/api/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return res.status(502).send(`Token exchange failed: ${tokenRes.status} ${txt}`);
    }

    const data = await tokenRes.json();
    exactTokens.access_token = data.access_token;
    exactTokens.refresh_token = data.refresh_token;
    exactTokens.expires_at = Date.now() + (data.expires_in || 600) * 1000 - 30000;

    // Fetch division
    exactTokens.division = await fetchExactDivision(data.access_token);
    console.log("[EXACT] Connected! Division:", exactTokens.division);

    // Redirect back to the React app
    res.send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#e2e8f0">
        <div style="text-align:center">
          <h1 style="color:#10b981">✅ Connected to Exact Online</h1>
          <p>Division: ${exactTokens.division}</p>
          <p>You can close this tab and return to the app.</p>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error("[EXACT] Callback error:", err);
    res.status(500).send(`OAuth error: ${err.message}`);
  }
});

// 3) Check connection status
app.get("/api/exact/status", (req, res) => {
  res.json({
    connected: !!exactTokens.access_token,
    division: exactTokens.division,
  });
});

// 4) Push invoice to Exact Online as a Purchase Entry
app.post("/api/exact/push-invoice", async (req, res) => {
  try {
    const accessToken = await getExactAccessToken();
    const division = exactTokens.division;
    if (!division) return res.status(400).json({ error: "No Exact division found. Re-connect." });

    const { invoiceData, supplierGuid, glAccountGuid, journal } = req.body;
    if (!invoiceData) return res.status(400).json({ error: "invoiceData is required" });
    if (!supplierGuid) return res.status(400).json({ error: "supplierGuid is required" });
    if (!glAccountGuid) return res.status(400).json({ error: "glAccountGuid is required" });

    // Map analyzed JSON → Exact PurchaseEntries
    const items = invoiceData.items || [];
    const purchaseEntryLines = items.map((item) => ({
      AmountFC: item.amount ?? 0,
      Description: item.description ?? "",
      GLAccount: glAccountGuid,
    }));

    // If no line items but we have totals, create a single line
    if (purchaseEntryLines.length === 0 && invoiceData.totals?.total) {
      purchaseEntryLines.push({
        AmountFC: invoiceData.totals.total,
        Description: "Invoice total",
        GLAccount: glAccountGuid,
      });
    }

    const payload = {
      Journal: journal || "70", // default purchase journal code
      Supplier: supplierGuid,
      InvoiceNumber: invoiceData.invoice_number || undefined,
      InvoiceDate: invoiceData.invoice_date ? `${invoiceData.invoice_date}T00:00:00` : undefined,
      DueDate: invoiceData.due_date ? `${invoiceData.due_date}T00:00:00` : undefined,
      PurchaseEntryLines: purchaseEntryLines,
    };

    console.log("[EXACT] Posting PurchaseEntry:", JSON.stringify(payload, null, 2));

    const r = await fetch(
      `${EXACT_BASE}/api/v1/${division}/purchaseentry/PurchaseEntries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const body = await r.text();
    if (!r.ok) {
      console.error("[EXACT] PurchaseEntry POST failed:", r.status, body);
      return res.status(r.status).json({ error: "Exact API error", status: r.status, body });
    }

    const result = JSON.parse(body);
    console.log("[EXACT] PurchaseEntry created successfully");
    res.json({ ok: true, result: result?.d });
  } catch (err) {
    console.error("[EXACT] Push error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});