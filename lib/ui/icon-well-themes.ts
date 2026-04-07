/**
 * Paired classes: soft tinted well + icon color. Use for small icon badges only.
 */
export const ICON_WELL_THEMES = [
  {
    key: "sky",
    well: "border border-sky-500/30 bg-sky-500/12 dark:border-sky-400/35 dark:bg-sky-400/15",
    icon: "text-sky-600 dark:text-sky-300",
  },
  {
    key: "violet",
    well: "border border-violet-500/30 bg-violet-500/12 dark:border-violet-400/35 dark:bg-violet-400/15",
    icon: "text-violet-600 dark:text-violet-300",
  },
  {
    key: "emerald",
    well: "border border-emerald-500/30 bg-emerald-500/12 dark:border-emerald-400/35 dark:bg-emerald-400/15",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  {
    key: "amber",
    well: "border border-amber-500/35 bg-amber-500/12 dark:border-amber-400/40 dark:bg-amber-400/15",
    icon: "text-amber-700 dark:text-amber-300",
  },
  {
    key: "rose",
    well: "border border-rose-500/30 bg-rose-500/12 dark:border-rose-400/35 dark:bg-rose-400/15",
    icon: "text-rose-600 dark:text-rose-300",
  },
  {
    key: "cyan",
    well: "border border-cyan-500/30 bg-cyan-500/12 dark:border-cyan-400/35 dark:bg-cyan-400/15",
    icon: "text-cyan-700 dark:text-cyan-300",
  },
  {
    key: "fuchsia",
    well: "border border-fuchsia-500/30 bg-fuchsia-500/12 dark:border-fuchsia-400/35 dark:bg-fuchsia-400/15",
    icon: "text-fuchsia-600 dark:text-fuchsia-300",
  },
] as const;

export type IconWellTheme = (typeof ICON_WELL_THEMES)[number];

export function iconWellThemeAt(index: number): IconWellTheme {
  const n = ICON_WELL_THEMES.length;
  return ICON_WELL_THEMES[((index % n) + n) % n]!;
}
