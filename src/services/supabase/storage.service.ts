/**
 * Supabase Storage helpers for the `event-covers` bucket.
 */
import { getSupabaseBrowser } from "@/lib/supabase/client";

export const EVENT_COVERS_BUCKET = "event-covers";

export async function uploadEventCover(
  path: string,
  file: File,
  opts?: { upsert?: boolean },
) {
  const supabase = getSupabaseBrowser();
  return supabase.storage
    .from(EVENT_COVERS_BUCKET)
    .upload(path, file, { upsert: opts?.upsert ?? true, contentType: file.type });
}

export function getEventCoverPublicUrl(path: string): string {
  const supabase = getSupabaseBrowser();
  return supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function deleteEventCover(path: string) {
  const supabase = getSupabaseBrowser();
  return supabase.storage.from(EVENT_COVERS_BUCKET).remove([path]);
}
