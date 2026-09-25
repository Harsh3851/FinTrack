import { useTheme } from '../../lib/theme';

/** Chart colours selected per theme (not auto-flipped): validated categorical steps. */
const PALETTES = {
  light: {
    income: '#2a78d6',
    expense: '#eb6834',
    grid: '#e7e8ec',
    axis: '#6b7280',
    surface: '#ffffff',
    other: '#9ca3af',
  },
  dark: {
    income: '#3987e5',
    expense: '#d95926',
    grid: '#2a2f38',
    axis: '#8e96a3',
    surface: '#161a21',
    other: '#5b6270',
  },
};

export function useChartTheme() {
  const { resolved } = useTheme();
  return PALETTES[resolved];
}
