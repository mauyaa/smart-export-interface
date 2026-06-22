// SmartExports API client — fully typed against api/main.py
// Base URL is overridable via VITE_SMARTEXPORTS_API for local dev.

export const API_BASE =
  (import.meta.env.VITE_SMARTEXPORTS_API as string | undefined) ??
  "https://smartexports-api.onrender.com";

export type RiskLevel = "Safe" | "Risky" | "Unclear";

export interface ResultCard {
  fertilizer: string;
  crop: string;
  risk_level: RiskLevel;
  explanation: string;
  next_step: string;
  alternative_product?: string | null;
  evidence: Record<string, unknown>;
  matched_via: string;
}

export interface ExtractLabelResponse {
  product_name: string;
  raw_text?: string;
  confidence?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") detail = data.detail;
    else if (data?.detail) detail = JSON.stringify(data.detail);
  } catch {
    /* ignore */
  }
  throw new ApiError(res.status, detail);
}

export async function checkFertilizer(input: {
  fertilizer_name: string;
  crop_name: string;
}): Promise<ResultCard> {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function extractLabel(file: File): Promise<ExtractLabelResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/extract-label`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function escalate(input: {
  fertilizer_name: string;
  crop_name: string;
  farmer_contact?: string;
  notes?: string;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/escalate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  return res.json().catch(() => ({ ok: true }));
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Kenyan export-bound crops commonly screened.
export const COMMON_CROPS = [
  "Tea",
  "Coffee",
  "Avocado",
  "Macadamia",
  "French Beans",
  "Snow Peas",
  "Mango",
  "Cut Flowers",
  "Passion Fruit",
  "Pineapple",
] as const;
