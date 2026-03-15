/**
 * Product restriction rules for Mamazon.
 *
 * Sources:
 *  - One Way Cargo prohibited items: https://onewaycargo.net/articulos-prohibidos
 *  - One Way Cargo special import regime (same page)
 *  - Amazon freight-forwarder shipping restrictions
 *
 * Categories come from Rainforest API `product.categories[].name`.
 * A product is checked against these rules in order:
 *  1. If ANY category in its breadcrumb is in `blockedCategories` → blocked
 *  2. If ANY keyword matches title/bullets/specs → blocked (with reason)
 *  3. If ANY category is in `flaggedCategories` → warning (special import regime)
 *  4. Otherwise → allowed
 */

export type RestrictionResult =
  | { status: "allowed" }
  | { status: "blocked"; reason: string }
  | { status: "flagged"; reason: string };

// ---------------------------------------------------------------------------
// 1. Blocked categories — these CANNOT be shipped at all
//    Matched against any level in the product's category breadcrumb.
// ---------------------------------------------------------------------------
const blockedCategories: Record<string, string> = {
  // -- Weapons & tactical (OWC: knives, firearms, ammo, airsoft, pepper spray, etc.)
  "Hunting & Fishing": "Weapons/hunting equipment prohibited by OWC",
  "Airsoft & Paintball": "Airsoft guns prohibited by OWC",
  "Knives & Tools": "Knives of any kind prohibited by OWC",
  "Knife Sharpeners": "Knives of any kind prohibited by OWC",
  "Knife Sets": "Knives of any kind prohibited by OWC",
  "Knife Blocks & Storage": "Knives of any kind prohibited by OWC",
  "Ammunition": "Ammunition prohibited by OWC",
  "Firearms": "Firearms prohibited by OWC",
  "Gun Holsters": "Firearms-related items prohibited by OWC",
  "Protective Gear": "Protective/tactical gear prohibited by OWC (Motorcycle)",

  // -- Drones (OWC: drones/camera-equipped helicopters prohibited)
  "Unmanned Aerial Vehicles (UAVs)": "Drones prohibited by OWC",
  "Remote & App Controlled Vehicles & Parts": "May include drones — review required",

  // -- Hazardous materials (OWC + Amazon FF)
  "Hazardous Material Handling": "Hazardous materials prohibited",
  "Lab Chemicals": "Chemicals prohibited by OWC",
  "Cleaning Chemicals": "Industrial chemicals — may be prohibited",
  "Adhesives, Sealants & Lubricants": "Flammable/chemical products prohibited",
  "Oils & Fluids": "Automotive fluids — hazardous for shipping",
  "Refrigerants": "Hazardous materials prohibited",
  "Fuel & Firestarters": "Flammable materials prohibited by OWC",
  "Fireworks": "Fireworks/pyrotechnics prohibited by OWC",
  "Lighters & Matches": "Flammable items prohibited by OWC",
  "Tobacco-Related Products": "Controlled substances",
  "Weed Torches": "Flammable items prohibited",

  // -- Batteries (Amazon FF restriction for lithium; OWC: car batteries with acid)
  "Batteries & Accessories": "Batteries restricted for freight forwarding",
  "Batteries, Chargers & Accessories": "Batteries restricted for freight forwarding",
  "Jump Starters, Battery Chargers & Portable Power": "Batteries restricted for FF",

  // -- Vehicles & large items
  "Vehicles": "Vehicles cannot be shipped",
  "Tires & Wheels": "Oversized automotive parts",
  "Tires": "Oversized automotive parts",

  // -- Satellite & surveillance (OWC: satellite equipment prohibited)
  "Satellite Television": "Satellite equipment prohibited by OWC",

  // -- Jewelry & fine art (OWC: jewelry and artwork prohibited)
  "Collectibles & Fine Arts": "Artwork/collectibles prohibited by OWC",
  "Fine Art": "Artwork prohibited by OWC",
  "Jewelry": "Jewelry prohibited by OWC",
  "Jewelry & Watches": "Jewelry prohibited by OWC",

  // -- Perishables
  "Grocery & Gourmet Food": "Perishable food cannot be shipped internationally",
  "Amazon Fresh": "Perishable — cannot ship",

  // -- Alcoholic beverages
  "Alcoholic Beverages": "Alcohol cannot be shipped",

  // -- Live animals (OWC)
  "Live Animals": "Live animals prohibited by OWC",

  // -- Digital / non-physical (no point ordering)
  "Amazon Instant Video": "Digital product — no physical shipment",
  "Audible": "Digital product — no physical shipment",
  "Digital Music": "Digital product — no physical shipment",
  "Kindle Store": "Digital product — no physical shipment",
  "Magazine Subscriptions": "Digital product — no physical shipment",
  "Apps & Games": "Digital product — no physical shipment",
  "Gift Cards": "Gift cards cannot be shipped internationally",
  "Downloadable Content": "Digital product — no physical shipment",
  "Online Game Services": "Digital product — no physical shipment",
  "Electronics Warranties": "Non-physical product",
  "Appliance Warranties": "Non-physical product",
  "Service Plans": "Non-physical product",
  "Installation Services": "Non-physical product",
};

