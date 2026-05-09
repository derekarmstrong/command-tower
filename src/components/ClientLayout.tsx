'use client';

import { useEffect, useState } from 'react';
import { AppShell, Group, Text, Button, ActionIcon, useMantineColorScheme, Burger, Stack, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCards, IconSun, IconMoon, IconLogin, IconUserPlus, IconDashboard, IconSettings, IconLogout, IconArchive, IconBulb, IconWorld } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Notifications } from '@mantine/notifications';

function NavButton({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Button
      component={Link}
      href={href}
      variant={isActive ? 'light' : 'subtle'}
      leftSection={icon}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

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
      <UnstyledButton
        component="a"
        href="#main-content"
        style={{
          position: 'absolute',
          left: -9999,
          zIndex: 1000,
          padding: '8px 16px',
          background: 'var(--mantine-color-brand-6)',
          color: '#fff',
          fontWeight: 700,
          borderRadius: '0 0 8px 8px',
        }}
        styles={{
          root: {
            '&:focus': { left: 16, top: 8 },
          },
        }}
      >
        Skip to main content
      </UnstyledButton>
      <Notifications />
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation menu" />
              <IconCards size={28} style={{ color: 'var(--mantine-color-brand-6)' }} />
              <Text component={Link} href={user ? '/dashboard' : '/'} size="xl" fw={700} c="brand.6" style={{ textDecoration: 'none' }}>
                Better Binder
              </Text>
            </Group>
            <Group visibleFrom="sm" gap="xs">
              {hydrated && !loading && user ? (
                <>
                  <NavButton href="/dashboard" icon={<IconDashboard size={16} />} label="All Cards" />
                  <NavButton href="/collection" icon={<IconArchive size={16} />} label="My Collection" />
                  <NavButton href="/collections" icon={<IconWorld size={16} />} label="Browse Collections" />
                  <NavButton href="/recommendations" icon={<IconBulb size={16} />} label="Recommendations" />
                  <NavButton href="/settings" icon={<IconSettings size={16} />} label="Settings" />
                  <Button variant="subtle" color="gray" onClick={handleSignOut} leftSection={<IconLogout size={16} />}>Sign Out</Button>
                </>
              ) : hydrated && !loading && !user ? (
                <>
                  <Button component={Link} href="/login" variant="subtle" leftSection={<IconLogin size={16} />}>Sign In</Button>
                  <Button component={Link} href="/register" variant="light" leftSection={<IconUserPlus size={16} />}>Register</Button>
                </>
              ) : null}
              {hydrated && (
                <ActionIcon variant="subtle" size="lg" onClick={handleToggleTheme} aria-label={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} mode`}>
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
                <NavButton href="/dashboard" icon={<IconDashboard size={16} />} label="All Cards" onClick={toggle} />
                <NavButton href="/collection" icon={<IconArchive size={16} />} label="My Collection" onClick={toggle} />
                <NavButton href="/collections" icon={<IconWorld size={16} />} label="Browse Collections" onClick={toggle} />
                <NavButton href="/recommendations" icon={<IconBulb size={16} />} label="Recommendations" onClick={toggle} />
                <NavButton href="/settings" icon={<IconSettings size={16} />} label="Settings" onClick={toggle} />
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
        <AppShell.Main id="main-content">{children}</AppShell.Main>
        <AppShell.Footer p="sm">
          <Text size="xs" c="dimmed" ta="center">
            This app is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. &copy;Wizards of the Coast LLC.
          </Text>
        </AppShell.Footer>
      </AppShell>
    </>
  );
}
