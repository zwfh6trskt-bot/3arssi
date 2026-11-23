// ID helpers.
// - newId(): random UUID for records created at runtime.
// - seedId(key): deterministic UUID for seed rows, so seed scripts are
//   idempotent and the same row has the same ID in SQL and in demo mode.

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback (very old browsers)
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return formatUuid(b);
}

function fnv1a(str: string, seed: number): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function formatUuid(b: Uint8Array): string {
  b[6] = (b[6] & 0x0f) | 0x50; // version 5-style marker
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function seedId(key: string): string {
  const b = new Uint8Array(16);
  for (let k = 0; k < 4; k++) {
    const h = fnv1a("3arssi:" + key, k * 0x9e3779b9);
    b[k * 4] = h >>> 24; b[k * 4 + 1] = (h >>> 16) & 255; b[k * 4 + 2] = (h >>> 8) & 255; b[k * 4 + 3] = h & 255;
  }
  return formatUuid(b);
}

export function slugify(s: string): string {
  return s
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}
