import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Previous URL — forwards to the unified home; query preserved for deep links. */
export default async function Theme2Redirect({ searchParams }: PageProps) {
  const raw = (await searchParams) ?? {};
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(raw)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) q.append(key, v);
    } else {
      q.set(key, val);
    }
  }
  const qs = q.toString();
  redirect(qs ? `/?${qs}` : "/");
}
