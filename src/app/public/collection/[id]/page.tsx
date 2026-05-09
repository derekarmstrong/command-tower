'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Container, Text, Center, Loader, Group, SegmentedControl,
  TextInput, Title, SimpleGrid, Skeleton, Alert, MultiSelect,
  RangeSlider, UnstyledButton, Divider, Checkbox, Paper, Grid,
  Pagination, Stack, Progress,
} from '@mantine/core';
import { IconSearch, IconGridDots, IconList, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { CardGrid } from '@/components/CardGrid';
import { CardList } from '@/components/CardList';
import { SetSymbol } from '@/components/SetSymbol';
import { groupCardsByName, type GroupedCard } from '@/lib/groupCards';
import type { SortColumn, SortConfig } from '@/components/CardList';
import type { ScryfallCard } from '@/types/card';

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

export default function PublicCollectionPage({ params }: { params: { id: string } }) {
  const [collection, setCollection] = useState<{ name: string; user_id: string; display_name: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [groupedCards, setGroupedCards] = useState<GroupedCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [rarities, setRarities] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [sets, setSets] = useState<string[]>([]);
  const [setOptions, setSetOptions] = useState<{ value: string; label: string }[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [cmcRange, setCmcRange] = useState<[number, number]>([0, 15]);
  const [sort, setSort] = useState<SortConfig>({ column: 'name', direction: 'asc' });
  const [includeExtras, setIncludeExtras] = useState(false);
  const [quantityFilter, setQuantityFilter] = useState<number | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const cardCacheRef = useRef<{ key: string; data: ScryfallCard[] } | null>(null);

  const toggleColor = (color: string) => {
    setColors((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]);
    setPage(1);
  };

  useEffect(() => {
    supabase
      .from('collections')
      .select('name, user_id, display_name')
      .eq('id', params.id)
      .eq('is_public', true)
      .limit(1)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCollection(data[0]);
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
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
  }, []);

  const filterCard = useCallback((c: ScryfallCard) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (rarities.length > 0 && !rarities.includes(c.rarity)) return false;
    if (types.length > 0 && !types.every((t) => (c.type_line || '').toLowerCase().includes(t.toLowerCase()))) return false;
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
    if (!collection) return;

    setCardsLoading(true);
    setBackgroundLoading(false);

    const fetchCards = async () => {
      const currentKey = params.id;
      if (cardCacheRef.current && cardCacheRef.current.key === currentKey) {
        const joined = cardCacheRef.current.data;
        let filtered = joined.filter(filterCard);
        const grouped = groupCardsByName(filtered);
        let result = grouped;
        if (quantityFilter != null) {
          result = grouped.filter((g) => {
            const total = g.printings.reduce((sum, p) => sum + (p.quantity || 0), 0);
            return quantityFilter === 4 ? total >= 4 : total === quantityFilter;
          });
        }
        if (sort.column === 'cmc') {
          result.sort((a, b) =>
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
        setCardsLoading(false);
        return;
      }

      const { count: ccCount, error: countErr } = await supabase
        .from('collection_cards')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', params.id);

      const allCcData: any[] = [];
      if (!countErr && ccCount && ccCount > 0) {
        const pageSize = 1000;
        const totalPages = Math.ceil(ccCount / pageSize);
        const pagePromises = [];
        for (let p = 0; p < totalPages; p++) {
          pagePromises.push(
            supabase
              .from('collection_cards')
              .select('card_id, quantity, foil, condition')
              .eq('collection_id', params.id)
              .range(p * pageSize, (p + 1) * pageSize - 1)
          );
        }
        const pageResults = await Promise.all(pagePromises);
        for (const { data, error } of pageResults) {
          if (error) {
            console.error('Error fetching public collection cards:', error);
            setCardsLoading(false);
            return;
          }
          if (data) allCcData.push(...data);
        }
      }

      const allCardIds = [...new Set(allCcData.map((cc: any) => cc.card_id))];
      if (allCardIds.length === 0) {
        setCardsLoading(false);
        return;
      }

      const chunkSize = 200;
      const chunks: string[][] = [];
      for (let i = 0; i < allCardIds.length; i += chunkSize) {
        chunks.push(allCardIds.slice(i, i + chunkSize));
      }

      const allCardsData: any[] = [];
      const CONCURRENT = 10;
      const CARD_COLUMNS = 'id, name, rarity, set, set_name, type_line, mana_cost, cmc, image_uris, colors, prices, purchase_uris, set_type, layout';

      const joinAndRender = (cardData: any[], collectionCards: any[], pageNum: number) => {
        const cardMap = new Map(cardData.map((c: any) => [c.id, c]));
        const aggMap = new Map<string, { totalQty: number; hasFoil: boolean }>();
        for (const cc of collectionCards) {
          if (!cardMap.has(cc.card_id)) continue;
          const existing = aggMap.get(cc.card_id);
          if (existing) {
            existing.totalQty += cc.quantity;
            if (cc.foil !== 'normal') existing.hasFoil = true;
          } else {
            aggMap.set(cc.card_id, { totalQty: cc.quantity, hasFoil: cc.foil !== 'normal' });
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
        let filtered = joined.filter(filterCard);
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
        const groupFrom = (pageNum - 1) * DISPLAY_PER_PAGE;
        return { paged: result.slice(groupFrom, groupFrom + DISPLAY_PER_PAGE), totalCount, joined };
      };

      let initialPageShown = false;
      for (let i = 0; i < chunks.length; i += CONCURRENT) {
        const batch = chunks.slice(i, i + CONCURRENT);
        const batchPromises = batch.map((chunk) =>
          supabase.from('cards').select(CARD_COLUMNS).in('id', chunk)
        );
        const results = await Promise.all(batchPromises.map((q) => q));
        for (const { data, error } of results) {
          if (error) {
            console.error('Error fetching card chunk:', error);
            setCardsLoading(false);
            setBackgroundLoading(false);
            return;
          }
          if (data) allCardsData.push(...data);
        }

        if (!initialPageShown && allCardsData.length >= 100) {
          const { paged, totalCount: tc } = joinAndRender(allCardsData, allCcData, 1);
          if (paged.length > 0) {
            setGroupedCards(paged);
            setTotalCount(tc);
            initialPageShown = true;
            setCardsLoading(false);
            setBackgroundLoading(true);
            setLoadProgress({ loaded: allCardsData.length, total: allCardIds.length });
          }
        } else if (initialPageShown) {
          setLoadProgress({ loaded: allCardsData.length, total: allCardIds.length });
        }
      }

      const { joined } = joinAndRender(allCardsData, allCcData, page);
      cardCacheRef.current = { key: currentKey, data: joined };
      setBackgroundLoading(false);
      setLoadProgress({ loaded: 0, total: 0 });

      const grouped = groupCardsByName(joined.filter(filterCard));
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
    };

    fetchCards();
  }, [collection, params.id, page, search, rarities, types, sets, colors, cmcRange, sort, includeExtras, quantityFilter, filterCard]);

  const toggleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <Container size="lg" py={80}>
        <Center><Loader size="xl" /></Center>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container size="sm" py={80}>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Collection not found">
          This collection either doesn't exist or is not public.
        </Alert>
      </Container>
    );
  }

  const totalPages = Math.ceil(totalCount / DISPLAY_PER_PAGE);

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="md">{collection?.display_name || collection?.name || 'Collection'}</Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 3 }} style={{ paddingLeft: 0 }}>
          <Paper withBorder p="md" pos="sticky" top={16}>
            {backgroundLoading ? (
              <Stack gap="md">
                <Skeleton height={18} width="20%" mb={2} />
                <Skeleton height={36} radius="sm" />
                <Skeleton height={18} width="28%" mb={2} />
                <Skeleton height={36} radius="sm" />
                <Skeleton height={18} width="24%" mb={2} />
                <Group gap={4}>
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} width={30} height={30} radius="50%" />)}
                </Group>
                <Skeleton height={18} width="18%" mb={2} />
                <Skeleton height={36} radius="sm" />
                <Skeleton height={18} width="22%" mb={2} />
                <Skeleton height={36} radius="sm" />
                <Skeleton height={18} width="32%" mb={2} />
                <Skeleton height={36} radius="sm" />
                <Divider />
                <Skeleton height={20} width={100} radius="sm" />
              </Stack>
            ) : (<>
              <Text size="sm" fw={500} mb={4}>Set</Text>
            <MultiSelect
              placeholder="Set"
              data={setOptions}
              value={sets}
              onChange={(v) => { setSets(v); setPage(1); }}
              clearable searchable size="sm" mb="md" maxDropdownHeight={200}
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
              clearable size="sm" mb="md" maxDropdownHeight={200}
            />

            <Text size="sm" fw={500} mb={4}>Color</Text>
            <Group gap={4} mb="md">
              {COLOR_OPTIONS.map((c) => (
                <UnstyledButton
                  key={c}
                  onClick={() => toggleColor(c)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: colors.includes(c) ? '2px solid var(--mantine-color-brand-6)' : '2px solid var(--mantine-color-gray-4)',
                    background: colors.includes(c) ? 'var(--mantine-color-brand-0)' : 'transparent',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', padding: 0, flexShrink: 0,
                  }}
                >
                  <ManaIcon value={c} size={14} />
                </UnstyledButton>
              ))}
            </Group>

            <Text size="sm" fw={500} mb={4}>CMC</Text>
            <RangeSlider
              min={0} max={15} step={1} minRange={0}
              value={cmcRange}
              onChange={(v) => { setCmcRange(v as [number, number]); setPage(1); }}
              marks={[
                { value: 0, label: '0' }, { value: 5, label: '5' },
                { value: 10, label: '10' }, { value: 15, label: '15' },
              ]}
              mb="md"
            />

            <Text size="sm" fw={500} mb={4}>Type</Text>
            <MultiSelect
              placeholder="Type"
              data={CARD_TYPES}
              value={types}
              onChange={(v) => { setTypes(v); setPage(1); }}
              clearable size="sm" mb="md" maxDropdownHeight={200}
            />

            <Text size="sm" fw={500} mb={4}>Quantity</Text>
            <SegmentedControl
              value={String(quantityFilter ?? 'all')}
              onChange={(v) => { setQuantityFilter(v === 'all' ? null : Number(v)); setPage(1); }}
              data={[
                { value: 'all', label: 'All' }, { value: '1', label: '1' },
                { value: '2', label: '2' }, { value: '3', label: '3' },
                { value: '4', label: '4+' },
              ]}
              size="xs" fullWidth mb="md"
            />

            <Divider mb="md" />

            <Checkbox
              label="Include extras"
              checked={includeExtras}
              onChange={(e) => { setIncludeExtras(e.currentTarget.checked); setPage(1); }}
              size="sm"
            />
            </>)}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 9 }}>
          <TextInput
            placeholder="Search cards..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            mb="md"
          />
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <Text c="dimmed" size="sm">{totalCount.toLocaleString()} cards</Text>
              {backgroundLoading && (
                <>
                  <Text c="dimmed" size="sm">•</Text>
                  <Progress value={loadProgress.total > 0 ? (loadProgress.loaded / loadProgress.total) * 100 : 0} size="sm" w={100} />
                  <Text c="dimmed" size="xs">Loading collection</Text>
                </>
              )}
            </Group>
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

          {cardsLoading ? (
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} height={300} radius="md" />
              ))}
            </SimpleGrid>
          ) : groupedCards.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="lg">No cards found</Text>
                <Text c="dimmed" size="sm">Try adjusting your filters</Text>
              </Stack>
            </Center>
          ) : viewMode === 'grid' ? (
            <CardGrid cards={[]} groupedCards={groupedCards} fetching={false} />
          ) : (
            <CardList cards={[]} groupedCards={groupedCards} fetching={false} sort={sort} onSort={toggleSort} />
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
