'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Title, Text, Group, Stack, Paper, TextInput,
  Button, Table, Badge, Alert, Grid, HoverCard, Image,
  ScrollArea, Box, Loader, Combobox, useCombobox,
} from '@mantine/core';
import {
  IconSearch, IconAlertCircle, IconBulb, IconChevronDown, IconChevronRight,
} from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { normalizeCardName } from '@/lib/normalizeCardName';
import { ManaSymbol } from '@/components/ManaSymbol';
import { SetSymbol } from '@/components/SetSymbol';

interface SetInfo {
  set_code: string;
  set_name: string;
  quantity: number;
  scryfall_id: string;
}

interface MatchedCard {
  name: string;
  scryfall_id: string;
  sets: SetInfo[];
  totalOwned: number;
  synergy: number;
  inclusion: number;
  num_decks: number;
  mana_cost: string | null;
  type_line: string | null;
}

interface CategoryResult {
  header: string;
  tag: string;
  totalCards: number;
  matchedCards: MatchedCard[];
  missingCards: MissingCard[];
}

interface MissingCard {
  name: string;
  scryfall_id: string;
  synergy: number;
  num_decks: number;
}

interface RecommendationsResult {
  categories: CategoryResult[];
}

function HoverableSetBadge({ set_code, set_name, scryfall_id }: { set_code: string; set_name: string; scryfall_id: string }) {
  const imageUrl = scryfall_id
    ? `https://cards.scryfall.io/normal/front/${scryfall_id.slice(0, 1)}/${scryfall_id.slice(1, 2)}/${scryfall_id}.jpg`
    : null;

  return (
    <HoverCard width={263} shadow="md" openDelay={200} closeDelay={0}>
      <HoverCard.Target>
        <span style={{ cursor: 'pointer' }}>
          <SetSymbol setCode={set_code} size={18} />
        </span>
      </HoverCard.Target>
      <HoverCard.Dropdown p="xs">
        <Text size="xs" c="dimmed" mb={4}>{set_name}</Text>
        {imageUrl ? (
          <Image src={imageUrl} alt={set_code} radius="md" w={223} h={312} fit="contain" />
        ) : (
          <Text size="sm" c="dimmed" ta="center" p="md">No image available</Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function CardNameCell({ name, scryfallId }: { name: string; scryfallId: string }) {
  const imageUrl = scryfallId
    ? `https://cards.scryfall.io/normal/front/${scryfallId.slice(0, 1)}/${scryfallId.slice(1, 2)}/${scryfallId}.jpg`
    : null;

  return (
    <HoverCard width={263} shadow="md" openDelay={200} closeDelay={0}>
      <HoverCard.Target>
        <Text fw={500} style={{ cursor: 'pointer' }}>{name}</Text>
      </HoverCard.Target>
      <HoverCard.Dropdown p="xs">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} radius="md" w={223} h={312} fit="contain" />
        ) : (
          <Text size="sm" c="dimmed" ta="center" p="md">No image available</Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (q[qi] === t[ti]) qi++;
  }
  return qi === q.length;
}

function filterCategories(categories: CategoryResult[], query: string): CategoryResult[] {
  if (!query.trim()) return categories;
  return categories
    .map((cat) => ({
      ...cat,
      matchedCards: cat.matchedCards.filter((c) => fuzzyMatch(query, c.name)),
      missingCards: cat.missingCards.filter((c) => fuzzyMatch(query, c.name)),
    }))
    .filter((cat) => cat.matchedCards.length > 0 || cat.missingCards.length > 0);
}

function CategorySection({ category, filterQuery }: { category: CategoryResult; filterQuery: string }) {
  const [expanded, setExpanded] = useState(false);
  const [ownedSortBy, setOwnedSortBy] = useState('name');
  const [ownedSortDir, setOwnedSortDir] = useState<'asc' | 'desc'>('asc');
  const [missingSortBy, setMissingSortBy] = useState('name');
  const [missingSortDir, setMissingSortDir] = useState<'asc' | 'desc'>('asc');

  const isFiltered = filterQuery.trim().length > 0;

  useEffect(() => {
    if (isFiltered) setExpanded(true);
  }, [isFiltered]);

  const handleOwnedSort = (column: string) => {
    if (ownedSortBy === column) {
      setOwnedSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOwnedSortBy(column);
      setOwnedSortDir('asc');
    }
  };

  const handleMissingSort = (column: string) => {
    if (missingSortBy === column) {
      setMissingSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setMissingSortBy(column);
      setMissingSortDir('asc');
    }
  };

  const sortedOwned = [...category.matchedCards].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    if (ownedSortBy === 'name') { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
    else if (ownedSortBy === 'synergy') { aVal = a.synergy; bVal = b.synergy; }
    else if (ownedSortBy === 'owned') { aVal = a.totalOwned; bVal = b.totalOwned; }
    if (aVal < bVal) return ownedSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return ownedSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedMissing = [...category.missingCards].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    if (missingSortBy === 'name') { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
    else if (missingSortBy === 'synergy') { aVal = a.synergy; bVal = b.synergy; }
    if (aVal < bVal) return missingSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return missingSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const OwnedSortableTh = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleOwnedSort(column)}>
      <Group gap={4} wrap="nowrap">
        {children}
        {ownedSortBy === column && (
          <Text size="xs" c="dimmed" fw={400}>{ownedSortDir === 'asc' ? '↑' : '↓'}</Text>
        )}
      </Group>
    </Table.Th>
  );

  const MissingSortableTh = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMissingSort(column)}>
      <Group gap={4} wrap="nowrap">
        {children}
        {missingSortBy === column && (
          <Text size="xs" c="dimmed" fw={400}>{missingSortDir === 'asc' ? '↑' : '↓'}</Text>
        )}
      </Group>
    </Table.Th>
  );

  return (
    <Paper withBorder radius="md" key={category.tag}>
      <Box p="md">
        <Group justify="space-between" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <Group gap="xs">
            {expanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
            <Title order={4}>{category.header}</Title>
          </Group>
          <Group gap="xs">
            <Badge size="lg" color="green">{category.matchedCards.length} owned</Badge>
            <Badge size="lg" color="gray">{category.missingCards.length} missing</Badge>
            <Badge size="lg" color="violet">{category.totalCards} total</Badge>
          </Group>
        </Group>
      </Box>
      {expanded && (
        <Box p="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper withBorder radius="md">
                <Box p="md">
                  <Group justify="space-between">
                    <Title order={5}>Owned</Title>
                    <Badge color="green">{category.matchedCards.length}</Badge>
                  </Group>
                </Box>
                <ScrollArea.Autosize mah={500} type="hover">
                  <Table striped highlightOnHover>
                    <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--mantine-color-body)' }}>
                      <Table.Tr>
                        <OwnedSortableTh column="name">Card Name</OwnedSortableTh>
                        <OwnedSortableTh column="synergy">Synergy</OwnedSortableTh>
                        <Table.Th>Mana</Table.Th>
                        <OwnedSortableTh column="owned">Owned</OwnedSortableTh>
                        <Table.Th>Sets</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedOwned.map((card, i) => (
                        <Table.Tr key={i}>
                          <Table.Td><CardNameCell name={card.name} scryfallId={card.scryfall_id} /></Table.Td>
                          <Table.Td>{(card.synergy * 100).toFixed(1)}%</Table.Td>
                          <Table.Td>
                            {card.mana_cost ? <ManaSymbol cost={card.mana_cost} size={14} /> : null}
                          </Table.Td>
                          <Table.Td><Badge variant="light" color="green">{card.totalOwned}</Badge></Table.Td>
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              {card.sets.map((set, j) => (
                                <HoverableSetBadge key={j} set_code={set.set_code} set_name={set.set_name} scryfall_id={set.scryfall_id} />
                              ))}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper withBorder radius="md">
                <Box p="md">
                  <Group justify="space-between">
                    <Title order={5}>Missing</Title>
                    <Badge color="red">{category.missingCards.length}</Badge>
                  </Group>
                </Box>
                <ScrollArea.Autosize mah={500} type="hover">
                  <Table striped highlightOnHover>
                    <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--mantine-color-body)' }}>
                      <Table.Tr>
                        <MissingSortableTh column="name">Card Name</MissingSortableTh>
                        <MissingSortableTh column="synergy">Synergy</MissingSortableTh>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedMissing.map((card, i) => (
                        <Table.Tr key={i}>
                          <Table.Td>
                            <CardNameCell name={card.name} scryfallId={card.scryfall_id} />
                          </Table.Td>
                          <Table.Td>{(card.synergy * 100).toFixed(1)}%</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Paper>
            </Grid.Col>
          </Grid>
        </Box>
      )}
    </Paper>
  );
}

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [commanderName, setCommanderName] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [stats, setStats] = useState<{ totalRecommendations: number; totalOwned: number; totalMissing: number } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); return; }
    try {
      const { data } = await supabase
        .from('cards')
        .select('name')
        .eq('lang', 'en')
        .ilike('type_line', '%Legendary Creature%')
        .ilike('name', `%${query}%`)
        .limit(50);
      const names = [...new Set((data || []).map((c: any) => c.name))].slice(0, 10);
      setSuggestions(names);
    } catch { setSuggestions([]); }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setCommanderName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
      if (value.trim()) combobox.openDropdown();
      else combobox.closeDropdown();
    }, 200);
  }, [fetchSuggestions, combobox]);

  const handleSelect = useCallback((name: string) => {
    setCommanderName(name);
    setSuggestions([]);
    combobox.closeDropdown();
  }, [combobox]);

  const handleFetch = async () => {
    if (!commanderName.trim() || !user) return;
    combobox.closeDropdown();

    setLoading(true);
    setFetchError(null);
    setResult(null);
    setStats(null);

    try {
      const sanitizedName = commanderName
        .toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

      const response = await fetch(`https://json.edhrec.com/pages/commanders/${sanitizedName}.json`);
      if (!response.ok) throw new Error(`Failed to fetch recommendations for "${commanderName}"`);

      const edhData = await response.json();
      const cardlists = edhData?.container?.json_dict?.cardlists;
      if (!cardlists || !Array.isArray(cardlists)) throw new Error('No card recommendations found for this commander');

      const { data: collections } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const collectionId = collections?.[0]?.id;
      if (!collectionId) throw new Error('No collection found. Import some cards first.');

      const { data: ccData } = await supabase
        .from('collection_cards')
        .select('card_id, quantity, foil, condition')
        .eq('collection_id', collectionId);

      if (!ccData || ccData.length === 0) throw new Error('No cards in your collection. Import some cards first.');

      const cardIds = [...new Set(ccData.map((c: any) => c.card_id))];

      const { data: cardsData } = await supabase
        .from('cards')
        .select('id, name, mana_cost, type_line, set, set_name')
        .in('id', cardIds);

      const ownedMap = new Map<string, any[]>();
      const scryfallMap = new Map<string, any>();
      for (const card of cardsData || []) {
        scryfallMap.set(card.id, card);
        const normalized = normalizeCardName(card.name);
        if (!ownedMap.has(normalized)) ownedMap.set(normalized, []);
      }

      for (const cc of ccData) {
        const card = scryfallMap.get(cc.card_id);
        if (card) {
          const normalized = normalizeCardName(card.name);
          ownedMap.get(normalized)!.push({
            card_id: cc.card_id,
            quantity: cc.quantity,
            set_code: card.set,
            set_name: card.set_name,
            scryfall_id: cc.card_id,
          });
        }
      }

      const results: CategoryResult[] = [];
      const allMissingNames: string[] = [];

      for (const category of cardlists) {
        const matchedCards: MatchedCard[] = [];
        const missingCards: MissingCard[] = [];

        for (const recCard of category.cardviews || []) {
          const normalizedName = normalizeCardName(recCard.name);
          const ownedEntries = ownedMap.get(normalizedName);

          if (ownedEntries && ownedEntries.length > 0) {
            let totalOwned = 0;
            const sets: SetInfo[] = [];
            for (const entry of ownedEntries) {
              totalOwned += entry.quantity;
              sets.push({
                set_code: entry.set_code,
                set_name: entry.set_name,
                quantity: entry.quantity,
                scryfall_id: entry.scryfall_id,
              });
            }
            const sc = ownedEntries[0].scryfall_id ? scryfallMap.get(ownedEntries[0].scryfall_id) : null;
            matchedCards.push({
              name: recCard.name,
              scryfall_id: ownedEntries[0].scryfall_id,
              sets,
              totalOwned,
              synergy: recCard.synergy,
              inclusion: recCard.inclusion,
              num_decks: recCard.num_decks,
              mana_cost: sc?.mana_cost || null,
              type_line: sc?.type_line || null,
            });
          } else {
            missingCards.push({
              name: recCard.name,
              scryfall_id: '',
              synergy: recCard.synergy,
              num_decks: recCard.num_decks,
            });
            allMissingNames.push(recCard.name);
          }
        }

        results.push({
          header: category.header,
          tag: category.tag,
          totalCards: category.cardviews?.length || 0,
          matchedCards,
          missingCards,
        });
      }

      const uniqueMissing = [...new Set(allMissingNames)];
      if (uniqueMissing.length > 0) {
        const missingNameMap = new Map<string, string>();
        const chunkSize = 50;
        for (let i = 0; i < uniqueMissing.length; i += chunkSize) {
          const chunk = uniqueMissing.slice(i, i + chunkSize);
          const { data: missingCards } = await supabase
            .from('cards')
            .select('id, name')
            .eq('lang', 'en')
            .in('name', chunk);
          if (missingCards) {
            for (const c of missingCards) {
              const key = normalizeCardName(c.name);
              if (!missingNameMap.has(key)) {
                missingNameMap.set(key, c.id);
              }
            }
          }
        }
        for (const cat of results) {
          for (const mc of cat.missingCards) {
            const key = normalizeCardName(mc.name);
            const id = missingNameMap.get(key);
            if (id) mc.scryfall_id = id;
          }
        }
      }

      setResult({ categories: results });

      let totalRecs = 0, totalOwned = 0, totalMissing = 0;
      for (const cat of results) {
        totalRecs += cat.totalCards;
        totalOwned += cat.matchedCards.length;
        totalMissing += cat.missingCards.length;
      }
      setStats({ totalRecommendations: totalRecs, totalOwned, totalMissing });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Title order={1}>EDHRec Recommendations</Title>
          <IconBulb size={40} />
        </Group>

        <Paper withBorder p="xl" radius="md">
          <Title order={3} mb="md">Search Commander</Title>
          <Text size="sm" c="dimmed" mb="md">
            Enter a commander name to fetch personalized card recommendations from EDHRec and see which ones you own.
          </Text>

          <Group gap="sm" align="flex-end">
            <div style={{ flex: 1 }}>
              <Combobox store={combobox} withinPortal={false} size="md" onOptionSubmit={handleSelect}>
                <Combobox.Target>
                  <TextInput
                    placeholder="e.g. Ms. Bumbleflower"
                    value={commanderName}
                    onChange={(e) => handleSearchChange(e.currentTarget.value)}
                    leftSection={<IconSearch size={16} />}
                    style={{ width: '100%' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  />
                </Combobox.Target>
                <Combobox.Dropdown>
                  <Combobox.Options mah={250} style={{ overflowY: 'auto' }}>
                    {suggestions.length === 0 && commanderName.trim() && (
                      <Combobox.Option value="_no_results" disabled>
                        <Text size="sm" c="dimmed">No suggestions</Text>
                      </Combobox.Option>
                    )}
                    {suggestions.map((name) => (
                      <Combobox.Option key={name} value={name}>{name}</Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            </div>
            <Button onClick={handleFetch} disabled={!commanderName.trim() || loading || !user} loading={loading} miw={180}>
              Fetch Recommendations
            </Button>
          </Group>
        </Paper>

        {fetchError && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">{fetchError}</Alert>
        )}

        {stats && (
          <Grid>
            <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Total Recommendations</Text>
                <Title order={2}>{stats.totalRecommendations}</Title>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Owned</Text>
                <Title order={2} c="green">{stats.totalOwned}</Title>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Missing</Text>
                <Title order={2} c="red">{stats.totalMissing}</Title>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {result && (
          <>
            <TextInput
              placeholder="Filter cards by name..."
              value={cardSearch}
              onChange={(e) => setCardSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              size="md"
            />
            <Stack gap="md">
              {filterCategories(result.categories, cardSearch).map((cat) => (
                <CategorySection key={cat.tag} category={cat} filterQuery={cardSearch} />
              ))}
            </Stack>
            {filterCategories(result.categories, cardSearch).length === 0 && (
              <Paper withBorder p="xl" radius="md">
                <Text ta="center" c="dimmed">No cards match &ldquo;{cardSearch}&rdquo;</Text>
              </Paper>
            )}
          </>
        )}

        {loading && (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center">
              <Loader size="lg" />
              <Text>Fetching and matching recommendations...</Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
