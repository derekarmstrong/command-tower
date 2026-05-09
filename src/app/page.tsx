'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Group, SimpleGrid, Card, ThemeIcon, rem, Loader, Center } from '@mantine/core';
import { IconCards, IconSearch, IconUsers, IconShield } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const features = [
  {
    icon: IconSearch,
    title: 'Browse Cards',
    description: 'Search and explore the complete Magic: The Gathering card database with powerful filtering.',
  },
  {
    icon: IconUsers,
    title: 'Multi-User',
    description: 'Create your account and manage your personal collection alongside other users.',
  },
  {
    icon: IconCards,
    title: 'Full Database',
    description: 'Access all 530,000+ cards from Scryfall, always up to date and searchable.',
  },
  {
    icon: IconShield,
    title: 'Secure',
    description: 'Your collection data is protected with Supabase authentication and row-level security.',
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <Container size="lg" py={80}><Center><Loader size="xl" /></Center></Container>;
  }

  if (user) {
    return <Container size="lg" py={80}><Center><Loader size="xl" /></Center></Container>;
  }

  return (
    <Container size="lg" py={80}>
      <Group justify="center" mb={50}>
        <IconCards size={48} style={{ color: 'var(--mantine-color-brand-6)' }} />
      </Group>
      <Title order={1} size={rem(48)} ta="center" mb="sm">
        Better Binder
      </Title>
      <Text size="xl" c="dimmed" ta="center" mb={40} maw={600} mx="auto">
        Your personal Magic: The Gathering collection manager. Browse, search, and organize your cards with ease.
      </Text>
      <Group justify="center" mb={80}>
        <Button component={Link} href="/register" size="lg" leftSection={<IconCards size={20} />}>
          Get Started
        </Button>
        <Button component={Link} href="/login" size="lg" variant="light">
          Sign In
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {features.map((feature) => (
          <Card key={feature.title} padding="lg" radius="md" withBorder>
            <Group mb="sm">
              <ThemeIcon size="lg" radius="md" variant="light">
                <feature.icon size={20} />
              </ThemeIcon>
              <Title order={3}>{feature.title}</Title>
            </Group>
            <Text c="dimmed">{feature.description}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
