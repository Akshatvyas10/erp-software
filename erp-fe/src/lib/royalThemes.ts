export interface RoyalTheme {
  id: string;
  name: string;
  description: string;
  primaryHex: string;
  accentHex: string;
  light: {
    primary: string;
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
  };
}

export const ROYAL_THEMES: RoyalTheme[] = [
  {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Imperial majesty, modern elegance",
    primaryHex: "#6D28D9",
    accentHex: "#A855F7",
    light: {
      primary: "263 70% 50%",
      primaryForeground: "0 0% 100%",
      ring: "263 70% 50%",
      accent: "270 50% 96%",
      accentForeground: "263 70% 40%",
    },
    dark: {
      primary: "263 70% 65%",
      primaryForeground: "0 0% 100%",
      ring: "263 70% 65%",
      accent: "263 50% 20%",
      accentForeground: "263 70% 85%",
    },
  },
  {
    id: "deep-indigo",
    name: "Deep Indigo",
    description: "Classic institutional authority",
    primaryHex: "#4338CA",
    accentHex: "#6366F1",
    light: {
      primary: "239 60% 50%",
      primaryForeground: "0 0% 100%",
      ring: "239 60% 50%",
      accent: "240 50% 96%",
      accentForeground: "239 60% 40%",
    },
    dark: {
      primary: "239 65% 65%",
      primaryForeground: "0 0% 100%",
      ring: "239 65% 65%",
      accent: "239 40% 20%",
      accentForeground: "239 65% 85%",
    },
  },
  {
    id: "emerald-green",
    name: "Emerald Green",
    description: "Prosperity, balance and vitality",
    primaryHex: "#047857",
    accentHex: "#10B981",
    light: {
      primary: "161 94% 24%",
      primaryForeground: "0 0% 100%",
      ring: "161 94% 24%",
      accent: "150 40% 95%",
      accentForeground: "161 94% 20%",
    },
    dark: {
      primary: "160 84% 39%",
      primaryForeground: "0 0% 100%",
      ring: "160 84% 39%",
      accent: "160 50% 18%",
      accentForeground: "160 84% 85%",
    },
  },
  {
    id: "crimson-red",
    name: "Crimson Red",
    description: "Prestigious university heritage",
    primaryHex: "#B91C1C",
    accentHex: "#EF4444",
    light: {
      primary: "0 74% 42%",
      primaryForeground: "0 0% 100%",
      ring: "0 74% 42%",
      accent: "0 50% 96%",
      accentForeground: "0 74% 35%",
    },
    dark: {
      primary: "0 84% 60%",
      primaryForeground: "0 0% 100%",
      ring: "0 84% 60%",
      accent: "0 50% 20%",
      accentForeground: "0 84% 85%",
    },
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    description: "Trustworthy enterprise sapphire",
    primaryHex: "#1D4ED8",
    accentHex: "#3B82F6",
    light: {
      primary: "224 76% 48%",
      primaryForeground: "0 0% 100%",
      ring: "224 76% 48%",
      accent: "220 50% 96%",
      accentForeground: "224 76% 38%",
    },
    dark: {
      primary: "217 91% 60%",
      primaryForeground: "0 0% 100%",
      ring: "217 91% 60%",
      accent: "217 50% 20%",
      accentForeground: "217 91% 85%",
    },
  },
  {
    id: "teal",
    name: "Royal Teal",
    description: "Fresh coastal academic harmony",
    primaryHex: "#0F766E",
    accentHex: "#14B8A6",
    light: {
      primary: "175 77% 26%",
      primaryForeground: "0 0% 100%",
      ring: "175 77% 26%",
      accent: "175 40% 95%",
      accentForeground: "175 77% 20%",
    },
    dark: {
      primary: "173 80% 40%",
      primaryForeground: "0 0% 100%",
      ring: "173 80% 40%",
      accent: "173 40% 20%",
      accentForeground: "173 80% 85%",
    },
  },
  {
    id: "amber-gold",
    name: "Amber Gold",
    description: "Warm regal gold & honor",
    primaryHex: "#B45309",
    accentHex: "#F59E0B",
    light: {
      primary: "38 92% 38%",
      primaryForeground: "0 0% 100%",
      ring: "38 92% 38%",
      accent: "40 50% 96%",
      accentForeground: "38 92% 28%",
    },
    dark: {
      primary: "45 93% 47%",
      primaryForeground: "0 0% 10%",
      ring: "45 93% 47%",
      accent: "45 50% 18%",
      accentForeground: "45 93% 85%",
    },
  },
  {
    id: "rose",
    name: "Royal Rose",
    description: "Distinguished warmth and charm",
    primaryHex: "#BE123C",
    accentHex: "#F43F5E",
    light: {
      primary: "343 82% 41%",
      primaryForeground: "0 0% 100%",
      ring: "343 82% 41%",
      accent: "343 50% 96%",
      accentForeground: "343 82% 35%",
    },
    dark: {
      primary: "345 83% 60%",
      primaryForeground: "0 0% 100%",
      ring: "345 83% 60%",
      accent: "345 40% 20%",
      accentForeground: "345 83% 85%",
    },
  },
  {
    id: "slate",
    name: "Royal Slate",
    description: "Minimalist executive monochrome",
    primaryHex: "#334155",
    accentHex: "#64748B",
    light: {
      primary: "215 25% 27%",
      primaryForeground: "0 0% 100%",
      ring: "215 25% 27%",
      accent: "215 20% 95%",
      accentForeground: "215 25% 20%",
    },
    dark: {
      primary: "215 20% 65%",
      primaryForeground: "215 25% 15%",
      ring: "215 20% 65%",
      accent: "215 20% 22%",
      accentForeground: "215 20% 85%",
    },
  },
  {
    id: "cyan",
    name: "Ocean Cyan",
    description: "Vibrant high-tech education",
    primaryHex: "#0369A1",
    accentHex: "#0EA5E9",
    light: {
      primary: "199 89% 32%",
      primaryForeground: "0 0% 100%",
      ring: "199 89% 32%",
      accent: "199 40% 95%",
      accentForeground: "199 89% 25%",
    },
    dark: {
      primary: "199 89% 48%",
      primaryForeground: "0 0% 100%",
      ring: "199 89% 48%",
      accent: "199 40% 20%",
      accentForeground: "199 89% 85%",
    },
  },
  {
    id: "violet",
    name: "Electric Violet",
    description: "Bold vision, creative intelligence",
    primaryHex: "#7C3AED",
    accentHex: "#8B5CF6",
    light: {
      primary: "262 83% 58%",
      primaryForeground: "0 0% 100%",
      ring: "262 83% 58%",
      accent: "262 50% 96%",
      accentForeground: "262 83% 40%",
    },
    dark: {
      primary: "262 83% 66%",
      primaryForeground: "0 0% 100%",
      ring: "262 83% 66%",
      accent: "262 40% 20%",
      accentForeground: "262 83% 85%",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Traditional botanical heritage",
    primaryHex: "#15803D",
    accentHex: "#22C55E",
    light: {
      primary: "142 71% 29%",
      primaryForeground: "0 0% 100%",
      ring: "142 71% 29%",
      accent: "142 40% 95%",
      accentForeground: "142 71% 22%",
    },
    dark: {
      primary: "142 70% 45%",
      primaryForeground: "0 0% 100%",
      ring: "142 70% 45%",
      accent: "142 40% 18%",
      accentForeground: "142 70% 85%",
    },
  },
];
