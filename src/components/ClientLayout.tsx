'use client';

import { useEffect, useState } from 'react';
import { AppShell, Group, Text, Button, ActionIcon, useMantineColorScheme, Burger, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCards, IconSun, IconMoon, IconLogin, IconUserPlus, IconDashboard, IconSettings, IconLogout, IconArchive, IconBulb } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Notifications } from '@mantine/notifications';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, { toggle }] = useDisclosure();
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => { setHydrated(true); }, []);

  const handleToggleTheme = () => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(next);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      <Notifications />
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <IconCards size={28} style={{ color: 'var(--mantine-color-violet-6)' }} />
              <Text component={Link} href={user ? '/dashboard' : '/'} size="xl" fw={700} c="violet.6" style={{ textDecoration: 'none' }}>
                Better Binder
              </Text>
            </Group>
            <Group visibleFrom="sm" gap="xs">
              {hydrated && !loading && user ? (
                <>
                  <Button component={Link} href="/dashboard" variant="subtle" leftSection={<IconDashboard size={16} />}>All Cards</Button>
                  <Button component={Link} href="/collection" variant="subtle" leftSection={<IconArchive size={16} />}>Collection</Button>
                  <Button component={Link} href="/recommendations" variant="subtle" leftSection={<IconBulb size={16} />}>Recommendations</Button>
                  <Button component={Link} href="/settings" variant="subtle" leftSection={<IconSettings size={16} />}>Settings</Button>
                  <Button variant="subtle" color="gray" onClick={handleSignOut} leftSection={<IconLogout size={16} />}>Sign Out</Button>
                </>
              ) : hydrated && !loading && !user ? (
                <>
                  <Button component={Link} href="/login" variant="subtle" leftSection={<IconLogin size={16} />}>Sign In</Button>
                  <Button component={Link} href="/register" variant="light" leftSection={<IconUserPlus size={16} />}>Register</Button>
                </>
              ) : null}
              {hydrated && (
                <ActionIcon variant="subtle" size="lg" onClick={handleToggleTheme}>
                  {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              )}
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar py="md" px="sm">
          <Stack gap="xs">
            {hydrated && !loading && user ? (
              <>
                  <Button component={Link} href="/dashboard" variant="subtle" justify="flex-start" leftSection={<IconDashboard size={16} />} onClick={toggle}>All Cards</Button>
                <Button component={Link} href="/collection" variant="subtle" justify="flex-start" leftSection={<IconArchive size={16} />} onClick={toggle}>Collection</Button>
                <Button component={Link} href="/recommendations" variant="subtle" justify="flex-start" leftSection={<IconBulb size={16} />} onClick={toggle}>Recommendations</Button>
                <Button component={Link} href="/settings" variant="subtle" justify="flex-start" leftSection={<IconSettings size={16} />} onClick={toggle}>Settings</Button>
                <Button variant="subtle" color="gray" justify="flex-start" leftSection={<IconLogout size={16} />} onClick={() => { toggle(); handleSignOut(); }}>Sign Out</Button>
              </>
            ) : hydrated && !loading && !user ? (
              <>
                <Button component={Link} href="/login" variant="subtle" justify="flex-start" leftSection={<IconLogin size={16} />} onClick={toggle}>Sign In</Button>
                <Button component={Link} href="/register" variant="subtle" justify="flex-start" leftSection={<IconUserPlus size={16} />} onClick={toggle}>Register</Button>
              </>
            ) : null}
            {hydrated && (
              <Button variant="subtle" justify="flex-start" leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />} onClick={() => { toggle(); handleToggleTheme(); }}>
                {colorScheme === 'dark' ? 'Light' : 'Dark'} Mode
              </Button>
            )}
          </Stack>
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