// ---------------------------------------------------------------------------
// 2. Keyword blocklist — matched against title + feature_bullets + spec values
//    Case-insensitive. If matched → blocked.
// ---------------------------------------------------------------------------
export const blockedKeywords: { pattern: RegExp; reason: string }[] = [
  // Weapons & tactical
  { pattern: /\bknife\b|\bknives\b/i, reason: "Knives prohibited by OWC" },
  { pattern: /\bmachete\b/i, reason: "Bladed weapons prohibited by OWC" },
  { pattern: /\bsword\b/i, reason: "Bladed weapons prohibited by OWC" },
  { pattern: /\bdagger\b/i, reason: "Bladed weapons prohibited by OWC" },
  { pattern: /\bpepper spray\b/i, reason: "Pepper spray prohibited by OWC" },
  { pattern: /\btaser\b|\bstun gun\b|\belectroshock\b/i, reason: "Electroshock weapons prohibited by OWC" },
  { pattern: /\bairsoft\b/i, reason: "Airsoft guns prohibited by OWC" },
  { pattern: /\bbulletproof\b|\bballistic vest\b/i, reason: "Ballistic protection prohibited by OWC" },
  { pattern: /\bgas mask\b/i, reason: "Gas masks prohibited by OWC" },
  { pattern: /\bcamouflage\b|\bcamo pattern\b/i, reason: "Camouflage articles prohibited by OWC" },
  { pattern: /\bbow and arrow\b|\bcrossbow\b/i, reason: "Bows/arrows prohibited by OWC" },
  { pattern: /\bammunition\b|\bammo\b/i, reason: "Ammunition prohibited by OWC" },
  { pattern: /\bfirearm\b|\bhandgun\b|\brifle\b|\bshotgun\b/i, reason: "Firearms prohibited by OWC" },
  { pattern: /\bholster\b/i, reason: "Firearms-related items prohibited by OWC" },

  // Drones
  { pattern: /\bdrone\b|\bquadcopter\b|\buav\b/i, reason: "Drones prohibited by OWC" },

  // Hazmat / flammable
  { pattern: /\baerosol\b/i, reason: "Aerosols restricted for freight forwarding" },
  { pattern: /\bpropane\b|\bbutane\b/i, reason: "Flammable gas prohibited" },
  { pattern: /\bfirework\b|\bpyrotechnic\b/i, reason: "Fireworks prohibited by OWC" },
  { pattern: /\bexplosive\b/i, reason: "Explosives prohibited by OWC" },

  // Lithium batteries (Amazon FF restriction)
  { pattern: /\blithium.{0,10}batter/i, reason: "Lithium batteries restricted for freight forwarding" },
  { pattern: /\bpower\s?bank\b/i, reason: "Power banks (lithium) restricted for freight forwarding" },
];

