'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, TextInput, Group, Text, Center,
  Pagination, Loader, SegmentedControl, MultiSelect,
  RangeSlider, UnstyledButton, Divider, Checkbox, Paper, Grid,
  Button, Title, Modal, Stack, Alert, Progress,
} from '@mantine/core';
import { IconSearch, IconGridDots, IconList, IconUpload, IconAlertCircle, IconCheck, IconLink } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CardGrid } from '@/components/CardGrid';
import { CardList } from '@/components/CardList';
import { SetSymbol } from '@/components/SetSymbol';
import { parseCsv, importCsvRows, type ImportResult } from '@/lib/importCsv';
import type { ScryfallCard } from '@/types/card';
import type { GroupedCard } from '@/lib/groupCards';
import { groupCardsByName } from '@/lib/groupCards';
import type { SortColumn, SortConfig } from '@/components/CardList';

type ViewMode = 'grid' | 'list';

const EXTRAS_SET_TYPES = ['token', 'funny', 'memorabilia', 'vanguard', 'minigame', 'archenemy', 'planechase'];
const CARD_TYPES = [
  'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact',
  'Planeswalker', 'Land', 'Battle', 'Kindred',
];
const COLOR_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C'];
const DISPLAY_PER_PAGE = 32;

function ManaIcon({ value, size = 16 }: { value: string; size?: number }) {
  const cls = value === 'C' ? 'c' : value.toLowerCase();
  return <i className={`ms ms-cost ms-${cls}`} style={{ fontSize: size, lineHeight: 1, display: 'block' }} />;
}

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groupedCards, setGroupedCards] = useState<GroupedCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rarities, setRarities] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [sets, setSets] = useState<string[]>([]);
  const [setOptions, setSetOptions] = useState<{ value: string; label: string }[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [cmcRange, setCmcRange] = useState<[number, number]>([0, 15]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [fetching, setFetching] = useState(true);
  const [sort, setSort] = useState<SortConfig>({ column: 'name', direction: 'asc' });
  const [includeExtras, setIncludeExtras] = useState(false);
  const [quantityFilter, setQuantityFilter] = useState<number | null>(null);

  const cardCacheRef = useRef<{ key: string; data: ScryfallCard[] } | null>(null);

  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(false);

  const toggleColor = (color: string) => {
    setColors((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]);
    setPage(1);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('cards')
      .select('set, set_name')
      .eq('lang', 'en')
      .limit(10000)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, string>();
        for (const row of data) {
          if (!map.has(row.set)) {
            map.set(row.set, row.set_name);
          }
        }
        const opts = Array.from(map.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setSetOptions(opts);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('collections')
      .select('id, is_public')
      .eq('user_id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCollectionId(data[0].id);
          setIsPublic(data[0].is_public);
        } else {
          supabase
            .from('collections')
            .insert({ user_id: user.id, name: 'My Collection' })
            .select('id')
            .limit(1)
            .then(({ data: insertData }) => {
              if (insertData && insertData.length > 0) {
                setCollectionId(insertData[0].id);
              }
            });
        }
      });
  }, [user]);

  const toggleSort = useCallback((column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  const filterCard = useCallback((c: ScryfallCard) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (rarities.length > 0 && !rarities.includes(c.rarity)) return false;
    if (types.length > 0 && !types.some((t) => (c.type_line || '').toLowerCase().includes(t.toLowerCase()))) return false;
    if (sets.length > 0 && !sets.includes(c.set)) return false;
    if (colors.length > 0) {
      const hasC = colors.includes('C');
      const regular = colors.filter((col) => col !== 'C');
      if (hasC && regular.length === 0) {
        if (c.colors && c.colors.length > 0 && !(c.colors.length === 1 && c.colors[0] === 'C')) return false;
      } else if (regular.length > 0) {
        if (!c.colors || c.colors.length === 0) return false;
        if (!c.colors.every((col) => regular.includes(col))) return false;
      }
    }
    if (cmcRange[0] > 0 || cmcRange[1] < 15) {
      if (c.cmc == null || c.cmc < cmcRange[0] || c.cmc > cmcRange[1]) return false;
    }
    if (!includeExtras) {
      if (c.set_type && EXTRAS_SET_TYPES.includes(c.set_type)) return false;
    }
    return true;
  }, [search, rarities, types, sets, colors, cmcRange, includeExtras]);

  useEffect(() => {
    if (!user || !collectionId) return;

    setFetching(true);

    const fetchCollection = async () => {
      try {
        const currentKey = `${collectionId}-${refreshKey}`;

        if (!cardCacheRef.current || cardCacheRef.current.key !== currentKey) {
          const { count: ccCount, error: countErr } = await supabase
            .from('collection_cards')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collectionId);

          const allCollectionCards: any[] = [];
          if (!countErr && ccCount && ccCount > 0) {
            const pageSize = 1000;
            const totalPages = Math.ceil(ccCount / pageSize);
            const pagePromises = [];
            for (let p = 0; p < totalPages; p++) {
              pagePromises.push(
                supabase
                  .from('collection_cards')
                  .select('card_id, quantity, foil, condition')
                  .eq('collection_id', collectionId)
                  .range(p * pageSize, (p + 1) * pageSize - 1)
              );
            }
            const pageResults = await Promise.all(pagePromises);
            for (const { data, error } of pageResults) {
              if (error) {
                console.error('Error fetching collection cards:', error);
                setFetching(false);
                return;
              }
              if (data) allCollectionCards.push(...data);
            }
          }

          const allCardIds = [...new Set(allCollectionCards.map((cc: any) => cc.card_id))];
          if (allCardIds.length === 0) {
            setGroupedCards([]);
            setTotalCount(0);
            setFetching(false);
            return;
          }

          const chunkSize = 200;
          const chunks: string[][] = [];
          for (let i = 0; i < allCardIds.length; i += chunkSize) {
            chunks.push(allCardIds.slice(i, i + chunkSize));
          }

          const allCardsData: any[] = [];
          const CONCURRENT = 5;
          for (let i = 0; i < chunks.length; i += CONCURRENT) {
            const batch = chunks.slice(i, i + CONCURRENT).map((chunk) =>
              supabase.from('cards').select('*').in('id', chunk)
            );
            const results = await Promise.all(batch.map((q) => q));
            for (const { data, error } of results) {
              if (error) {
                console.error('Error fetching card chunk:', error);
                setFetching(false);
                return;
              }
              if (data) allCardsData.push(...data);
            }
          }

          const cardMap = new Map(allCardsData.map((c: any) => [c.id, c]));

          const aggMap = new Map<string, { totalQty: number; hasFoil: boolean; conditions: Set<string> }>();
          for (const cc of allCollectionCards) {
            if (!cardMap.has(cc.card_id)) continue;
            const existing = aggMap.get(cc.card_id);
            if (existing) {
              existing.totalQty += cc.quantity;
              if (cc.foil !== 'normal') existing.hasFoil = true;
              existing.conditions.add(cc.condition);
            } else {
              aggMap.set(cc.card_id, {
                totalQty: cc.quantity,
                hasFoil: cc.foil !== 'normal',
                conditions: new Set([cc.condition]),
              });
            }
          }

          const joined: ScryfallCard[] = [];
          for (const [cardId, agg] of aggMap) {
            const card = cardMap.get(cardId)!;
            joined.push({
              ...card,
              collection_quantity: agg.totalQty,
              collection_foil: agg.hasFoil ? 'foil' : 'normal',
            });
          }

          const missingMana = joined.filter((c) => !c.mana_cost);
          if (missingMana.length > 0) {
            try {
              for (let i = 0; i < missingMana.length; i += 75) {
                const batch = missingMana.slice(i, i + 75);
                const res = await fetch('https://api.scryfall.com/cards/collection', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    identifiers: batch.map((c) => ({ id: c.id })),
                  }),
                });
                const scryfall = await res.json();
                for (const scryfallCard of scryfall.data || []) {
                  const card = joined.find((c) => c.id === scryfallCard.id);
                  if (card && scryfallCard.card_faces?.[0]?.mana_cost) {
                    card.mana_cost = scryfallCard.card_faces[0].mana_cost;
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to fetch DFC mana costs:', e);
            }
          }

          cardCacheRef.current = { key: currentKey, data: joined };
        }

        let filtered = cardCacheRef.current.data.filter(filterCard);
        const grouped = groupCardsByName(filtered);

        let result = grouped;
        if (quantityFilter != null) {
          result = grouped.filter((g) => {
            const total = g.printings.reduce((sum, p) => sum + (p.quantity || 0), 0);
            return quantityFilter === 4 ? total >= 4 : total === quantityFilter;
          });
        }

        if (sort.column === 'cmc') {
          result.sort((a: any, b: any) =>
            sort.direction === 'asc' ? (a.cmc || 0) - (b.cmc || 0) : (b.cmc || 0) - (a.cmc || 0)
          );
        } else {
          result.sort((a, b) =>
            sort.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          );
        }

        const totalCount = result.length;
        const groupFrom = (page - 1) * DISPLAY_PER_PAGE;
        const paged = result.slice(groupFrom, groupFrom + DISPLAY_PER_PAGE);

        setGroupedCards(paged);
        setTotalCount(totalCount);
      } catch (err) {
        console.error('Unexpected fetch error:', err);
      }
      setFetching(false);
    };
    fetchCollection();
  }, [user, collectionId, page, search, rarities, types, sets, colors, cmcRange, sort, includeExtras, refreshKey, quantityFilter, filterCard]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !collectionId) return;

    setImporting(true);
    setImportResult(null);
    setImportProgress(0);

    try {
      const text = await selectedFile.text();
      const rows = parseCsv(text);
      const result = await importCsvRows(rows, collectionId, supabase, (processed, total) => {
        setImportProgress(Math.round((processed / total) * 100));
      });
      setImportResult(result);
    } catch (err) {
      setImportResult({ total: 0, matched: 0, unmatched: [], errors: [(err as Error).message] });
    }

    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePublic = async () => {
    if (!collectionId) return;
    const next = !isPublic;
    const { error } = await supabase
      .from('collections')
      .update({ is_public: next })
      .eq('id', collectionId);
    if (!error) setIsPublic(next);
  };

  const copyPublicLink = () => {
    if (!collectionId) return;
    const url = `${window.location.origin}/public/collection/${collectionId}`;
    navigator.clipboard.writeText(url);
  };

  if (loading || !user) {
    return <Container size="lg" py={80}><Center><Loader size="xl" /></Center></Container>;
  }

  const totalPages = Math.ceil(totalCount / DISPLAY_PER_PAGE);

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="md">
        <Title order={2}>My Collection</Title>
        <Group gap="sm">
          <Checkbox
            label="Public"
            checked={isPublic}
            onChange={togglePublic}
            size="sm"
          />
          {isPublic && collectionId && (
            <Button
              leftSection={<IconLink size={16} />}
              size="sm"
              variant="light"
              onClick={copyPublicLink}
            >
              Copy Link
            </Button>
          )}
          <Button
            leftSection={<IconUpload size={16} />}
            size="sm"
            onClick={() => setImportModalOpen(true)}
            loading={importing}
          >
            Import CSV
          </Button>
        </Group>
      </Group>

      <Modal
        opened={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportResult(null); setSelectedFile(null); setImportProgress(0); if (importResult) setRefreshKey((k) => k + 1); }}
        title="Import Collection"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Upload a CSV file exported from Manabox to import your collection.
            Duplicate cards will have their quantities summed.
          </Text>
          <Group>
            <Button
              component="label"
              variant="outline"
              disabled={importing}
            >
              Choose CSV File
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileSelect}
              />
            </Button>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={handleUpload}
              disabled={!selectedFile || importing}
              loading={importing}
            >
              {importing ? 'Importing...' : 'Upload'}
            </Button>
          </Group>
          {selectedFile && !importing && !importResult && (
            <Text size="sm" c="dimmed">Selected: {selectedFile.name}</Text>
          )}

          {importing && (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Processing {selectedFile?.name}...</Text>
              <Progress value={importProgress} animated />
              <Text size="xs" c="dimmed">{importProgress}%</Text>
            </Stack>
          )}

          {importResult && (
            <Stack gap="xs">
              {importResult.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" title="Errors">
                  {importResult.errors.map((e, i) => <Text key={i} size="xs">{e}</Text>)}
                </Alert>
              )}
              {importResult.unmatched.length > 0 && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Unmatched Cards">
                  <Text size="xs">{importResult.unmatched.length} cards not found in database</Text>
                </Alert>
              )}
              <Alert icon={<IconCheck size={16} />} color="green" title="Import Complete">
                <Text size="sm">
                  Matched: {importResult.matched} / {importResult.total}
                  {importResult.unmatched.length > 0 && ` | Unmatched: ${importResult.unmatched.length}`}
                  {importResult.errors.length > 0 && ` | Errors: ${importResult.errors.length}`}
                </Text>
              </Alert>
            </Stack>
          )}
        </Stack>
      </Modal>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 3 }} style={{ paddingLeft: 0 }}>
          <Paper withBorder p="md" pos="sticky" top={16}>
            <Text size="sm" fw={500} mb={4}>Set</Text>
            <MultiSelect
              placeholder="Set"
              data={setOptions}
              value={sets}
              onChange={(v) => { setSets(v); setPage(1); }}
              clearable
              searchable
              size="sm"
              mb="md"
              maxDropdownHeight={200}
              renderOption={({ option }) => (
                <Group gap={6}>
                  <SetSymbol setCode={option.value} size={14} />
                  <span>{option.label}</span>
                </Group>
              )}
            />

            <Text size="sm" fw={500} mb={4}>Rarity</Text>
            <MultiSelect
              placeholder="Rarity"
              data={['common', 'uncommon', 'rare', 'mythic', 'special'].map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
              value={rarities}
              onChange={(v) => { setRarities(v); setPage(1); }}
              clearable
              size="sm"
              mb="md"
              maxDropdownHeight={200}
            />

            <Text size="sm" fw={500} mb={4}>Color</Text>
            <Group gap={4} mb="md">
              {COLOR_OPTIONS.map((c) => (
                <UnstyledButton
                  key={c}
                  onClick={() => toggleColor(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: colors.includes(c)
                      ? '2px solid var(--mantine-color-violet-6)'
                      : '2px solid var(--mantine-color-gray-4)',
                    background: colors.includes(c)
                      ? 'var(--mantine-color-violet-0)'
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <ManaIcon value={c} size={14} />
                </UnstyledButton>
              ))}
            </Group>

            <Text size="sm" fw={500} mb={4}>CMC</Text>
            <RangeSlider
              min={0}
              max={15}
              step={1}
              minRange={0}
              value={cmcRange}
              onChange={(v) => { setCmcRange(v); setPage(1); }}
              marks={[
                { value: 0, label: '0' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
              ]}
              mb="md"
            />

            <Text size="sm" fw={500} mb={4}>Type</Text>
            <MultiSelect
              placeholder="Type"
              data={CARD_TYPES}
              value={types}
              onChange={(v) => { setTypes(v); setPage(1); }}
              clearable
              size="sm"
              mb="md"
              maxDropdownHeight={200}
            />

            <Text size="sm" fw={500} mb={4}>Quantity</Text>
            <SegmentedControl
              value={String(quantityFilter ?? 'all')}
              onChange={(v) => { setQuantityFilter(v === 'all' ? null : Number(v)); setPage(1); }}
              data={[
                { value: 'all', label: 'All' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4+' },
              ]}
              size="xs"
              fullWidth
              mb="md"
            />

            <Divider mb="md" />

            <Checkbox
              label="Include extras"
              checked={includeExtras}
              onChange={(e) => { setIncludeExtras(e.currentTarget.checked); setPage(1); }}
              size="sm"
            />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 9 }}>
          <TextInput
            placeholder="Search cards by name..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            mb="md"
          />
          <Group justify="space-between" mb="md">
            <Text c="dimmed" size="sm">{totalCount.toLocaleString()} cards in collection</Text>
            <SegmentedControl
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              data={[
                { value: 'grid', label: <IconGridDots size={16} /> },
                { value: 'list', label: <IconList size={16} /> },
              ]}
              size="xs"
            />
          </Group>

          {!fetching && groupedCards.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="xs">
                <IconUpload size={40} stroke={1.5} color="var(--mantine-color-gray-5)" />
                <Text c="dimmed" size="lg">Your collection is empty</Text>
                <Text c="dimmed" size="sm">Import a CSV to get started</Text>
                <Button size="sm" variant="light" onClick={() => setImportModalOpen(true)}>
                  Import CSV
                </Button>
              </Stack>
            </Center>
          ) : viewMode === 'grid' ? (
            <CardGrid cards={[]} groupedCards={groupedCards} fetching={fetching} />
          ) : (
            <CardList cards={[]} groupedCards={groupedCards} fetching={fetching} sort={sort} onSort={toggleSort} />
          )}

          {totalPages > 1 && (
            <Center mt="xl">
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Center>
          )}
        </Grid.Col>
      </Grid>
    </Container>
  );
}
