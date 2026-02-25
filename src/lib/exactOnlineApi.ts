const API_BASE = "http://localhost:3001";

export const EXACT_AUTH_URL = `${API_BASE}/auth/exact`;

export async function getExactStatus(): Promise<{
    connected: boolean;
    division?: number;
}> {
    const res = await fetch(`${API_BASE}/api/exact/status`);
    if (!res.ok) throw new Error("Failed to check Exact status");
    return res.json();
}

export async function pushInvoiceToExact(
    invoiceData: any,
    supplierGuid: string,
    glAccountGuid: string,
    journal?: string
): Promise<any> {
    const res = await fetch(`${API_BASE}/api/exact/push-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceData, supplierGuid, glAccountGuid, journal }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
}
