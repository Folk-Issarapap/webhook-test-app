import { APP_DISPLAY_NAME, APP_FOOTER_TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/40 bg-zinc-50/50 dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-10 md:py-14">
        <p className="text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed text-pretty">
          <span className="text-foreground font-semibold">
            {APP_DISPLAY_NAME}
          </span>{" "}
          {APP_FOOTER_TAGLINE}
        </p>
      </div>
    </footer>
  );
}
