'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Container, Text, Center, Loader, Group, SegmentedControl,
  TextInput, Title, SimpleGrid, Skeleton, Alert,
} from '@mantine/core';
import { IconSearch, IconGridDots, IconList, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { CardGrid } from '@/components/CardGrid';
import { CardList } from '@/components/CardList';
import { groupCardsByName, type GroupedCard } from '@/lib/groupCards';
import type { SortColumn, SortConfig } from '@/components/CardList';
import type { ScryfallCard } from '@/types/card';

type ViewMode = 'grid' | 'list';

export default function PublicCollectionPage({ params }: { params: { id: string } }) {
  const [collection, setCollection] = useState<{ name: string; user_id: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [groupedCards, setGroupedCards] = useState<GroupedCard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortConfig>({ column: 'name', direction: 'asc' });
  const cardCacheRef = useRef<{ key: string; data: ScryfallCard[] } | null>(null);

  useEffect(() => {
    supabase
      .from('collections')
      .select('name, user_id')
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
    if (!collection) return;

    setCardsLoading(true);

    const fetchCards = async () => {
      const currentKey = params.id;
      if (!cardCacheRef.current || cardCacheRef.current.key !== currentKey) {
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

        const allCardIds = [...new Set(allCcData.map((c: any) => c.card_id))];
        if (allCardIds.length === 0) {
          setCardsLoading(false);
          return;
        }

        const allCardsData: any[] = [];
        const chunkSize = 200;
        const chunks: string[][] = [];
        for (let i = 0; i < allCardIds.length; i += chunkSize) {
          chunks.push(allCardIds.slice(i, i + chunkSize));
        }
        const CONCURRENT = 5;
        for (let i = 0; i < chunks.length; i += CONCURRENT) {
          const batch = chunks.slice(i, i + CONCURRENT).map((chunk) =>
            supabase.from('cards').select('*').in('id', chunk)
          );
          const results = await Promise.all(batch.map((q) => q));
          for (const { data, error } of results) {
            if (error) {
              console.error('Error fetching card chunk:', error);
              setCardsLoading(false);
              return;
            }
            if (data) allCardsData.push(...data);
          }
        }

        const cardMap = new Map(allCardsData.map((c: any) => [c.id, c]));

        const aggMap = new Map<string, { totalQty: number; hasFoil: boolean }>();
        for (const cc of allCcData) {
          if (!cardMap.has(cc.card_id)) continue;
          const existing = aggMap.get(cc.card_id);
          if (existing) {
            existing.totalQty += cc.quantity;
            if (cc.foil !== 'normal') existing.hasFoil = true;
          } else {
            aggMap.set(cc.card_id, { totalQty: cc.quantity, hasFoil: cc.foil !== 'normal' });
          }
        }

        const joined = [...aggMap.entries()].map(([cardId, agg]) => ({
          ...cardMap.get(cardId)!,
          collection_quantity: agg.totalQty,
          collection_foil: agg.hasFoil ? 'foil' : 'normal',
        }));

        cardCacheRef.current = { key: currentKey, data: joined };
      }

      let filtered = cardCacheRef.current.data;
      if (search) {
        filtered = filtered.filter((c: ScryfallCard) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      const grouped = groupCardsByName(filtered);

      if (sort.column === 'cmc') {
        grouped.sort((a, b) =>
          sort.direction === 'asc' ? (a.cmc || 0) - (b.cmc || 0) : (b.cmc || 0) - (a.cmc || 0)
        );
      } else {
        grouped.sort((a, b) =>
          sort.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        );
      }

      setGroupedCards(grouped);
      setCardsLoading(false);
    };

    fetchCards();
  }, [collection, params.id, search, sort]);

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

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="md">{collection?.name || 'Collection'}</Title>

      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search cards..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
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
          <Text c="dimmed" size="lg">No cards found</Text>
        </Center>
      ) : viewMode === 'grid' ? (
        <CardGrid cards={[]} groupedCards={groupedCards} fetching={false} />
      ) : (
        <CardList cards={[]} groupedCards={groupedCards} fetching={false} sort={sort} onSort={toggleSort} />
      )}
    </Container>
  );
}
