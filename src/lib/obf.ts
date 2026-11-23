import "server-only";

/** Open Beauty Facts lookups (public, no key). Returns null when nothing reliable is found. */
export interface ObfProduct {
  name: string;
  brand: string;
  barcode: string;
  ingredients: string[];
}

function parse(p: Record<string, unknown>): ObfProduct | null {
  const text = String(p.ingredients_text_en || p.ingredients_text || "").trim();
  const ingredients = text ? text.split(/,(?![^(]*\))/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 80) : [];
  const name = String(p.product_name || "").trim();
  if (!name && !ingredients.length) return null;
  return { name, brand: String(p.brands || "").split(",")[0].trim(), barcode: String(p.code || ""), ingredients };
}

export async function obfByBarcode(code: string): Promise<ObfProduct | null> {
  if (!/^\d{8,14}$/.test(code)) return null;
  const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code}.json`, { headers: { "User-Agent": "GlowupAI/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.status === 1 && d.product ? parse(d.product) : null;
}

export async function obfSearch(q: string): Promise<ObfProduct[]> {
  const r = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=5`, { headers: { "User-Agent": "GlowupAI/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const d = await r.json();
  return ((d?.products ?? []) as Record<string, unknown>[]).map(parse).filter((x): x is ObfProduct => !!x);
}
