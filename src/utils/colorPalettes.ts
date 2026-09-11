import type { FavoritePen } from "../types/whiteboard";

export interface ColorSwatch {
  value: string;
  label: string;
  glow?: string;
}

export interface PalettePack {
  id: "neon" | "khan" | "academic" | "pastel";
  name: string;
  description: string;
  swatches: ColorSwatch[];
}

export const PALETTE_PACKS: PalettePack[] = [
  {
    id: "neon",
    name: "Neon Chalkboard",
    description: "Vibrant high-contrast pigments optimized for dark chalkboard screens",
    swatches: [
      { value: "#F8FAFC", label: "Pure Chalk", glow: "shadow-[0_0_12px_rgba(248,250,252,0.6)]" },
      { value: "#FDE047", label: "Cadmium Sun", glow: "shadow-[0_0_12px_rgba(253,224,71,0.6)]" },
      { value: "#38BDF8", label: "Electric Cyan", glow: "shadow-[0_0_12px_rgba(56,189,248,0.6)]" },
      { value: "#4ADE80", label: "Mint Sage", glow: "shadow-[0_0_12px_rgba(74,222,128,0.6)]" },
      { value: "#FB7185", label: "Coral Rose", glow: "shadow-[0_0_12px_rgba(251,113,133,0.6)]" },
      { value: "#FB923C", label: "Warm Amber", glow: "shadow-[0_0_12px_rgba(251,146,60,0.6)]" },
      { value: "#C084FC", label: "Iris Violet", glow: "shadow-[0_0_12px_rgba(192,132,252,0.6)]" },
    ],
  },
  {
    id: "khan",
    name: "Khan Academy Studio",
    description: "Friendly, engaging, high-contrast palette popularized by online math & physics educators",
    swatches: [
      { value: "#FFFFFF", label: "Studio White", glow: "shadow-[0_0_12px_rgba(255,255,255,0.6)]" },
      { value: "#1865F2", label: "Khan Royal Blue", glow: "shadow-[0_0_12px_rgba(24,101,242,0.6)]" },
      { value: "#00A35C", label: "Emerald Green", glow: "shadow-[0_0_12px_rgba(0,163,92,0.6)]" },
      { value: "#FFC107", label: "Sunbeam Gold", glow: "shadow-[0_0_12px_rgba(255,193,7,0.6)]" },
      { value: "#FF7043", label: "Salmon Orange", glow: "shadow-[0_0_12px_rgba(255,112,67,0.6)]" },
      { value: "#8E24AA", label: "Deep Lavender", glow: "shadow-[0_0_12px_rgba(142,36,170,0.6)]" },
      { value: "#00BCD4", label: "Turquoise Cyan", glow: "shadow-[0_0_12px_rgba(0,188,212,0.6)]" },
    ],
  },
  {
    id: "academic",
    name: "Academic Classic",
    description: "Distinguished university lecture and fountain pen inks for papers, proofs & derivations",
    swatches: [
      { value: "#0F172A", label: "Oxford Slate", glow: "shadow-[0_0_12px_rgba(15,23,42,0.6)]" },
      { value: "#1E40AF", label: "Cambridge Blue", glow: "shadow-[0_0_12px_rgba(30,64,175,0.6)]" },
      { value: "#991B1B", label: "Crimson Proof", glow: "shadow-[0_0_12px_rgba(153,27,27,0.6)]" },
      { value: "#166534", label: "Forest Scholar", glow: "shadow-[0_0_12px_rgba(22,101,52,0.6)]" },
      { value: "#6B21A8", label: "Imperial Plum", glow: "shadow-[0_0_12px_rgba(107,33,168,0.6)]" },
      { value: "#9A3412", label: "Terracotta Sienna", glow: "shadow-[0_0_12px_rgba(154,52,18,0.6)]" },
      { value: "#451A03", label: "Sepia Ink", glow: "shadow-[0_0_12px_rgba(69,26,3,0.6)]" },
    ],
  },
  {
    id: "pastel",
    name: "Pastel Aesthetic",
    description: "Gentle eye-friendly hues, ideal for detailed biology diagrams, mind maps & aesthetic notes",
    swatches: [
      { value: "#BAE6FD", label: "Powder Blue", glow: "shadow-[0_0_12px_rgba(186,230,253,0.6)]" },
      { value: "#BBF7D0", label: "Pistachio Mint", glow: "shadow-[0_0_12px_rgba(187,247,208,0.6)]" },
      { value: "#FEF08A", label: "Buttercup Yellow", glow: "shadow-[0_0_12px_rgba(254,240,138,0.6)]" },
      { value: "#FED7AA", label: "Peach Cream", glow: "shadow-[0_0_12px_rgba(254,215,170,0.6)]" },
      { value: "#FECDD3", label: "Rose Petal", glow: "shadow-[0_0_12px_rgba(254,205,211,0.6)]" },
      { value: "#E9D5FF", label: "Lilac Mist", glow: "shadow-[0_0_12px_rgba(233,213,255,0.6)]" },
      { value: "#E2E8F0", label: "Pearl Gray", glow: "shadow-[0_0_12px_rgba(226,232,240,0.6)]" },
    ],
  },
];

const RECENT_COLORS_KEY = "scribe_recent_colors";

export function getRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 6);
    }
  } catch {}
  return ["#F8FAFC", "#38BDF8", "#FDE047", "#4ADE80", "#FB7185"];
}

export function saveRecentColor(color: string): string[] {
  try {
    const current = getRecentColors().filter((c) => c.toLowerCase() !== color.toLowerCase());
    const next = [color, ...current].slice(0, 6);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [color];
  }
}

/** Default favorite pens for initial educator studio setup */
export const DEFAULT_FAVORITE_PENS: FavoritePen[] = [
  {
    id: "fav-1",
    name: "Chalk White Pen",
    style: "pen",
    width: "thin",
    color: "#F8FAFC",
  },
  {
    id: "fav-2",
    name: "Sunbeam Calligraphy",
    style: "fountain",
    width: "medium",
    color: "#FDE047",
  },
  {
    id: "fav-3",
    name: "Cyan Highlighter",
    style: "marker",
    width: "thick",
    color: "#38BDF8",
    isHighlighter: true,
  },
];

const FAVORITE_PENS_KEY = "scribe_favorite_pens";

export function loadFavoritePens(): FavoritePen[] {
  try {
    const raw = localStorage.getItem(FAVORITE_PENS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3);
      }
    }
  } catch {}
  return DEFAULT_FAVORITE_PENS;
}

export function saveFavoritePens(pens: FavoritePen[]) {
  try {
    localStorage.setItem(FAVORITE_PENS_KEY, JSON.stringify(pens));
  } catch {}
}
