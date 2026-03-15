const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})/,
  /\/gp\/product\/([A-Z0-9]{10})/,
  /\/product\/([A-Z0-9]{10})/,
  /[?&]asin=([A-Z0-9]{10})/,
];

export function extractAsin(url: string): string | null {
  for (const pattern of ASIN_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
