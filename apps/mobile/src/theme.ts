export interface ThemeColors {
  bg: string;
  bg2: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
}
export const COLORS: Record<'light' | 'dark', ThemeColors> = {
  light: { bg: '#ffffff', bg2: '#f4f5f2', fg: '#1d1f24', muted: '#5f646e', line: '#e2e4e0', accent: '#1f4fd8', accentFg: '#ffffff' },
  dark: { bg: '#1b1e24', bg2: '#23272f', fg: '#e8eaee', muted: '#a3a8b3', line: '#333843', accent: '#5b8dff', accentFg: '#0d1326' },
};
