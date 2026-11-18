import { supabase } from '@/integrations/supabase/client';

export async function getReceiptUrl(reference: string): Promise<string> {
  let path = reference;
  if (/^https?:\/\//i.test(reference)) {
    const url = new URL(reference);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/belege\/(.+)$/);
    if (!match) return reference;
    path = decodeURIComponent(match[1]);
  }

  const { data, error } = await supabase.storage.from('belege').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error('Receipt could not be loaded');
  return data.signedUrl;
}