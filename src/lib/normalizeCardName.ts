export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['',"""]/g, '')
    .replace(/[,;]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}
