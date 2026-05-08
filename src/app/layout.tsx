import type { Metadata } from 'next';
import { MantineProvider, ColorSchemeScript, createTheme, MantineColorsTuple } from '@mantine/core';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ClientLayout } from '@/components/ClientLayout';

const brand: MantineColorsTuple = [
  '#eef3ff',
  '#dce4f5',
  '#b9c7e2',
  '#94a8d0',
  '#748dc1',
  '#5f7cb8',
  '#5474b4',
  '#44639f',
  '#39588f',
  '#2d4b81',
];

const theme = createTheme({
  colors: { brand },
  primaryColor: 'brand',
  defaultRadius: 'md',
});

export const metadata: Metadata = {
  title: 'Command Tower',
  description: 'Magic: The Gathering collection manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
        <link rel="stylesheet" href="/fonts/mana.min.css" />
        <link rel="stylesheet" href="/fonts/keyrune.min.css" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
