// Builds external contact links from admin-entered values.
// Algerian local numbers (0XXXXXXXXX) are converted to international form.

export function intlDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "213" + d.slice(1);
  d = d.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

export function telLink(raw: string | null | undefined) {
  const d = intlDigits(raw);
  return d ? `tel:+${d}` : null;
}

export function whatsappLink(raw: string | null | undefined, text?: string) {
  const d = intlDigits(raw);
  return d ? `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;
}

export function instagramLink(raw: string | null | undefined) {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return /instagram\.com/i.test(v) ? v : null;
  const handle = v.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  return handle ? `https://www.instagram.com/${handle}/` : null;
}

export function websiteLink(raw: string | null | undefined) {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { return new URL(url).protocol.startsWith("http") ? url : null; } catch { return null; }
}
