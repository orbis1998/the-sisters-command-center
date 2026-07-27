import { supabase } from "@/lib/supabase-client";

/** Logo principal du site (og:image, apple-touch-icon) — pas le monogramme TS du header. */
const OFFICIAL_LOGO_PATH = "/logo.png";
const STORAGE_LOGO_PREFIX = "logo";

export async function fetchSiteLogoUrl(): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";

  const [{ data: settings }, { data: storageFiles }] = await Promise.all([
    supabase.from("site_settings").select("site_url, og_image_url").maybeSingle(),
    supabase.storage.from("site-assets").list(STORAGE_LOGO_PREFIX, {
      limit: 5,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ]);

  const siteUrl = settings?.site_url?.replace(/\/$/, "") || "https://thesistersafrica.com";

  if (settings?.og_image_url) {
    return settings.og_image_url;
  }

  const storageLogo = storageFiles?.find((file) => file.name && !file.name.endsWith("/"));
  if (storageLogo && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/site-assets/${STORAGE_LOGO_PREFIX}/${storageLogo.name}`;
  }

  return `${siteUrl}${OFFICIAL_LOGO_PATH}`;
}
