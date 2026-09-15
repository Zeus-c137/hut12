/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * hut12 minimal tokens — single source for light/dark presets, fonts and migrators
 */
import type { ThemePreset, CardStyle, ButtonStyle, BorderRadiusStyle, SiteConfig } from "../types";

export interface ThemePresetDetails {
  primary: string;
  primaryShadow: string;
  accent: string;
  accentShadow: string;
  secondary: string;
  secondaryShadow: string;
  bg: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  textColor?: string;
  isDark?: boolean;
}

export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  icon: string;
  description: string;
  primary: string;
  accent: string;
  secondary: string;
  cardStyle: CardStyle;
  radius: BorderRadiusStyle;
}

function darkenColor(hex: string, percent: number = 20): string {
  if (!hex || !hex.startsWith("#")) return hex || "#92400e";
  let num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) - Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) - Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) - Math.round(255 * (percent / 100));
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const HUT12_LIGHT: ThemePresetDetails = {
  primary: "#c27a2e",
  primaryShadow: "#92400e",
  accent: "#c27a2e",
  accentShadow: "#92400e",
  secondary: "#c27a2e",
  secondaryShadow: "#92400e",
  bg: "#faf6f0",
  cardBg: "#ffffff",
  cardBorder: "#e7e5e4",
  cardShadow: "#e7e5e4",
  textColor: "#1c1917",
  isDark: false,
};

export const HUT12_DARK: ThemePresetDetails = {
  primary: "#e8b86a",
  primaryShadow: "#9b7632",
  accent: "#e8b86a",
  accentShadow: "#9b7632",
  secondary: "#e8b86a",
  secondaryShadow: "#9b7632",
  bg: "#000000",
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.08)",
  cardShadow: "#000000",
  textColor: "#fafaf9",
  isDark: true,
};

export const HUT12_PRESETS: Record<ThemePreset, ThemePresetDetails> = {
  "hut12-light": HUT12_LIGHT,
  "hut12-dark": HUT12_DARK,
};

export const HUT12_PRESET_OPTIONS: ThemePresetOption[] = [
  {
    id: "hut12-light",
    name: "Hut12 Light",
    icon: "☀️",
    description: "Warm paper canvas with toasted amber accents.",
    primary: "#c27a2e",
    accent: "#c27a2e",
    secondary: "#c27a2e",
    cardStyle: "solid",
    radius: "rounded-2xl",
  },
  {
    id: "hut12-dark",
    name: "Hut12 Dark",
    icon: "🌙",
    description: "True OLED rich black — ink cards on pure black.",
    primary: "#e8b86a",
    accent: "#e8b86a",
    secondary: "#e8b86a",
    cardStyle: "glass",
    radius: "rounded-2xl",
  },
];

export const HUT12_FONTS_MAP: Record<string, string> = {
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
};

const DARK_PRESET_SET = new Set<string>([
  "cyber-arcade",
  "terminal-hacker",
  "8-bit-pixel",
  "cyberpunk-neon",
  "luxury-dark-gold",
]);

const OLD_TO_HUT12: Record<string, ThemePreset> = {
  "duolingo-playful": "hut12-light",
  "emerald-farm": "hut12-light",
  "sunset-gold": "hut12-light",
  "royal-violet": "hut12-light",
  apple: "hut12-light",
  neumorphic: "hut12-light",
  custom: "hut12-light",
  "cyber-arcade": "hut12-dark",
  "terminal-hacker": "hut12-dark",
  "8-bit-pixel": "hut12-dark",
  "cyberpunk-neon": "hut12-dark",
  "luxury-dark-gold": "hut12-dark",
};

export function migratePreset(raw: string | undefined): ThemePreset {
  const key = raw ?? "";
  if (key === "hut12-light" || key === "hut12-dark") return key as ThemePreset;
  if (DARK_PRESET_SET.has(key)) return "hut12-dark";
  return OLD_TO_HUT12[key] ?? "hut12-light";
}

export function migrateCardStyle(raw: string | undefined): CardStyle {
  const map: Record<string, CardStyle> = { glass: "glass", "liquid-glass": "glass" };
  return map[raw ?? ""] ?? "solid";
}

export function migrateButtonStyle(_raw: string | undefined): ButtonStyle {
  return "pill-gradient";
}

export function migrateBorderRadius(_raw: string | undefined): BorderRadiusStyle {
  return "rounded-2xl";
}

export function migrateFontFamily(raw: string | undefined): string {
  return raw && raw in HUT12_FONTS_MAP ? raw : "Sora";
}

export function isHut12DarkPreset(preset: ThemePreset): boolean {
  return preset === "hut12-dark";
}

export function sanitizeSiteConfig(config: Partial<SiteConfig>): Partial<SiteConfig> {
  return {
    ...config,
    themePreset: migratePreset(config.themePreset as string),
    cardStyle: migrateCardStyle(config.cardStyle as string),
    buttonStyle: migrateButtonStyle(config.buttonStyle as string),
    borderRadius: migrateBorderRadius(config.borderRadius as string),
    fontFamily: migrateFontFamily(config.fontFamily),
  };
}

export { darkenColor };
