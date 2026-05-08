'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, TextInput, Group, Text, Center,
  Pagination, Loader, SegmentedControl, MultiSelect,
  RangeSlider, UnstyledButton, Divider, Checkbox, Paper, Grid,
} from '@mantine/core';
import { IconSearch, IconGridDots, IconList } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CardGrid } from '@/components/CardGrid';
import { CardList } from '@/components/CardList';
import { SetSymbol } from '@/components/SetSymbol';
import type { ScryfallCard } from '@/types/card';
import type { GroupedCard } from '@/lib/groupCards';
import { groupCardsByName } from '@/lib/groupCards';

type ViewMode = 'grid' | 'list';
type SortColumn = 'name' | 'cmc';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

const CARD_TYPES = [
  'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact',
  'Planeswalker', 'Land', 'Battle', 'Kindred',
];
const GAMES = [
  { value: 'paper', label: 'Paper' },
  { value: 'mtgo', label: 'MTGO' },
  { value: 'arena', label: 'Arena' },
];
const COLOR_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C'];
const DISPLAY_PER_PAGE = 32;
const FETCH_BATCH = 500;

function ManaIcon({ value, size = 16 }: { value: string; size?: number }) {
  const cls = value === 'C' ? 'c' : value.toLowerCase();
  return <i className={`ms ms-cost ms-${cls}`} style={{ fontSize: size, lineHeight: 1, display: 'block' }} />;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
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
  const [games, setGames] = useState<string[]>(['paper']);
  const pageCursors = useRef<Record<number, string>>({});

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

  const toggleSort = useCallback((column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  useEffect(() => {
    if (!user) return;

    setFetching(true);

    const fetchPage = async () => {
      try {
        let query = supabase
          .from('cards')
          .select('id, name, rarity, set, set_name, type_line, mana_cost, cmc, image_uris, colors, prices, purchase_uris', { count: 'exact' })
          .eq('lang', 'en');

        if (search) {
          query = query.ilike('name', `%${search}%`);
        }
        if (rarities.length > 0) {
          query = query.in('rarity', rarities);
        }
        if (types.length > 0) {
          const orTypes = types.map((t) => `type_line.ilike.%${t}%`).join(',');
          query = query.or(orTypes);
        }
        if (sets.length > 0) {
          query = query.in('set', sets);
        }
        if (colors.length > 0) {
          const hasC = colors.includes('C');
          const regular = colors.filter((c) => c !== 'C');
          if (hasC && regular.length === 0) {
            query = query.or('colors.eq.{},colors.eq.{C}');
          } else if (regular.length > 0) {
            query = query.containedBy('colors', regular).overlaps('colors', regular);
          }
        }
        if (cmcRange[0] > 0 || cmcRange[1] < 15) {
          query = query.gte('cmc', cmcRange[0]).lte('cmc', cmcRange[1]);
        }
        if (!includeExtras) {
          query = query.filter('set_type', 'not.in', '(token,funny,memorabilia,vanguard,minigame,archenemy,planechase)');
        }
        if (games.length > 0) {
          query = query.contains('games', games);
        }

        const nameDir = sort.column === 'name' ? sort.direction : 'asc';
        query = query.order('name', { ascending: nameDir === 'asc' });

        const cursor = page > 1 ? pageCursors.current[page - 1] : null;
        if (cursor) {
          query = nameDir === 'asc' ? query.gt('name', cursor) : query.lt('name', cursor);
        }

        const { data, count, error } = await query.limit(FETCH_BATCH);

        if (error) {
          console.error('Error fetching cards:', error);
          setFetching(false);
          return;
        }

        let results = (data || []) as ScryfallCard[];

        const missingMana = results.filter((c) => !c.mana_cost);
        if (missingMana.length > 0) {
          try {
            const res = await fetch('https://api.scryfall.com/cards/collection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifiers: missingMana.map((c) => ({ id: c.id })),
              }),
            });
            const scryfall = await res.json();
            for (const scryfallCard of scryfall.data || []) {
              const card = results.find((c) => c.id === scryfallCard.id);
              if (card && scryfallCard.card_faces?.[0]?.mana_cost) {
                card.mana_cost = scryfallCard.card_faces[0].mana_cost;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch DFC mana costs:', e);
          }
        }

        const grouped = groupCardsByName(results);
        const pageCards = grouped.slice(0, DISPLAY_PER_PAGE);
        setGroupedCards(pageCards);

        if (pageCards.length > 0) {
          pageCursors.current[page] = pageCards[pageCards.length - 1].name;
        }

        setTotalCount(count || 0);
      } catch (err) {
        console.error('Unexpected dashboard fetch error:', err);
      }
      setFetching(false);
    };
    fetchPage();
  }, [user, page, search, rarities, types, sets, colors, cmcRange, sort, includeExtras, games]);

  if (loading || !user) {
    return <Container size="lg" py={80}><Center><Loader size="xl" /></Center></Container>;
  }

  const totalPages = Math.ceil(totalCount / FETCH_BATCH);

  return (
    <Container size="xl" py="md">
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

            <Text size="sm" fw={500} mb={4}>Game</Text>
            <MultiSelect
              placeholder="Game"
              data={GAMES}
              value={games}
              onChange={(v) => { setGames(v); setPage(1); }}
              clearable
              size="sm"
              mb="md"
              maxDropdownHeight={200}
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
            <Text c="dimmed" size="sm">{totalCount.toLocaleString()} cards found</Text>
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

          {viewMode === 'grid' ? (
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
