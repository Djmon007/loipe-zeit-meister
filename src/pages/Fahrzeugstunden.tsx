import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isVehicleHoursNondecreasing, parseVehicleHours } from '@/lib/vehicleHours';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Gauge, Loader2, Pencil, Trash2 } from 'lucide-react';

interface VehicleEntry {
  id: string;
  datum: string;
  betriebsstunden: number;
}

interface CurrentReading {
  datum: string;
  betriebsstunden: number;
}

export default function Fahrzeugstunden() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [datum, setDatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reading, setReading] = useState('');
  const [current, setCurrent] = useState<CurrentReading | null>(null);
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VehicleEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReading, setEditReading] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data, error }, { data: currentData }] = await Promise.all([
      supabase.from('vehicle_hours_entries').select('id, datum, betriebsstunden').eq('user_id', user.id).order('datum', { ascending: false }).order('created_at', { ascending: false }).limit(15),
      supabase.rpc('get_current_vehicle_hours'),
    ]);
    if (error) {
      toast({ title: 'Einträge nicht geladen', description: 'Bitte laden Sie die Seite erneut.', variant: 'destructive' });
    } else {
      setEntries((data || []) as VehicleEntry[]);
    }
    const latest = currentData?.[0];
    setCurrent(latest ? { datum: latest.datum, betriebsstunden: Number(latest.betriebsstunden) } : null);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async () => {
    if (!user) return;
    const hours = parseVehicleHours(reading);
    if (hours === null) {
      toast({ title: 'Ungültiger Zählerstand', description: 'Bitte eine gültige Zahl ab null eingeben.', variant: 'destructive' });
      return;
    }
    if (!isVehicleHoursNondecreasing(current?.betriebsstunden ?? null, hours)) {
      toast({ title: 'Zählerstand zu niedrig', description: `Der letzte bekannte Stand beträgt ${current.betriebsstunden.toFixed(1)} h.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('vehicle_hours_entries').insert({
      user_id: user.id,
      datum,
      betriebsstunden: hours,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Eintrag nicht gespeichert', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      return;
    }
    setReading('');
    toast({ title: 'Gespeichert', description: 'Fahrzeugstunden wurden eingetragen.' });
    await fetchEntries();
  };

  const openEditDialog = (entry: VehicleEntry) => {
    setEditingEntry(entry);
    setEditDate(entry.datum);
    setEditReading(String(entry.betriebsstunden).replace('.', ','));
  };

  const saveEdit = async () => {
    if (!editingEntry || !user) return;
    const hours = parseVehicleHours(editReading);
    if (hours === null) {
      toast({ title: 'Ungültiger Zählerstand', description: 'Bitte eine gültige Zahl ab null eingeben.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('vehicle_hours_entries')
      .update({ datum: editDate, betriebsstunden: hours })
      .eq('id', editingEntry.id)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Eintrag nicht aktualisiert', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      return;
    }
    setEditingEntry(null);
    toast({ title: 'Aktualisiert', description: 'Fahrzeugstunden wurden geändert.' });
    await fetchEntries();
  };

  const deleteEntry = async () => {
    if (!editingEntry || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('vehicle_hours_entries')
      .delete()
      .eq('id', editingEntry.id)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Eintrag nicht gelöscht', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      return;
    }
    setEditingEntry(null);
    toast({ title: 'Gelöscht', description: 'Fahrzeugstunden-Eintrag wurde entfernt.' });
    await fetchEntries();
  };

  return (
    <AppLayout title="Fahrzeugstunden">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5 text-primary" /> Fahrzeugstunden</CardTitle>
            <CardDescription>Den abgelesenen Zählerstand nach jeder Nutzung eintragen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Fahrzeugstunden aktuell</p>
              <p className="text-3xl font-semibold">{current ? `${current.betriebsstunden.toFixed(1)} h` : 'Noch kein Eintrag'}</p>
              {current && <p className="mt-1 text-xs text-muted-foreground">Stand vom {format(parseISO(current.datum), 'dd.MM.yyyy', { locale: de })}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="vehicle-date">Datum</Label><Input id="vehicle-date" type="date" value={datum} onChange={(event) => setDatum(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="vehicle-hours">Fahrzeugstunden</Label><Input id="vehicle-hours" type="text" inputMode="decimal" placeholder="z. B. 1042,2" value={reading} onChange={(event) => setReading(event.target.value)} /></div>
            </div>
            <Button onClick={addEntry} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eintrag hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Meine letzten Einträge</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Zählerstand</TableHead><TableHead className="w-12"><span className="sr-only">Aktionen</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Laden...</TableCell></TableRow>
                    : entries.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Noch keine Einträge</TableCell></TableRow>
                      : entries.map((entry) => <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>{[profile?.vorname, profile?.nachname].filter(Boolean).join(' ') || user?.email || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{Number(entry.betriebsstunden).toFixed(1)} h</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)} aria-label="Eintrag bearbeiten" title="Eintrag bearbeiten">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => { if (!open && !saving) setEditingEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fahrzeugstunden bearbeiten</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="edit-vehicle-date">Datum</Label><Input id="edit-vehicle-date" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vehicle-hours">Zählerstand</Label><Input id="edit-vehicle-hours" type="text" inputMode="decimal" value={editReading} onChange={(event) => setEditReading(event.target.value)} /></div>
          </div>
          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="gap-2" disabled={saving}>
                  <Trash2 className="h-4 w-4" /> Eintrag löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                  <AlertDialogDescription>Dieser Fahrzeugstunden-Eintrag wird unwiderruflich gelöscht.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteEntry}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" variant="outline" onClick={() => setEditingEntry(null)} disabled={saving}>Abbrechen</Button>
            <Button type="button" onClick={saveEdit} disabled={saving || !editDate}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}