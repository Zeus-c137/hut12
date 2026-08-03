import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { SiteConfig, ThemePreset, ThemeMode, CardStyle, ButtonStyle, BorderRadiusStyle } from "../types";
import { fixGitHubImageUrl } from "../utils/imageUtils";

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

export const THEME_PRESETS: Record<ThemePreset, ThemePresetDetails> = {
  "duolingo-playful": {
    primary: "#58cc02",
    primaryShadow: "#46a302",
    accent: "#ff4b4b",
    accentShadow: "#ea2b2b",
    secondary: "#1cb0f6",
    secondaryShadow: "#1899d6",
    bg: "#f7f9fa",
    cardBg: "#ffffff",
    cardBorder: "#e5e5e5",
    cardShadow: "#cecece",
    textColor: "#3c3c3c",
    isDark: false
  },
  "emerald-farm": {
    primary: "#22c55e",
    primaryShadow: "#15803d",
    accent: "#eab308",
    accentShadow: "#ca8a04",
    secondary: "#0ea5e9",
    secondaryShadow: "#0369a1",
    bg: "#f0fdf4",
    cardBg: "#ffffff",
    cardBorder: "#bbf7d0",
    cardShadow: "#86efac",
    textColor: "#3c3c3c",
    isDark: false
  },
  "cyber-arcade": {
    primary: "#06b6d4",
    primaryShadow: "#0891b2",
    accent: "#a855f7",
    accentShadow: "#7e22ce",
    secondary: "#f43f5e",
    secondaryShadow: "#be123c",
    bg: "#0f172a",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    cardShadow: "#020617",
    textColor: "#f8fafc",
    isDark: true
  },
  "sunset-gold": {
    primary: "#f59e0b",
    primaryShadow: "#b45309",
    accent: "#f43f5e",
    accentShadow: "#be123c",
    secondary: "#10b981",
    secondaryShadow: "#047857",
    bg: "#fffbeb",
    cardBg: "#ffffff",
    cardBorder: "#fde68a",
    cardShadow: "#fcd34d",
    textColor: "#3c3c3c",
    isDark: false
  },
  "royal-violet": {
    primary: "#7c3aed",
    primaryShadow: "#5b21b6",
    accent: "#ec4899",
    accentShadow: "#be185d",
    secondary: "#06b6d4",
    secondaryShadow: "#0891b2",
    bg: "#f5f3ff",
    cardBg: "#ffffff",
    cardBorder: "#ddd6fe",
    cardShadow: "#c4b5fd",
    textColor: "#3c3c3c",
    isDark: false
  },
  "apple": {
    primary: "#0071e3",
    primaryShadow: "#005bb5",
    accent: "#86868b",
    accentShadow: "#6e6e73",
    secondary: "#10b981",
    secondaryShadow: "#047857",
    bg: "#f5f5f7",
    cardBg: "#ffffff",
    cardBorder: "#d2d2d7",
    cardShadow: "#e8e8ed",
    textColor: "#1d1d1f",
    isDark: false
  },
  "terminal-hacker": {
    primary: "#00ff00",
    primaryShadow: "#009900",
    accent: "#00ffff",
    accentShadow: "#008888",
    secondary: "#ff00ff",
    secondaryShadow: "#880088",
    bg: "#030604",
    cardBg: "#0a0f0d",
    cardBorder: "#14532d",
    cardShadow: "#001a00",
    textColor: "#00ff00",
    isDark: true
  },
  "8-bit-pixel": {
    primary: "#ff5757",
    primaryShadow: "#b32d2d",
    accent: "#ffde59",
    accentShadow: "#c6a81e",
    secondary: "#5271ff",
    secondaryShadow: "#2a44b3",
    bg: "#2c1b4d",
    cardBg: "#432b68",
    cardBorder: "#581c87",
    cardShadow: "#130722",
    textColor: "#ffffff",
    isDark: true
  },
  "cyberpunk-neon": {
    primary: "#ff007f",
    primaryShadow: "#cc0066",
    accent: "#00f0ff",
    accentShadow: "#00a1cc",
    secondary: "#fffb00",
    secondaryShadow: "#b3b000",
    bg: "#0d0d1a",
    cardBg: "#15152a",
    cardBorder: "#4c0519",
    cardShadow: "#000000",
    textColor: "#00f0ff",
    isDark: true
  },
  "luxury-dark-gold": {
    primary: "#dfb15b",
    primaryShadow: "#9b7632",
    accent: "#ffffff",
    accentShadow: "#cccccc",
    secondary: "#c0c0c0",
    secondaryShadow: "#8e8e8e",
    bg: "#111111",
    cardBg: "#1a1a1a",
    cardBorder: "#78350f",
    cardShadow: "#000000",
    textColor: "#dfb15b",
    isDark: true
  },
  "neumorphic": {
    primary: "#3b82f6",
    primaryShadow: "#2563eb",
    accent: "#10b981",
    accentShadow: "#059669",
    secondary: "#6366f1",
    secondaryShadow: "#4f46e5",
    bg: "#e0e0e0",
    cardBg: "#e0e0e0",
    cardBorder: "#f0f0f0",
    cardShadow: "#bebebe",
    textColor: "#333333",
    isDark: false
  },
  "custom": {
    primary: "#58cc02",
    primaryShadow: "#46a302",
    accent: "#ff4b4b",
    accentShadow: "#ea2b2b",
    secondary: "#1cb0f6",
    secondaryShadow: "#1899d6",
    bg: "#f7f9fa",
    cardBg: "#ffffff",
    cardBorder: "#e5e5e5",
    cardShadow: "#cecece",
    textColor: "#3c3c3c",
    isDark: false
  }
};

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

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
  {
    id: "duolingo-playful",
    name: "Duolingo Playful",
    icon: "🐤",
    description: "Vibrant green & red 3D extruded controls with crisp light canvas.",
    primary: "#58cc02",
    accent: "#ff4b4b",
    secondary: "#1cb0f6",
    cardStyle: "playful-3d",
    radius: "rounded-2xl"
  },
  {
    id: "emerald-farm",
    name: "Emerald Farm",
    icon: "🌱",
    description: "Fresh green pastures & golden harvest tones.",
    primary: "#22c55e",
    accent: "#eab308",
    secondary: "#0ea5e9",
    cardStyle: "playful-3d",
    radius: "rounded-2xl"
  },
  {
    id: "cyber-arcade",
    name: "Cyber Arcade",
    icon: "👾",
    description: "Futuristic neon cyan & purple arcade aesthetic.",
    primary: "#06b6d4",
    accent: "#a855f7",
    secondary: "#f43f5e",
    cardStyle: "playful-3d",
    radius: "rounded-2xl"
  },
  {
    id: "sunset-gold",
    name: "Sunset Gold",
    icon: "🌅",
    description: "Warm amber & rose sunset palette.",
    primary: "#f59e0b",
    accent: "#f43f5e",
    secondary: "#10b981",
    cardStyle: "playful-3d",
    radius: "rounded-2xl"
  },
  {
    id: "royal-violet",
    name: "Royal Violet",
    icon: "👑",
    description: "Deep violet & pink luxury gaming vibes.",
    primary: "#7c3aed",
    accent: "#ec4899",
    secondary: "#06b6d4",
    cardStyle: "playful-3d",
    radius: "rounded-2xl"
  },
  {
    id: "apple",
    name: "Apple Sleek",
    icon: "🍎",
    description: "Sleek, high-contrast monochrome design with refined grey tones.",
    primary: "#0071e3",
    accent: "#86868b",
    secondary: "#10b981",
    cardStyle: "solid",
    radius: "rounded-xl"
  },
  {
    id: "terminal-hacker",
    name: "Terminal Hacker",
    icon: "💻",
    description: "Classic black and phosphor green terminal matrix style.",
    primary: "#00ff00",
    accent: "#00ffff",
    secondary: "#ff00ff",
    cardStyle: "neo-brutalist",
    radius: "rounded-xl"
  },
  {
    id: "8-bit-pixel",
    name: "8-Bit Pixel",
    icon: "👾",
    description: "Retro console arcade with bright vibrant sprites.",
    primary: "#ff5757",
    accent: "#ffde59",
    secondary: "#5271ff",
    cardStyle: "chunky-border",
    radius: "rounded-3xl"
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    icon: "🌃",
    description: "Vibrant hot pink and neon cyan cyber-state.",
    primary: "#ff007f",
    accent: "#00f0ff",
    secondary: "#fffb00",
    cardStyle: "glass",
    radius: "rounded-2xl"
  },
  {
    id: "luxury-dark-gold",
    name: "Luxury Dark & Gold",
    icon: "⚜️",
    description: "Elegant gold accents on high-end obsidian dark surface.",
    primary: "#dfb15b",
    accent: "#ffffff",
    secondary: "#c0c0c0",
    cardStyle: "solid",
    radius: "rounded-2xl"
  },
  {
    id: "neumorphic",
    name: "Neumorphic Soft",
    icon: "☁️",
    description: "Sleek, soft extruded elements and clean organic shadows.",
    primary: "#3b82f6",
    accent: "#10b981",
    secondary: "#6366f1",
    cardStyle: "solid",
    radius: "rounded-3xl"
  }
];

