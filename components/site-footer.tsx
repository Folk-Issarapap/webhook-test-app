import { APP_DISPLAY_NAME, APP_FOOTER_TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-border mt-auto border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
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
