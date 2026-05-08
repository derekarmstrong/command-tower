export function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'gray';
    case 'uncommon': return 'green';
    case 'rare': return 'yellow';
    case 'mythic': return 'orange';
    case 'special': return 'violet';
    default: return 'gray';
  }
}

export function raritySymbolColor(rarity: string, isDark: boolean): string {
  switch (rarity) {
    case 'common':
      return isDark ? '#ffffff' : '#000000';
    case 'uncommon':
      return isDark ? '#c0c0c0' : '#696969';
    case 'rare':
      return '#d4af37';
    case 'mythic':
      return '#d32f2f';
    case 'special':
      return '#9c27b0';
    default:
      return isDark ? '#ffffff' : '#000000';
  }
}
