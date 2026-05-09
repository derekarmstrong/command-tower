'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container, Title, Text, Group, Badge, Image, Center,
  Loader, Button, Paper, Grid, SimpleGrid, Stack, Anchor, Divider,
  Table, ScrollArea, HoverCard,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { ManaSymbol } from '@/components/ManaSymbol';
import { SetSymbol } from '@/components/SetSymbol';
import type { ScryfallCard, ScryfallCardFace } from '@/types/card';
import { rarityColor } from '@/components/rarityColor';
import { getImageUris } from '@/lib/scryfallImage';

interface FullCardData extends ScryfallCard {
  oracle_id?: string | null;
  oracle_text?: string | null;
  power?: string | null;
  toughness?: string | null;
  flavor_text?: string | null;
  artist?: string | null;
  prices?: Record<string, string | null> | null;
  legalities?: Record<string, string> | null;
  set_type?: string | null;
  collector_number?: string | null;
  released_at?: string | null;
  scryfall_uri?: string | null;
  all_parts?: { id: string; name: string; component: string; type_line: string }[] | null;
  keywords?: string[] | null;
  finishes?: string[] | null;
  reserved?: boolean;
  promo?: boolean;
  reprint?: boolean;
  variation?: boolean;
  digital?: boolean;
  foil?: boolean;
  nonfoil?: boolean;
  full_art?: boolean;
  textless?: boolean;
  oversized?: boolean;
  border_color?: string | null;
  frame?: string | null;
  lang?: string | null;
}

