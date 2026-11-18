import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getReceiptUrl } from '@/lib/receiptUrl';

export function ReceiptViewer({ reference }: { reference: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  const viewReceipt = async () => {
    setLoading(true);
    setImageError(false);
    try {
      setUrl(await getReceiptUrl(reference));
      setOpen(true);
    } catch {
      toast({ title: 'Fehler', description: 'Beleg konnte nicht geladen werden. Bitte versuchen Sie es erneut.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1 h-8" onClick={viewReceipt} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
        Ansehen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Beleg</DialogTitle></DialogHeader>
          {/\.pdf(?:[?#]|$)/i.test(reference) ? (
            <iframe src={url} title="Beleg PDF" className="w-full h-96 rounded border border-border" />
          ) : imageError ? (
            <p className="text-sm text-muted-foreground">Keine Bildvorschau verfügbar. Bitte öffnen Sie die Datei.</p>
          ) : (
            <img src={url} alt="Beleg" className="w-full max-h-[65dvh] object-contain rounded" onError={() => setImageError(true)} />
          )}
          <Button variant="outline" asChild className="gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Datei öffnen</a>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}