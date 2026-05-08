'use client';

interface SetSymbolProps {
  setCode: string;
  size?: number;
  color?: string;
}

export function SetSymbol({ setCode, size = 16, color }: SetSymbolProps) {
  const code = setCode.toLowerCase();
  return (
    <i
      className={`ss ss-${code}`}
      style={{ fontSize: size, lineHeight: 1, color }}
    />
  );
}
