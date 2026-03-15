/**
 * Test suite of Amazon products for validating restriction checks,
 * price estimates, and shipping calculations.
 */

export const testProducts = [
  // ---- SHOULD BE ALLOWED ----
  {
    url: "https://www.amazon.com/dp/B00HEGDID4",
    name: "Totally Bamboo Salt Cellar",
    expectedStatus: "allowed",
    notes: "Kitchen item, lightweight (4.2 oz)",
  },
  {
    url: "https://www.amazon.com/dp/B0CHPCHS17",
    name: "Stanley Quencher Tumbler 40oz",
    expectedStatus: "allowed",
    notes: "Drinkware, Home & Kitchen",
  },
  {
    url: "https://www.amazon.com/dp/B0D2Q9139Y",
    name: "Kindle Paperwhite (16 GB)",
    expectedStatus: "allowed",
    notes: "eBook reader — physical device, should be allowed",
  },
  {
    url: "https://www.amazon.com/dp/B09V3KXJPB",
    name: "Crocs Classic Clog",
    expectedStatus: "flagged",
    notes: "Footwear — OWC special import regime",
  },
  {
    url: "https://www.amazon.com/dp/B0BN9PLFLM",
    name: "LEGO Icons Orchid Plant",
    expectedStatus: "allowed",
    notes: "Toy, building set",
  },
  {
    url: "https://www.amazon.com/dp/B07FZ8S74R",
    name: "Echo Dot (smart speaker)",
    expectedStatus: "flagged",
    notes: "Electronics — OWC special import regime",
  },
  {
    url: "https://www.amazon.com/dp/B0CFWQN3JC",
    name: "Apple AirPods 4",
    expectedStatus: "flagged",
    notes: "Electronics — OWC special import regime, may have lithium battery",
  },

  // ---- SHOULD BE FLAGGED (special import regime) ----
  {
    url: "https://www.amazon.com/dp/B0DGJHF9TG",
    name: "iPhone 16",
    expectedStatus: "flagged",
    notes: "Cell phone — OWC special import regime",
  },
  {
    url: "https://www.amazon.com/dp/B0DPJ1BVJM",
    name: "MacBook Air M4",
    expectedStatus: "flagged",
    notes: "Laptop — OWC special import regime",
  },
  {
    url: "https://www.amazon.com/dp/B0D1XD1ZV3",
    name: "Optimum Nutrition Gold Standard Whey",
    expectedStatus: "flagged",
    notes: "Sports nutrition — OWC special import regime",
  },

  // ---- SHOULD BE BLOCKED ----
  {
    url: "https://www.amazon.com/dp/B000FCOPUM",
    name: "Victorinox Swiss Army Knife",
    expectedStatus: "blocked",
    notes: "Knife — prohibited by OWC",
  },
  {
    url: "https://www.amazon.com/dp/B0787GRPF5",
    name: "DJI Mini Drone",
    expectedStatus: "blocked",
    notes: "Drone — prohibited by OWC",
  },
  {
    url: "https://www.amazon.com/dp/B00LX3AIN8",
    name: "SABRE Pepper Spray",
    expectedStatus: "blocked",
    notes: "Pepper spray — prohibited by OWC",
  },
  {
    url: "https://www.amazon.com/dp/B09MFJ88WK",
    name: "Anker Portable Power Bank 20000mAh",
    expectedStatus: "blocked",
    notes: "Power bank with lithium battery — FF restriction",
  },
  {
    url: "https://www.amazon.com/dp/B0819DG91C",
    name: "Amazon Gift Card",
    expectedStatus: "blocked",
    notes: "Gift card — not a physical shippable product",
  },
] as const;
