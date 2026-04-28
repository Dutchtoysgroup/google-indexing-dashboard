// Lijst van webshops die in het dashboard verschijnen.
//
// De configuratie komt uit de environment variabele NEXT_PUBLIC_SHOPS_CONFIG.
// Verwacht formaat (JSON-string):
//
//   [
//     { "id": "merknaam_nl", "name": "Nederland",   "flag": "🇳🇱", "domain": "merk.nl" },
//     { "id": "merknaam_de", "name": "Deutschland", "flag": "🇩🇪", "domain": "merk.de" }
//   ]
//
// Het veld "id" moet exact overeenkomen met de shop_id zoals die door de
// indexing-pipeline in de database wordt gezet.
//
// Tip: zet dezelfde JSON in zowel je lokale .env.local als in de Vercel
// environment variabelen, anders zie je in productie geen shops.

export type ShopInfo = {
  name: string;
  flag: string;
  domain: string;
};

type ShopsConfigEntry = ShopInfo & { id: string };

function parseShopsConfig(): Record<string, ShopInfo> {
  const raw = process.env.NEXT_PUBLIC_SHOPS_CONFIG;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ShopsConfigEntry[];
    if (!Array.isArray(parsed)) return {};
    const out: Record<string, ShopInfo> = {};
    for (const entry of parsed) {
      if (!entry || typeof entry.id !== "string") continue;
      out[entry.id] = {
        name: entry.name ?? entry.id,
        flag: entry.flag ?? "🌐",
        domain: entry.domain ?? "",
      };
    }
    return out;
  } catch {
    // Ongeldige JSON — log naar de server zodat het tijdens deploy zichtbaar is.
    if (typeof console !== "undefined") {
      console.error(
        "NEXT_PUBLIC_SHOPS_CONFIG kon niet als JSON worden geparsed. Controleer het formaat in je env vars.",
      );
    }
    return {};
  }
}

export const SHOP_INFO: Record<string, ShopInfo> = parseShopsConfig();
