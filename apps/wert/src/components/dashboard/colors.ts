export type HSLColor = { h: number; s: number; l: number };

export const CATEGORY_COLORS: Record<string, HSLColor> = {
  'CASH': { h: 217, s: 91, l: 60 },      // Blue
  'STOCK': { h: 38, s: 92, l: 50 },      // Amber
  'FUND': { h: 262, s: 83, l: 58 },      // Violet
  'BOND': { h: 190, s: 90, l: 50 },      // Cyan
  'CRYPTO': { h: 280, s: 70, l: 60 },    // Purple
  'REAL_ESTATE': { h: 147, s: 50, l: 47 },// Green - NOT Emerald to differentiate? Or user Emerald. Let's use darker green.
  'VEHICLE': { h: 0, s: 84, l: 60 },     // Red (or pink?)
  'PRECIOUS_METAL': { h: 50, s: 100, l: 50 }, // Gold (Yellow)
  'COLLECTIBLE': { h: 300, s: 76, l: 72 }, // Pink
  'LIABILITY': { h: 0, s: 0, l: 40 },    // Grey
  'OTHER': { h: 200, s: 10, l: 50 },     // Slate
};

// Fallback list if key not found
export const FALLBACK_COLORS = Object.values(CATEGORY_COLORS);

export function getCategoryColor(category: string): HSLColor {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['OTHER'];
}

export function hslToString(c: HSLColor): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}
