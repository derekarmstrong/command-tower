'use client';

import { Table, Text, Group, Skeleton, UnstyledButton, Anchor, HoverCard, Image, ScrollArea, Center } from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { ManaSymbol } from './ManaSymbol';
import { SetSymbolTooltip } from './SetSymbolTooltip';
import type { ScryfallCard } from '@/types/card';
import type { GroupedCard } from '@/lib/groupCards';
import { getImageUris } from '@/lib/scryfallImage';
import { groupCardsByName } from '@/lib/groupCards';
import { useRouter } from 'next/navigation';

export type SortColumn = 'name' | 'cmc';
export type SortDirection = 'asc' | 'desc';
export interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

interface CardListProps {
  cards: ScryfallCard[];
  groupedCards?: GroupedCard[];
  fetching: boolean;
  skeletonCount?: number;
  sort: SortConfig;
  onSort: (column: SortColumn) => void;
}

interface ColumnDef {
  col: SortColumn | null;
  label: string;
  sortable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { col: 'name', label: 'Name', sortable: true },
  { col: 'cmc', label: 'CMC', sortable: true },
  { col: null, label: 'Sets', sortable: false },
  { col: null, label: 'TCG', sortable: false },
  { col: null, label: 'CM', sortable: false },
];

function SortIcon({ column, sort }: { column: SortColumn; sort: SortConfig }) {
  if (sort.column !== column) return null;
  return sort.direction === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
}

function ThHeader({ col, label, sortable, sort, onSort }: ColumnDef & { sort: SortConfig; onSort: (c: SortColumn) => void }) {
  const isActive = sortable && col && sort.column === col;

  return (
    <Table.Th
      aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {sortable && col ? (
        <UnstyledButton
          onClick={() => onSort(col)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: isActive ? 700 : 500,
            color: 'inherit',
            padding: 0,
          }}
        >
          {label}
          <SortIcon column={col} sort={sort} />
        </UnstyledButton>
      ) : (
        label
      )}
    </Table.Th>
  );
}

export function CardList({ cards, groupedCards, fetching, skeletonCount = 8, sort, onSort }: CardListProps) {
  const router = useRouter();

  if (fetching) {
    return (
      <ScrollArea.Autosize type="hover">
        <Table aria-label="Card list loading">
          <Table.Thead>
            <Table.Tr>
              {COLUMNS.map((c) => (
                <Table.Th key={c.label}>{c.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Table.Tr key={i}>
                <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                <Table.Td><Skeleton height={20} width={80} /></Table.Td>
                <Table.Td><Skeleton height={20} width={100} /></Table.Td>
                <Table.Td><Skeleton height={20} width={60} /></Table.Td>
                <Table.Td><Skeleton height={20} width={40} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
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

  const rows = grouped.map((card) => {
    const primary = card.printings[0];
    const imageUri =
      getImageUris(primary)?.normal ||
      getImageUris(primary)?.large ||
      null;
    return (
    <Table.Tr
      key={card.name}
      tabIndex={0}
      role="link"
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
      <Table.Td>
        <HoverCard width={180} shadow="md" openDelay={300} closeDelay={100}>
          <HoverCard.Target>
            <Text fw={500} size="sm">{card.name}</Text>
          </HoverCard.Target>
          {imageUri && (
            <HoverCard.Dropdown p={0} style={{ border: 'none', borderRadius: 4, overflow: 'hidden' }}>
              <Image src={imageUri} alt={card.name} w={180} fit="contain" loading="lazy" />
            </HoverCard.Dropdown>
          )}
        </HoverCard>
      </Table.Td>
      <Table.Td>
        {card.mana_cost ? <ManaSymbol cost={card.mana_cost} size={14} /> : <Text c="dimmed" size="sm">—</Text>}
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          {card.printings.map((p) => (
            <Group key={p.id} gap={2} wrap="nowrap">
              <SetSymbolTooltip printing={p} size={20} />
              {p.quantity != null && (
                <Text size="xs" c="dimmed">{p.quantity}</Text>
              )}
            </Group>
          ))}
        </Group>
      </Table.Td>
      <Table.Td>
        {primary.prices?.usd && primary.purchase_uris?.tcgplayer ? (
          <Anchor href={primary.purchase_uris.tcgplayer} target="_blank" rel="noopener noreferrer" size="sm" fw={600} c="green" onClick={(e) => e.stopPropagation()}>
            ${primary.prices.usd}
          </Anchor>
        ) : primary.prices?.usd ? (
          <Text size="sm" fw={600} c="green">${primary.prices.usd}</Text>
        ) : (
          <Text c="dimmed" size="sm">—</Text>
        )}
      </Table.Td>
      <Table.Td>
        {primary.prices?.eur && primary.purchase_uris?.cardmarket ? (
          <Anchor href={primary.purchase_uris.cardmarket} target="_blank" rel="noopener noreferrer" size="sm" onClick={(e) => e.stopPropagation()}>
            €{primary.prices.eur}
          </Anchor>
        ) : primary.prices?.eur ? (
          <Text size="sm">€{primary.prices.eur}</Text>
        ) : (
          <Text c="dimmed" size="sm">—</Text>
        )}
      </Table.Td>
    </Table.Tr>
    );
  });

  return (
    <ScrollArea.Autosize type="hover">
      <Table striped highlightOnHover aria-label="Card list">
        <Table.Thead>
          <Table.Tr>
            {COLUMNS.map((col) => (
              <ThHeader key={col.label} {...col} sort={sort} onSort={onSort} />
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}
