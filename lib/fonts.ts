import { Geist_Mono, Kanit, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Latin UI: Plus Jakarta Sans.
 * Thai: Kanit — modern loopless / “ไม่มีหัว” feel (geometric, common in Thai product UI).
 * Mono: Geist Mono.
 */
export const fontSansLatin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-jakarta",
  display: "swap",
});

export const fontSansThai = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-kanit",
  display: "swap",
});

export const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-geist",
  display: "swap",
});
