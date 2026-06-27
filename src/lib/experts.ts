// Expert / dashboard API client and session helpers
import { API_BASE, ApiError } from "./api";

export interface Expert {
  id: string;
  name: string;
  email: string;
  organization?: string;
  bio?: string;
  cropTags?: string[];
  phone?: string;
}

export interface Escalation {
  id: string;
  farmerName: string | null;
  farmerPhone: string | null;
  farmerCounty: string | null;
  fertilizer: string;
  crop: string;
  riskLevel: "Safe" | "Risky" | "Unclear" | string;
  status: "pending" | "responded" | "resolved" | string;
  createdAt: string | null;
  explanation?: string | null;
  notes?: string | null;
}

const SESSION_KEY = "smartexports.expert";

export function getSession(): Expert | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Expert) : null;
  } catch {
    return null;
  }
}

export function setSession(expert: Expert) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(expert));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const d = await res.json();
      if (typeof d?.detail === "string") detail = d.detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  organization: string;
  county: string;
  crop_tags: string[];
  substance_tags: string[];
  bio?: string;
}

export async function registerExpert(input: RegisterInput) {
  const res = await fetch(`${API_BASE}/experts/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parse<{ status: string; expert_id: string; name: string; email: string }>(res);
}

export async function loginExpert(email: string, password: string) {
  const res = await fetch(`${API_BASE}/experts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parse<{ status: string; expert: Expert }>(res);
}

export async function getEscalations(expertId: string): Promise<Escalation[]> {
  const res = await fetch(`${API_BASE}/experts/${expertId}/escalations`);
  const data = await parse<{ escalations: Escalation[] }>(res);
  return data.escalations ?? [];
}

export async function updateEscalationStatus(
  escalationId: string,
  status: "pending" | "responded" | "resolved",
) {
  const res = await fetch(
    `${API_BASE}/escalations/${escalationId}/status?status=${status}`,
    { method: "PATCH" },
  );
  return parse<{ id: string; status: string }>(res);
}

export const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay",
  "Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii",
  "Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera",
  "Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi",
  "Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River",
  "Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
];

export const CROP_OPTIONS = [
  "Tea","Coffee","Avocado","Macadamia","French Beans","Snow Peas",
  "Mango","Cut Flowers","Passion Fruit","Pineapple","Maize","Horticulture",
];

export function riskClasses(level: string) {
  const l = (level || "").toLowerCase();
  if (l === "safe") return "bg-[color:var(--safe-soft)] text-[color:var(--safe)] border-[color:var(--safe)]/30";
  if (l === "risky") return "bg-[color:var(--risky-soft)] text-[color:var(--risky)] border-[color:var(--risky)]/30";
  return "bg-[color:var(--unclear-soft)] text-[color:var(--unclear)] border-[color:var(--unclear)]/30";
}

export function statusClasses(status: string) {
  const s = (status || "pending").toLowerCase();
  if (s === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "responded") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}
