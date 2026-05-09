'use client';

import { Card, Image, Text, Group, Center, SimpleGrid, Skeleton, Anchor } from '@mantine/core';
import { SetSymbolTooltip } from './SetSymbolTooltip';
import type { ScryfallCard } from '@/types/card';
import type { GroupedCard } from '@/lib/groupCards';
import { groupCardsByName } from '@/lib/groupCards';
import { getImageUris } from '@/lib/scryfallImage';
import { useRouter } from 'next/navigation';

interface CardGridProps {
  cards: ScryfallCard[];
  groupedCards?: GroupedCard[];
  fetching: boolean;
  skeletonCount?: number;
}

export function CardGrid({ cards, groupedCards, fetching, skeletonCount = 8 }: CardGridProps) {
  const router = useRouter();

  if (fetching) {
    return (
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} padding="md" radius="md" withBorder>
            <Skeleton height={200} mb="sm" />
            <Skeleton height={16} width="70%" mb="xs" />
            <Skeleton height={14} width="40%" />
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  const grouped = groupedCards ?? groupCardsByName(cards);

  if (grouped.length === 0) {
    return (
      <Center py={80}>
        <Text c="dimmed" size="lg">No cards to display</Text>
      </Center>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
      {grouped.map((card) => {
        const primary = card.printings[0];
        const imageUri =
          getImageUris(primary)?.large ||
          getImageUris(primary)?.normal ||
          null;

        return (
          <Card
            key={card.name}
            padding="md"
            radius="md"
            withBorder
            role="link"
            tabIndex={0}
            aria-label={`View ${card.name} details`}
            style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/cards/${primary.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/cards/${primary.id}`);
              }
            }}
          >
            <Card.Section>
              {imageUri ? (
                <Image
                  src={imageUri}
                  alt={card.name}
                  w="100%"
                  fit="contain"
                  loading="lazy"
                />
              ) : (
                <Center h={200}><Text c="dimmed" size="sm">No image</Text></Center>
              )}
            </Card.Section>
            <Text fw={500} size="sm" lineClamp={1} mt="xs" title={card.name}>{card.name}</Text>
            <Group gap={4} mt={4}>
              {card.printings.map((p) => (
                <Group key={p.id} gap={2} wrap="nowrap">
                  <SetSymbolTooltip printing={p} size={22} />
                  {p.quantity != null && (
                    <Text size="xs" c="dimmed">{p.quantity}</Text>
                  )}
                </Group>
              ))}
            </Group>
            <Group gap="xs" mt={4}>
              {primary.prices?.usd && primary.purchase_uris?.tcgplayer ? (
                <Anchor href={primary.purchase_uris.tcgplayer} target="_blank" rel="noopener noreferrer" size="sm" fw={600} c="green" onClick={(e) => e.stopPropagation()}>
                  ${primary.prices.usd}
                </Anchor>
              ) : primary.prices?.usd ? (
                <Text size="sm" fw={600} c="green">${primary.prices.usd}</Text>
              ) : null}
              {primary.prices?.eur && primary.purchase_uris?.cardmarket ? (
                <Anchor href={primary.purchase_uris.cardmarket} target="_blank" rel="noopener noreferrer" size="sm" onClick={(e) => e.stopPropagation()}>
                  €{primary.prices.eur}
                </Anchor>
              ) : primary.prices?.eur ? (
                <Text size="sm">€{primary.prices.eur}</Text>
              ) : null}
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
