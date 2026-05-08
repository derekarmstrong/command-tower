export function getImageUris(
  card: { id: string; image_uris: Record<string, string> | null },
): Record<string, string> | null {
  if (card.image_uris) return card.image_uris;

  return constructScryfallImageUris(card.id);
}

export function constructScryfallImageUris(id: string): Record<string, string> {
  const base = `https://cards.scryfall.io`;
  const c1 = id[0];
  const c2 = id[1];
  return {
    small: `${base}/small/front/${c1}/${c2}/${id}.jpg`,
    normal: `${base}/normal/front/${c1}/${c2}/${id}.jpg`,
    large: `${base}/large/front/${c1}/${c2}/${id}.jpg`,
    png: `${base}/png/front/${c1}/${c2}/${id}.png`,
    art_crop: `${base}/art_crop/front/${c1}/${c2}/${id}.jpg`,
    border_crop: `${base}/border_crop/front/${c1}/${c2}/${id}.jpg`,
  };
}
