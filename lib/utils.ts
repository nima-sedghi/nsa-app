// Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to plain ASCII digits, strips
// whitespace. Used on both client (live validation UX) and server (authoritative check).
export function normalizeId(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim().replace(/\s+/g, "");
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(d);
    if (persian !== -1) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(d);
    if (arabic !== -1) return String(arabic);
    return d;
  });
}

export function isDigitsOnly(s: string): boolean {
  return /^\d+$/.test(s);
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
