export interface ScryfallCard {
  id: string;
  name: string;
  rarity: string;
  set: string;
  set_name: string;
  type_line: string;
  mana_cost: string;
  cmc: number;
  image_uris: Record<string, string> | null;
  colors: string[] | null;
  layout?: string;
  oracle_text?: string | null;
  power?: string | null;
  toughness?: string | null;
  flavor_text?: string | null;
  artist?: string | null;
  prices?: Record<string, string | null> | null;
  purchase_uris?: Record<string, string> | null;
  games?: string[] | null;
  legalities?: Record<string, string> | null;
  set_type?: string | null;
  collector_number?: string | null;
  released_at?: string | null;
  scryfall_uri?: string | null;
  card_faces?: ScryfallCardFace[] | null;
  collection_quantity?: number;
  collection_foil?: string;
  collection_condition?: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text: string;
  power?: string | null;
  toughness?: string | null;
  flavor_text?: string | null;
  artist?: string | null;
  image_uris?: Record<string, string> | null;
  colors?: string[] | null;
  color_identity?: string[] | null;
}
