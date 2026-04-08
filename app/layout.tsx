import "./globals.css";

type Props = {
  children: React.ReactNode;
};

/** Root shell — `<html>` / `<body>` live in `app/[locale]/layout.tsx` for `lang` and i18n. */
export default function RootLayout({ children }: Props) {
  return children;
}
