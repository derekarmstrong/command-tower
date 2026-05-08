import type { ScryfallCard } from '@/types/card';

export interface CardPrinting {
  id: string;
  set: string;
  set_name: string;
  image_uris: Record<string, string> | null;
  rarity: string;
  layout?: string;
  prices?: Record<string, string | null> | null;
  purchase_uris?: Record<string, string> | null;
  quantity?: number;
  foil?: string;
}

export interface GroupedCard {
  name: string;
  mana_cost: string;
  type_line: string;
  cmc: number;
  colors: string[] | null;
  printings: CardPrinting[];
}

export function groupCardsByName(cards: ScryfallCard[]): GroupedCard[] {
  const groups = new Map<string, GroupedCard>();

  for (const card of cards) {
    const existing = groups.get(card.name);
    const printing: CardPrinting = {
      id: card.id,
      set: card.set,
      set_name: card.set_name,
      image_uris: card.image_uris,
      rarity: card.rarity,
      layout: card.layout,
      prices: card.prices,
      purchase_uris: card.purchase_uris,
      quantity: card.collection_quantity,
      foil: card.collection_foil,
    };

    if (existing) {
      existing.printings.push(printing);
    } else {
      const frontFace = card.card_faces?.[0];
      groups.set(card.name, {
        name: card.name,
        mana_cost: card.mana_cost || frontFace?.mana_cost || '',
        type_line: card.type_line || frontFace?.type_line || '',
        cmc: card.cmc,
        colors: card.colors,
        printings: [printing],
      });
    }
  }

  return Array.from(groups.values());
}