// ---------------------------------------------------------------------------
// 3. Spec-based blocks — check product.specifications key/value pairs
// ---------------------------------------------------------------------------
export const blockedSpecs: { key: string; pattern: RegExp; reason: string }[] = [
  {
    key: "Batteries",
    pattern: /lithium/i,
    reason: "Lithium batteries restricted for freight forwarding",
  },
  {
    key: "Battery Type",
    pattern: /lithium/i,
    reason: "Lithium batteries restricted for freight forwarding",
  },
];

// ---------------------------------------------------------------------------
// 4. Flagged categories — OWC "special import regime"
//    These CAN be shipped but require extra handling / have risk.
//    Shown as a warning, not a hard block.
// ---------------------------------------------------------------------------
const flaggedCategories: Record<string, string> = {
  // Cell phones (OWC special regime)
  "Cell Phones & Accessories": "Cell phones require special import handling (OWC)",
  "Carrier Cell Phones": "Cell phones require special import handling (OWC)",
  "Unlocked Cell Phones": "Cell phones require special import handling (OWC)",

  // Electronics — laptops specifically (OWC special regime)
  "Electronics": "Electronics may require special import handling (OWC)",
  "Computers & Accessories": "Laptops/computers require special import handling (OWC)",
  "Computers & Tablets": "Laptops/computers require special import handling (OWC)",
  "Laptop Accessories": "Laptop items require special import handling (OWC)",

  // Beauty & personal care (OWC special regime for perfumes, creams, cosmetics)
  "Beauty": "Perfumes/cosmetics require special import handling (OWC)",
  "Fragrance": "Perfumes require special import handling (OWC)",
  "Makeup": "Cosmetics require special import handling (OWC)",
  "Skin Care": "Creams/personal care require special import handling (OWC)",
  "Personal Care": "Personal care items require special import handling (OWC)",

  // Health — medications & supplements (OWC special regime)
  "Health & Personal Care": "Medications/supplements require special import handling (OWC)",
  "OTC Medications & Treatments": "Medications require special import handling (OWC)",
  "Vitamins & Dietary Supplements": "Supplements require special import handling (OWC)",
  "Sports Nutrition": "Sports supplements require special import handling (OWC)",

  // Clothing & footwear for commercial purposes (OWC special regime)
  "Clothing, Shoes & Jewelry": "Clothing/footwear may require special import handling (OWC)",

  // Carbonated/energy drinks (OWC special regime)
  "Beverages": "Carbonated/energy beverages require special import handling (OWC)",
  "Bottled Beverages, Water & Drink Mixes": "Beverages require special import handling (OWC)",

  // Video games — consoles are electronics
  "Video Game Consoles & Accessories": "Electronics require special import handling (OWC)",
};

// ---------------------------------------------------------------------------
// Check function
// ---------------------------------------------------------------------------

type RainforestProduct = {
  title: string;
  categories?: { name: string }[];
  feature_bullets?: string[];
  specifications?: { name: string; value: string }[];
};

export function checkProductRestrictions(
  product: RainforestProduct
): RestrictionResult {
  const categoryNames = (product.categories ?? []).map((c) => c.name);

  // 1. Check blocked categories
  for (const catName of categoryNames) {
    if (blockedCategories[catName]) {
      return { status: "blocked", reason: blockedCategories[catName] };
    }
  }

  // 2. Check keyword blocklist against title + bullets
  const searchableText = [
    product.title,
    ...(product.feature_bullets ?? []),
    ...(product.specifications ?? []).map((s) => `${s.name}: ${s.value}`),
  ].join(" ");

  for (const { pattern, reason } of blockedKeywords) {
    if (pattern.test(searchableText)) {
      return { status: "blocked", reason };
    }
  }

  // 3. Check spec-based blocks
  for (const spec of product.specifications ?? []) {
    for (const { key, pattern, reason } of blockedSpecs) {
      if (
        spec.name.toLowerCase().includes(key.toLowerCase()) &&
        pattern.test(spec.value)
      ) {
        return { status: "blocked", reason };
      }
    }
  }

  // 4. Check flagged categories
  for (const catName of categoryNames) {
    if (flaggedCategories[catName]) {
      return { status: "flagged", reason: flaggedCategories[catName] };
    }
  }

  return { status: "allowed" };
}
