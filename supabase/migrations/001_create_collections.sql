CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'My Collection',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id),
  scryfall_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  foil TEXT NOT NULL DEFAULT 'normal',
  condition TEXT NOT NULL DEFAULT 'near_mint',
  purchase_price DECIMAL(10,2),
  purchase_price_currency TEXT DEFAULT 'USD',
  is_misprint BOOLEAN NOT NULL DEFAULT false,
  is_altered BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, scryfall_id, foil, condition)
);

CREATE INDEX IF NOT EXISTS idx_collection_cards_collection_id ON collection_cards(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_card_id ON collection_cards(card_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_cards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_select' AND tablename = 'collections') THEN
    CREATE POLICY collections_select ON collections FOR SELECT USING (auth.uid() = user_id OR is_public = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_insert' AND tablename = 'collections') THEN
    CREATE POLICY collections_insert ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_update' AND tablename = 'collections') THEN
    CREATE POLICY collections_update ON collections FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collections_delete' AND tablename = 'collections') THEN
    CREATE POLICY collections_delete ON collections FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collection_cards_select' AND tablename = 'collection_cards') THEN
    CREATE POLICY collection_cards_select ON collection_cards FOR SELECT USING (
      EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_id AND (collections.user_id = auth.uid() OR collections.is_public = true))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collection_cards_insert' AND tablename = 'collection_cards') THEN
    CREATE POLICY collection_cards_insert ON collection_cards FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_id AND collections.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collection_cards_update' AND tablename = 'collection_cards') THEN
    CREATE POLICY collection_cards_update ON collection_cards FOR UPDATE USING (
      EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_id AND collections.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'collection_cards_delete' AND tablename = 'collection_cards') THEN
    CREATE POLICY collection_cards_delete ON collection_cards FOR DELETE USING (
      EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_id AND collections.user_id = auth.uid())
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION upsert_collection_card(
  p_collection_id UUID,
  p_card_id UUID,
  p_scryfall_id UUID,
  p_quantity INTEGER,
  p_foil TEXT,
  p_condition TEXT,
  p_purchase_price DECIMAL(10,2),
  p_currency TEXT,
  p_is_misprint BOOLEAN,
  p_is_altered BOOLEAN,
  p_language TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO collection_cards
    (collection_id, card_id, scryfall_id, quantity, foil, condition,
     purchase_price, purchase_price_currency, is_misprint, is_altered, language)
  VALUES
    (p_collection_id, p_card_id, p_scryfall_id, p_quantity, p_foil, p_condition,
     p_purchase_price, p_currency, p_is_misprint, p_is_altered, p_language)
  ON CONFLICT (collection_id, scryfall_id, foil, condition)
  DO UPDATE SET quantity = collection_cards.quantity + EXCLUDED.quantity;
END;
$$;
