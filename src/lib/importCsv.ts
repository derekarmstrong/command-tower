export interface CsvRow {
  name: string;
  setCode: string;
  set_name: string;
  collectorNumber: string;
  foil: string;
  rarity: string;
  quantity: number;
  scryfallId: string;
  purchasePrice: number | null;
  isMisprint: boolean;
  isAltered: boolean;
  condition: string;
  language: string;
  currency: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length < 11) continue;
    const row: Record<string, string> = {};
    header.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push({
      name: row['Name'] || '',
      setCode: row['Set code'] || '',
      set_name: row['Set name'] || '',
      collectorNumber: row['Collector number'] || '',
      foil: row['Foil'] || 'normal',
      rarity: row['Rarity'] || '',
      quantity: parseInt(row['Quantity'] || '1', 10) || 1,
      scryfallId: row['Scryfall ID'] || '',
      purchasePrice: parseFloat(row['Purchase price']) || null,
      isMisprint: row['Misprint'] === 'true',
      isAltered: row['Altered'] === 'true',
      condition: row['Condition'] || 'near_mint',
      language: row['Language'] || 'en',
      currency: row['Purchase price currency'] || 'USD',
    });
  }
  return rows;
}

export interface ImportResult {
  total: number;
  matched: number;
  unmatched: string[];
  errors: string[];
}

export async function importCsvRows(
  rows: CsvRow[],
  collectionId: string,
  supabaseClient: any,
  onProgress?: (processed: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = { total: rows.length, matched: 0, unmatched: [], errors: [] };

  if (rows.length === 0) return result;

  const scryfallIds = rows.map((r) => r.scryfallId).filter(Boolean);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hex32Regex = /^[0-9a-f]{32}$/i;

  function normalizeId(id: string): string | null {
    if (uuidRegex.test(id)) return id.toLowerCase();
    if (hex32Regex.test(id)) {
      return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20,32)}`.toLowerCase();
    }
    return null;
  }

  const idMap = new Map<string, string>();
  for (const id of scryfallIds) {
    const normalized = normalizeId(id);
    if (normalized) {
      idMap.set(id, normalized);
    }
  }

  const invalidIds = scryfallIds.filter((id) => !normalizeId(id));
  for (const badId of [...new Set(invalidIds)]) {
    const matchingRows = rows.filter((r) => r.scryfallId === badId);
    for (const row of matchingRows) {
      result.errors.push(`Invalid Scryfall ID "${badId}" for ${row.name} (${row.setCode} ${row.collectorNumber})`);
    }
  }

  if (idMap.size === 0) {
    return result;
  }

  const uniqueIds = [...new Set(idMap.values())];

  const matchedIds = new Set<string>();
  const chunkSize = 100;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    try {
      const { data: cardMap, error: lookupError } = await supabaseClient
        .from('cards')
        .select('id')
        .in('id', chunk);
      if (lookupError) {
        result.errors.push(`Database lookup error: ${lookupError.message}`);
        return result;
      }
      for (const c of cardMap || []) {
        matchedIds.add(c.id);
      }
    } catch (err) {
      result.errors.push(`Database lookup error: ${(err as Error).message}`);
      return result;
    }
  }

  const batchSize = 20;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (row) => {
        if (!row.scryfallId || !normalizeId(row.scryfallId)) return;

        const normalizedId = normalizeId(row.scryfallId)!;

        if (!matchedIds.has(normalizedId)) {
          result.unmatched.push(`${row.name} (${row.setCode} ${row.collectorNumber})`);
          return;
        }

        try {
          const { error: rpcError } = await supabaseClient.rpc('upsert_collection_card', {
            p_collection_id: collectionId,
            p_card_id: normalizedId,
            p_scryfall_id: normalizedId,
            p_quantity: row.quantity,
            p_foil: row.foil,
            p_condition: row.condition,
            p_purchase_price: row.purchasePrice,
            p_currency: row.currency,
            p_is_misprint: row.isMisprint,
            p_is_altered: row.isAltered,
            p_language: row.language,
          });

          if (rpcError) {
            result.errors.push(`Import error for ${row.name}: ${rpcError.message}`);
            return;
          }
        } catch (err) {
          result.errors.push(`Import error for ${row.name}: ${(err as Error).message}`);
          return;
        }

        result.matched++;
      }),
    );

    if (onProgress) {
      onProgress(Math.min(i + batchSize, rows.length), rows.length);
    }
  }

  return result;
}