function darkenColor(hex: string, percent: number = 20): string {
  if (!hex || !hex.startsWith("#")) return hex || "#46a302";
  let num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) - Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) - Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) - Math.round(255 * (percent / 100));
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const GOOGLE_FONTS_MAP: Record<string, string> = {
  "Fredoka": "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap",
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap",
  "Outfit": "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap",
  "Poppins": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap",
  "Space Grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap",
  "Comfortaa": "https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&display=swap",
  "Lexend": "https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800&display=swap",
  "Quicksand": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap",
  "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap",
  "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
};

interface ThemeContextType {
  siteConfig: SiteConfig | null;
  themePreset: ThemePreset;
  themeMode: ThemeMode;
  cardStyle: CardStyle;
  buttonStyle: ButtonStyle;
  borderRadius: BorderRadiusStyle;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  cardBgColor: string;
  authBgImage: string;
  dashboardBgImage: string;
  fontFamily: string;
  fontSizeScale: "sm" | "md" | "lg" | "xl";
  textColor: string;
  updateLocalThemeConfig: (newConfig: Partial<SiteConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  siteConfig: SiteConfig | null;
  children: React.ReactNode;
}> = ({ siteConfig: initialConfig, children }) => {
  const [config, setConfig] = useState<SiteConfig | null>(() => {
    return initialConfig || null;
  });

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const themePreset = (config?.themePreset || "duolingo-playful") as ThemePreset;
  const themeMode = (config?.themeMode || "light") as ThemeMode;
  const cardStyle = (config?.cardStyle || "playful-3d") as CardStyle;
  const buttonStyle = (config?.buttonStyle || "playful-3d") as ButtonStyle;
  const borderRadius = (config?.borderRadius || "rounded-2xl") as BorderRadiusStyle;
  const primaryColor = config?.primaryColor || THEME_PRESETS[themePreset]?.primary || "#58cc02";
  const accentColor = config?.accentColor || THEME_PRESETS[themePreset]?.accent || "#ff4b4b";
  const secondaryColor = config?.secondaryColor || THEME_PRESETS[themePreset]?.secondary || "#1cb0f6";
  const bgColor = config?.bgColor || THEME_PRESETS[themePreset]?.bg || "#f7f9fa";
  const cardBgColor = config?.cardBgColor || THEME_PRESETS[themePreset]?.cardBg || "#ffffff";
  const rawAuthBg = config?.authBgImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80";
  const authBgImage = fixGitHubImageUrl(rawAuthBg);
  const dashboardBgImage = fixGitHubImageUrl(config?.dashboardBgImage || "");
  const fontFamily = config?.fontFamily || "Fredoka";
  const fontSizeScale = config?.fontSizeScale || "md";
  const textColor = config?.textColor || "";

  useLayoutEffect(() => {
    const preset = THEME_PRESETS[themePreset] || THEME_PRESETS["duolingo-playful"];
    
    let activePrimary = primaryColor;
    let activePrimaryShadow = darkenColor(primaryColor, 18);
    let activeAccent = accentColor;
    let activeAccentShadow = darkenColor(accentColor, 18);
    let activeSecondary = secondaryColor;
    let activeSecondaryShadow = darkenColor(secondaryColor, 18);
    let activeBg = bgColor;
    let activeCardBg = cardBgColor;

    if (themePreset !== "custom") {
      activePrimary = preset.primary;
      activePrimaryShadow = preset.primaryShadow;
      activeAccent = preset.accent;
      activeAccentShadow = preset.accentShadow;
      activeSecondary = preset.secondary;
      activeSecondaryShadow = preset.secondaryShadow;
      activeBg = preset.bg;
      activeCardBg = preset.cardBg;
    }

    const isDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) || preset.isDark;

    let activeCardBorder = preset.cardBorder;
    let activeCardShadow = preset.cardShadow;
    let activeInputBorder = preset.cardBorder || activePrimary;

    if (cardStyle === "liquid-glass") {
      activeCardBg = isDark ? "rgba(10, 15, 26, 0.45)" : "rgba(255, 255, 255, 0.78)";
      activeCardBorder = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.65)";
      activeCardShadow = isDark ? "0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)" : "0 8px 24px 0 rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)";
    } else if (cardStyle === "glass") {
      activeCardBg = isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.82)";
      activeCardBorder = isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(15, 23, 42, 0.15)";
      activeCardShadow = isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)";
    } else if (cardStyle === "textured-wood") {
      activeCardBg = isDark ? "#2d1e15" : "#fbf4eb";
      activeCardBorder = isDark ? "#523726" : "#e6d3c0";
      activeCardShadow = isDark ? "0 4px 14px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(139, 90, 43, 0.15)";
    } else if (cardStyle === "textured-metal") {
      activeCardBg = isDark ? "#1b212c" : "#f1f5f9";
      activeCardBorder = isDark ? "#334155" : "#cbd5e1";
      activeCardShadow = isDark ? "0 4px 14px rgba(0, 0, 0, 0.6)" : "0 4px 12px rgba(0, 0, 0, 0.12)";
    } else if (cardStyle === "solid") {
      activeCardShadow = isDark ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(0, 0, 0, 0.06)";
    } else if (cardStyle === "neo-brutalist") {
      activeCardBorder = isDark ? "#f8fafc" : "#0f172a";
      activeCardShadow = isDark ? "#f8fafc" : "#0f172a";
    }

    const root = document.documentElement;
    root.setAttribute("data-card-style", cardStyle || "playful-3d");
    root.setAttribute("data-button-style", buttonStyle || "playful-3d");
    root.setAttribute("data-theme-preset", themePreset || "duolingo-playful");

    root.style.setProperty("--theme-primary", activePrimary);
    root.style.setProperty("--theme-primary-shadow", activePrimaryShadow);
    root.style.setProperty("--theme-accent", activeAccent);
    root.style.setProperty("--theme-accent-shadow", activeAccentShadow);
    root.style.setProperty("--theme-secondary", activeSecondary);
    root.style.setProperty("--theme-secondary-shadow", activeSecondaryShadow);
    root.style.setProperty("--theme-bg", activeBg);
    root.style.setProperty("--theme-card-bg", activeCardBg);
    root.style.setProperty("--theme-card-border", activeCardBorder);
    root.style.setProperty("--theme-input-border", activeInputBorder);
    root.style.setProperty("--theme-card-shadow", activeCardShadow);

    const radiusPxMap: Record<BorderRadiusStyle, string> = {
      "rounded-xl": "0.75rem",
      "rounded-2xl": "1.25rem",
      "rounded-3xl": "1.75rem"
    };
    root.style.setProperty("--theme-radius", radiusPxMap[borderRadius] || "1.25rem");

    // Dynamic Google Fonts Loading
    const fontUrl = GOOGLE_FONTS_MAP[fontFamily] || GOOGLE_FONTS_MAP["Fredoka"];
    let fontLink = document.getElementById("dynamic-theme-font") as HTMLLinkElement | null;
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = "dynamic-theme-font";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    if (fontLink.href !== fontUrl) {
      fontLink.href = fontUrl;
    }
    root.style.setProperty("--theme-font-family", `'${fontFamily}', 'Plus Jakarta Sans', sans-serif`);

    // Font size scale mapping
    const fontScaleMap = { sm: "14px", md: "16px", lg: "18px", xl: "20px" };
    root.style.setProperty("--theme-font-base", fontScaleMap[fontSizeScale] || "16px");

    // Text color
    if (textColor) {
      root.style.setProperty("--theme-text", textColor);
    } else if (preset.textColor) {
      root.style.setProperty("--theme-text", preset.textColor);
    } else {
      root.style.removeProperty("--theme-text");
    }

    // Dark Mode Handling
    if (isDark) {
      root.classList.add("dark");
      root.style.setProperty("--theme-text-muted", "#94a3b8");
    } else {
      root.classList.remove("dark");
      root.style.setProperty("--theme-text-muted", "#777777");
    }
  }, [themePreset, themeMode, cardStyle, buttonStyle, borderRadius, primaryColor, accentColor, secondaryColor, bgColor, cardBgColor, fontFamily, fontSizeScale, textColor]);

  const updateLocalThemeConfig = (newFields: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...(prev || {}), ...newFields }));
  };

  return (
    <ThemeContext.Provider
      value={{
        siteConfig: config,
        themePreset,
        themeMode,
        cardStyle,
        buttonStyle,
        borderRadius,
        primaryColor,
        accentColor,
        secondaryColor,
        bgColor,
        cardBgColor,
        authBgImage,
        dashboardBgImage,
        fontFamily,
        fontSizeScale,
        textColor,
        updateLocalThemeConfig
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
