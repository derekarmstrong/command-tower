'use client';

import { HoverCard, Image, Center, Text, useMantineColorScheme } from '@mantine/core';
import { SetSymbol } from './SetSymbol';
import type { CardPrinting } from '@/lib/groupCards';
import { getImageUris } from '@/lib/scryfallImage';
import { raritySymbolColor } from './rarityColor';

interface SetSymbolTooltipProps {
  printing: CardPrinting;
  size?: number;
}

export function SetSymbolTooltip({ printing, size = 16 }: SetSymbolTooltipProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const color = raritySymbolColor(printing.rarity, isDark);

  const imageUri =
    getImageUris(printing)?.normal ||
    getImageUris(printing)?.small ||
    null;

  return (
    <HoverCard width={244} shadow="md" openDelay={200} closeDelay={100} withArrow>
      <HoverCard.Target>
        <span style={{ cursor: 'pointer', lineHeight: 1 }}>
          <SetSymbol setCode={printing.set} size={size} color={color} />
        </span>
      </HoverCard.Target>
      <HoverCard.Dropdown p={0} style={{ border: 'none', borderRadius: 4, overflow: 'hidden' }}>
        {imageUri ? (
          <Image
            src={imageUri}
            alt={printing.set_name}
            width={244}
            height={340}
            fit="contain"
            loading="lazy"
          />
        ) : (
          <Center h={340}>
            <Text c="dimmed" size="sm">No image</Text>
          </Center>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
