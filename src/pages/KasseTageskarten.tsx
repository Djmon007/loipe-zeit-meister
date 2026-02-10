import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface KasseEntry {
  id: string;
  datum: string;
  betrag: number;
  beschreibung: string | null;
}

export default function KasseTageskarten() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<KasseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [beschreibung, setBeschreibung] = useState('');
  const [betrag, setBetrag] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KasseEntry | null>(null);
  const [editBetrag, setEditBetrag] = useState('');
  const [editBeschreibung, setEditBeschreibung] = useState('');
  const [editDate, setEditDate] = useState('');

  const total = entries.reduce((sum, e) => sum + e.betrag, 0);

  const fetchEntries = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('kasse_tageskarten')
      .select('id, datum, betrag, beschreibung')
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching kasse entries:', error);
      return;
    }

    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const saveEntry = async () => {
    if (!user || !betrag) {
      toast({ title: 'Fehler', description: 'Bitte Betrag eingeben', variant: 'destructive' });
      return;
    }

    const betragValue = parseFloat(betrag);
    if (isNaN(betragValue) || betragValue <= 0) {
      toast({ title: 'Fehler', description: 'Bitte gültigen Betrag eingeben', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('kasse_tageskarten').insert({
      user_id: user.id,
      datum: selectedDate,
      betrag: betragValue,
      beschreibung: beschreibung || null,
    });

    setSaving(false);

    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gespeichert werden', variant: 'destructive' });
      return;
    }

    setBeschreibung('');
    setBetrag('');
    fetchEntries();
    toast({ title: 'Gespeichert', description: 'Tageskarten-Einnahme erfasst' });
  };

  const openEditDialog = (entry: KasseEntry) => {
    setEditingEntry(entry);
    setEditBetrag(entry.betrag.toString());
    setEditBeschreibung(entry.beschreibung || '');
    setEditDate(entry.datum);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingEntry || !editBetrag) return;

    const betragValue = parseFloat(editBetrag);
    if (isNaN(betragValue) || betragValue <= 0) {
      toast({ title: 'Fehler', description: 'Bitte gültigen Betrag eingeben', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('kasse_tageskarten')
      .update({
        betrag: betragValue,
        beschreibung: editBeschreibung || null,
        datum: editDate,
      })
      .eq('id', editingEntry.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht aktualisiert werden', variant: 'destructive' });
      return;
    }

    setEditDialogOpen(false);
    setEditingEntry(null);
    fetchEntries();
    toast({ title: 'Aktualisiert', description: 'Eintrag wurde geändert' });
  };

  return (
    <AppLayout title="Kasse Tageskarten">
      <div className="space-y-6">
        {/* Total Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Letzte Einnahmen</p>
                <p className="text-xl font-semibold">Total: CHF {total.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entry Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Betrag erfassen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-alpine" />
            </div>

            <div className="space-y-2">
              <Label>Betrag (CHF)</Label>
              <Input type="number" step="0.05" min="0" placeholder="0.00" value={betrag} onChange={(e) => setBetrag(e.target.value)} className="input-alpine" />
            </div>

            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea placeholder="z.B. Tageskarten, Abonnements..." value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} className="input-alpine resize-none" rows={2} />
            </div>

            <Button onClick={saveEntry} disabled={saving || !betrag} className="w-full">
              {saving ? 'Speichern...' : 'Betrag speichern'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Einnahmen</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Laden...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Einträge vorhanden</p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.beschreibung || 'Tageskarten'}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}</span>
                        <span className="font-medium text-foreground">CHF {entry.betrag.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eintrag bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input-alpine" />
              </div>
              <div className="space-y-2">
                <Label>Betrag (CHF)</Label>
                <Input type="number" step="0.05" min="0" value={editBetrag} onChange={(e) => setEditBetrag(e.target.value)} className="input-alpine" />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={editBeschreibung} onChange={(e) => setEditBeschreibung(e.target.value)} className="input-alpine resize-none" rows={2} />
              </div>
              <Button onClick={saveEdit} disabled={saving || !editBetrag} className="w-full">
                {saving ? 'Speichern...' : 'Änderungen speichern'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
