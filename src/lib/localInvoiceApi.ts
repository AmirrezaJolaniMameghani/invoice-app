export async function parseInvoiceLocal(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("http://localhost:3001/api/invoice/parse", {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);

  return JSON.parse(text);
}