type FetchStatus = 'loading' | 'found' | 'not_found' | 'error';

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<FullCardData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [versions, setVersions] = useState<any[]>([]);
  const [totalVersions, setTotalVersions] = useState(0);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const loadVersionsPage = useCallback(async (oracleId: string, offset: number) => {
    setVersionsLoading(true);
    const { data, count } = await supabase
      .from('cards')
      .select('id, set, set_name, rarity, prices, purchase_uris, image_uris, released_at, collector_number', { count: 'exact' })
      .eq('oracle_id', oracleId)
      .order('released_at', { ascending: false })
      .range(offset, offset + 9);
    setVersionsLoading(false);
    return { data: data || [], count: count || 0 };
  }, []);

  useEffect(() => {
    if (!id) return;

    async function fetchCard() {
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setStatus('not_found');
          return;
        }

        setCard(data as FullCardData);
        setStatus('found');

        const versionsPromise = data.oracle_id
          ? loadVersionsPage(data.oracle_id, 0).then(({ data: v, count: c }) => {
              setVersions(v);
              setTotalVersions(c);
            })
          : Promise.resolve();

        const scryfallPromise = fetch(`https://api.scryfall.com/cards/${id}`)
          .then((res) => res.ok ? res.json() : null)
          .then((scryfall) => {
            if (scryfall) setCard((prev) => (prev ? { ...prev, ...scryfall } : prev));
          })
          .catch(() => {});

        await Promise.all([versionsPromise, scryfallPromise]);
      } catch {
        setStatus('error');
      }
    }

    fetchCard();
  }, [id, loadVersionsPage]);

  const handleLoadMore = useCallback(async () => {
    if (!card?.oracle_id) return;
    const { data } = await loadVersionsPage(card.oracle_id, versions.length);
    setVersions((prev) => [...prev, ...data]);
  }, [card?.oracle_id, versions.length, loadVersionsPage]);

  if (status === 'loading') {
    return (
      <Container size="lg" py={80}>
        <Center><Loader size="xl" /></Center>
      </Container>
    );
  }

  if (status === 'not_found' || !card) {
    return (
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" gap="md">
            <Title order={3}>Card not found</Title>
            <Button onClick={() => router.back()} variant="light">Go back</Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" gap="md">
            <Title order={3}>Something went wrong</Title>
            <Button onClick={() => router.back()} variant="light">Go back</Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  const hasFaces = card.card_faces && card.card_faces.length > 1;
  const faces = card.card_faces ?? [];

  const imageUris = getImageUris(card);
  const mainImage = imageUris?.normal || imageUris?.large || null;

  return (
    <Container size="lg" py="md">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.back()}
        mb="md"
        size="sm"
      >
        Back
      </Button>

      <Paper withBorder p="lg">
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, sm: 5, md: 4 }}>
            <Stack gap="md">
              {hasFaces ? (
                faces.map((face, i) => {
                  const faceImg = face.image_uris?.normal || face.image_uris?.large || null;
                  return (
                    <div key={i}>
                      <Image
                        src={faceImg}
                        alt={face.name}
                        width={300}
                        height={418}
                        fit="contain"
                        loading="lazy"
                        style={{ borderRadius: 8 }}
                      />
                      <Text size="xs" c="dimmed" ta="center" mt={4}>
                        {i === 0 ? 'Front face' : 'Back face'}
                      </Text>
                    </div>
                  );
                })
              ) : mainImage ? (
                <Image
                  src={mainImage}
                  alt={card.name}
                  width={300}
                  height={418}
                  fit="contain"
                  loading="lazy"
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <Center h={300} style={{ borderRadius: 8, background: 'var(--mantine-color-default-hover)' }}>
                  <Text c="dimmed" size="sm">No image available</Text>
                </Center>
              )}

              {card.prices && (
                <Paper withBorder p="sm">
                  <Text fw={600} size="sm" mb={4}>Prices</Text>
                  <SimpleGrid cols={2} spacing="xs">
                    {card.prices.usd && (
                      <Text size="xs"><Text span fw={500}>USD:</Text> ${card.prices.usd}</Text>
                    )}
                    {card.prices.usd_foil && (
                      <Text size="xs"><Text span fw={500}>Foil:</Text> ${card.prices.usd_foil}</Text>
                    )}
                    {card.prices.eur && (
                      <Text size="xs"><Text span fw={500}>EUR:</Text> €{card.prices.eur}</Text>
                    )}
                  </SimpleGrid>
                </Paper>
              )}
              {(card.purchase_uris?.tcgplayer || card.purchase_uris?.cardmarket) && (
                <Paper withBorder p="sm">
                  <Text fw={600} size="sm" mb={4}>Buy</Text>
                  <Group gap="xs">
                    {card.purchase_uris?.tcgplayer && (
                      <Anchor href={card.purchase_uris.tcgplayer} target="_blank" rel="noopener noreferrer" size="sm">
                        TCGPlayer ↗
                      </Anchor>
                    )}
                    {card.purchase_uris?.cardmarket && (
                      <Anchor href={card.purchase_uris.cardmarket} target="_blank" rel="noopener noreferrer" size="sm">
                        CardMarket ↗
                      </Anchor>
                    )}
                  </Group>
                </Paper>
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 7, md: 8 }}>
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                  <Title order={2}>{card.name}</Title>
                  {card.type_line && (
                    <Text c="dimmed" size="sm">{card.type_line}</Text>
                  )}
                </div>
                {card.mana_cost && <ManaSymbol cost={card.mana_cost} size={20} />}
              </Group>

              <Group gap="xs">
                <SetSymbol setCode={card.set} size={20} />
                <Text size="sm">{card.set_name}</Text>
                <Badge size="sm" variant="light" color={rarityColor(card.rarity)}>
                  {card.rarity}
                </Badge>
                {card.collector_number && (
                  <Text size="xs" c="dimmed">#{card.collector_number}</Text>
                )}
              </Group>

              <Divider />

              {hasFaces ? (
                faces.map((face, i) => (
                  <Paper key={i} withBorder p="sm" bg="var(--mantine-color-default-hover)">
                    <Group gap="xs" mb={4}>
                      <Text fw={600} size="sm">{face.name}</Text>
                      {face.mana_cost && <ManaSymbol cost={face.mana_cost} size={14} />}
                    </Group>
                    {face.type_line && (
                      <Text size="xs" c="dimmed" mb={4}>{face.type_line}</Text>
                    )}
                    {face.oracle_text && (
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{face.oracle_text}</Text>
                    )}
                    {(face.power != null || face.toughness != null) && (
                      <Text size="sm" fw={500} mt={4}>{face.power}/{face.toughness}</Text>
                    )}
                    {face.flavor_text && (
                      <Text size="sm" c="dimmed" fs="italic" mt={4}>{face.flavor_text}</Text>
                    )}
                  </Paper>
                ))
              ) : (
                <>
                  {card.oracle_text && (
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{card.oracle_text}</Text>
                  )}
                  {card.flavor_text && (
                    <Text size="sm" c="dimmed" fs="italic">{card.flavor_text}</Text>
                  )}
                  {(card.power != null || card.toughness != null) && (
                    <Text size="sm" fw={500}>{card.power}/{card.toughness}</Text>
                  )}
                </>
              )}

              <Divider />

              <Group gap="xs">
                {card.artist && <Text size="sm">Illustrated by {card.artist}</Text>}
                {card.released_at && (
                  <Text size="sm" c="dimmed">• {card.released_at}</Text>
                )}
              </Group>

              {card.legalities && (
                <>
                  <Divider />
                  <Text fw={600} size="sm">Legalities</Text>
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                    {Object.entries(card.legalities).map(([format, status]) => (
                      <Group key={format} gap={4}>
                        <Text size="xs" tt="capitalize">{format}:</Text>
                        <Badge
                          size="xs"
                          variant="dot"
                          color={
                            status === 'legal' ? 'green'
                            : status === 'not_legal' ? 'red'
                            : 'yellow'
                          }
                        >
                          {status.replace('_', ' ')}
                        </Badge>
                      </Group>
                    ))}
                  </SimpleGrid>
                </>
              )}

              {card.keywords && card.keywords.length > 0 && (
                <>
                  <Divider />
                  <Text fw={600} size="sm">Keywords</Text>
                  <Group gap={4}>
                    {card.keywords.map((kw) => (
                      <Badge key={kw} size="sm" variant="light">{kw}</Badge>
                    ))}
                  </Group>
                </>
              )}

              {card.scryfall_uri && (
                <Group mt="sm">
                  <Anchor href={card.scryfall_uri} target="_blank" rel="noopener noreferrer" size="sm">
                    View on Scryfall ↗
                  </Anchor>
                </Group>
              )}

              {versions.length > 1 && (
                <>
                  <Divider />
                  <Text fw={600} size="sm" mb={4}>All Versions ({versions.length} of {totalVersions})</Text>
                  <ScrollArea.Autosize mah={400} type="hover">
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--mantine-color-body)' }}>
                        <Table.Tr>
                          <Table.Th>Set</Table.Th>
                          <Table.Th>Rarity</Table.Th>
                          <Table.Th>TCG</Table.Th>
                          <Table.Th>CM</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {versions.map((v) => (
                          <Table.Tr
                            key={v.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/cards/${v.id}`)}
                          >
                            <Table.Td>
                              <HoverCard width={180} shadow="md" openDelay={300} closeDelay={100}>
                                <HoverCard.Target>
                                  <Group gap={6} wrap="nowrap">
                                    <SetSymbol setCode={v.set} size={20} />
                                    <Text size="sm">{v.set_name}</Text>
                                    <Text size="xs" c="dimmed">#{v.collector_number}</Text>
                                  </Group>
                                </HoverCard.Target>
                                <HoverCard.Dropdown p={0} style={{ border: 'none', borderRadius: 4, overflow: 'hidden' }}>
                                  <Image
                                    src={getImageUris({ id: v.id, image_uris: v.image_uris })?.normal || ''}
                                    alt={v.set_name}
                                    w={180}
                                    fit="contain"
                                    loading="lazy"
                                  />
                                </HoverCard.Dropdown>
                              </HoverCard>
                            </Table.Td>
                            <Table.Td>
                              <Badge size="sm" variant="light" color={rarityColor(v.rarity)}>
                                {v.rarity}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {v.prices?.usd && v.purchase_uris?.tcgplayer ? (
                                <Anchor href={v.purchase_uris.tcgplayer} target="_blank" rel="noopener noreferrer" size="sm" fw={600} c="green" onClick={(e) => e.stopPropagation()}>
                                  ${v.prices.usd}
                                </Anchor>
                              ) : v.prices?.usd ? (
                                <Text size="sm" fw={600} c="green">${v.prices.usd}</Text>
                              ) : (
                                <Text c="dimmed" size="sm">—</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {v.prices?.eur && v.purchase_uris?.cardmarket ? (
                                <Anchor href={v.purchase_uris.cardmarket} target="_blank" rel="noopener noreferrer" size="sm" onClick={(e) => e.stopPropagation()}>
                                  €{v.prices.eur}
                                </Anchor>
                              ) : v.prices?.eur ? (
                                <Text size="sm">€{v.prices.eur}</Text>
                              ) : (
                                <Text c="dimmed" size="sm">—</Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                  {versions.length < totalVersions && (
                    <Group justify="center" mt="sm">
                      <Button
                        variant="light"
                        size="xs"
                        onClick={handleLoadMore}
                        loading={versionsLoading}
                      >
                        View More
                      </Button>
                    </Group>
                  )}
                </>
              )}

              {card.all_parts && card.all_parts.length > 0 && (
                <>
                  <Divider />
                  <Text fw={600} size="sm" mb={4}>Related Cards</Text>
                  <ScrollArea.Autosize mah={400} type="hover">
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--mantine-color-body)' }}>
                        <Table.Tr>
                          <Table.Th>Card</Table.Th>
                          <Table.Th>Relationship</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {card.all_parts
                          .filter((part) => part.id !== id && part.name !== card?.name)
                          .map((part) => (
                          <Table.Tr
                            key={part.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/cards/${part.id}`)}
                          >
                            <Table.Td>
                              <HoverCard width={180} shadow="md" openDelay={300} closeDelay={100}>
                                <HoverCard.Target>
                                  <Text size="sm" fw={500}>{part.name}</Text>
                                </HoverCard.Target>
                                <HoverCard.Dropdown p={0} style={{ border: 'none', borderRadius: 4, overflow: 'hidden' }}>
                                  <Image
                                    src={getImageUris({ id: part.id, image_uris: null })?.normal || ''}
                                    alt={part.name}
                                    w={180}
                                    fit="contain"
                                    loading="lazy"
                                  />
                                </HoverCard.Dropdown>
                              </HoverCard>
                              {part.type_line && (
                                <Text size="xs" c="dimmed">{part.type_line}</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge size="sm" variant="light" color="gray">
                                {part.component.replace(/_/g, ' ')}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                </>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  );
}
