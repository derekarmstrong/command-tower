'use client';

import { useEffect, useState } from 'react';
import {
  Container, Title, Text, Paper, SimpleGrid, Center, Loader, Stack, Group, Badge,
} from '@mantine/core';
import { IconWorld, IconCards } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface PublicCollection {
  id: string;
  name: string;
  display_name: string | null;
  user_id: string;
  collection_cards: { count: number }[];
}

export default function BrowseCollectionsPage() {
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('collections')
      .select('id, name, display_name, user_id, collection_cards(count)')
      .eq('is_public', true)
      .order('display_name', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!error && data) setCollections(data as PublicCollection[]);
        setLoading(false);
      });
  }, []);

  return (
    <Container size="xl" py="md">
      <Group mb="lg">
        <IconWorld size={32} style={{ color: 'var(--mantine-color-brand-6)' }} />
        <Title order={2}>Browse Collections</Title>
      </Group>

      {loading ? (
        <Center py={80}><Loader size="xl" /></Center>
      ) : collections.length === 0 ? (
        <Center py={80}>
          <Stack align="center" gap="xs">
            <IconWorld size={40} stroke={1.5} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" size="lg">No public collections yet</Text>
            <Text c="dimmed" size="sm">Make your collection public to share it</Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {collections.map((col) => (
            <Paper
              key={col.id}
              withBorder
              radius="md"
              p="lg"
              component={Link}
              href={`/public/collection/${col.id}`}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              <Stack gap="sm">
                <Text fw={600} size="lg" c="brand.6" lineClamp={1}>
                  {col.display_name || col.name}
                </Text>
                <Group gap={6}>
                  <IconCards size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
                  <Text size="sm" c="dimmed">
                    {col.collection_cards?.[0]?.count?.toLocaleString() || 0} cards
                  </Text>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
