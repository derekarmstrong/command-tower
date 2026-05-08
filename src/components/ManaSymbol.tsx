'use client';

import { Group, type GroupProps } from '@mantine/core';

const MANA_MAP: Record<string, string> = {
  w: 'w', u: 'u', b: 'b', r: 'r', g: 'g',
  c: 'c', s: 's', x: 'x', y: 'y', z: 'z',
  t: 'tap', q: 'untap', e: 'energy',
  'w/u': 'wu', 'w/b': 'wb', 'u/b': 'ub', 'u/r': 'ur',
  'b/r': 'br', 'b/g': 'bg', 'r/w': 'rw', 'r/g': 'rg',
  'g/w': 'gw', 'g/u': 'gu',
  '2/w': '2w', '2/u': '2u', '2/b': '2b', '2/r': '2r', '2/g': '2g',
  'w/p': 'wp', 'u/p': 'up', 'b/p': 'bp', 'r/p': 'rp', 'g/p': 'gp',
};

const MANA_COLORS: Record<string, string> = {
  w: '#f0f2c0',
  u: '#b5cde3',
  b: '#aca29a',
  r: '#db8664',
  g: '#93b483',
  c: '#beb9b2',
  s: '#beb9b2',
};

function parseManaCost(cost: string): string[] {
  const symbols: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cost)) !== null) {
    symbols.push(match[1].toLowerCase());
  }
  return symbols;
}

function manaClass(symbol: string): string {
  return MANA_MAP[symbol] ?? symbol;
}

function manaColor(symbol: string): string | undefined {
  if (symbol.includes('/')) return undefined;
  return MANA_COLORS[symbol] ?? MANA_COLORS[symbol.replace(/[0-9].*$/, '')];
}

interface ManaSymbolProps extends GroupProps {
  cost: string;
  size?: number;
}

export function ManaSymbol({ cost, size = 16, ...props }: ManaSymbolProps) {
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;

  return (
    <Group gap={2} wrap="nowrap" {...props}>
      {symbols.map((sym, i) => {
        const color = manaColor(sym);
        const isHybrid = sym.includes('/');
        return (
        <i
          key={`${sym}-${i}`}
          className={`ms ms-${manaClass(sym)}${isHybrid ? ' ms-cost' : ''}`}
          style={{
            fontSize: size,
            lineHeight: 1,
            display: 'inline-block',
            width: `calc(${size}px * 1.3)`,
            height: `calc(${size}px * 1.3)`,
            borderRadius: '50%',
            textAlign: 'center',
            color: isHybrid ? undefined : '#111',
            verticalAlign: 'middle',
            background: isHybrid ? undefined : (color || '#beb9b2'),
          }}
        />
        );
      })}
    </Group>
  );
}
