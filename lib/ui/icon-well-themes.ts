/**
 * Paired classes: soft neutral well + icon color.
 * Kept as an array for call-site indexing; all entries share the same minimal look.
 */
const minimal = {
  key: "minimal",
  well: "border border-border/80 bg-muted/50 dark:bg-muted/35",
  icon: "text-foreground/75 dark:text-foreground/80",
} as const;

export const ICON_WELL_THEMES = [
  minimal,
  minimal,
  minimal,
  minimal,
  minimal,
  minimal,
  minimal,
] as const;

export type IconWellTheme = (typeof ICON_WELL_THEMES)[number];

export function iconWellThemeAt(index: number): IconWellTheme {
  const n = ICON_WELL_THEMES.length;
  return ICON_WELL_THEMES[((index % n) + n) % n]!;
}
