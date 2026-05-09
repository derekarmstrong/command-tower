'use client';

import { useEffect, useState } from 'react';
import {
  Container, Paper, Title, Text, Group, Avatar, Stack, Center, Loader, SegmentedControl,
  useMantineColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon, IconDeviceLaptop, IconUser } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setColorScheme } = useMantineColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mantine-color-scheme-value') || 'auto';
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setThemeMode(stored);
      }
    }
  }, []);

  const handleThemeChange = (v: string) => {
    const value = v as 'light' | 'dark' | 'auto';
    setThemeMode(value);
    setColorScheme(value);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <Container size="md" py={80}><Center><Loader size="xl" /></Center></Container>;
  }

  return (
    <Container size="md" py="md">
      <Title order={2} mb="lg">Settings</Title>

      <Paper withBorder p="lg" radius="md" mb="md">
        <Title order={4} mb="md">Profile</Title>
        <Group>
          <Avatar radius="xl" size="lg" color="brand">
            <IconUser size={28} />
          </Avatar>
          <Stack gap={0}>
            <Text fw={500}>{user.email}</Text>
            <Text size="sm" c="dimmed">User ID: {user.id.slice(0, 8)}...</Text>
          </Stack>
        </Group>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={4} mb="md">Appearance</Title>
        <Group justify="space-between" wrap="nowrap">
          <Group>
            {themeMode === 'dark' ? <IconMoon size={20} /> : themeMode === 'light' ? <IconSun size={20} /> : <IconDeviceLaptop size={20} />}
            <div>
              <Text fw={500}>Theme</Text>
              <Text size="sm" c="dimmed">Syncs with system by default</Text>
            </div>
          </Group>
          <SegmentedControl
            value={themeMode}
            onChange={handleThemeChange}
            data={[
              { value: 'light', label: <IconSun size={16} /> },
              { value: 'auto', label: <IconDeviceLaptop size={16} /> },
              { value: 'dark', label: <IconMoon size={16} /> },
            ]}
            size="sm"
          />
        </Group>
      </Paper>
    </Container>
  );
}
