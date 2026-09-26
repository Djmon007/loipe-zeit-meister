import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Banknote, Download, Calendar, Pencil, Trash2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { getSeasonDates, getSeasonLabel } from '@/lib/seasonUtils';
import { useSeasons } from '@/hooks/useSeasons';

interface KasseEntry {
  id: string;
  datum: string;
  betrag: number;
  beschreibung: string | null;
  beleg_url: string | null;
  user_id: string;
  profiles?: { vorname: string; nachname: string };
}

type FilterType = 'week' | 'month' | 'season' | 'custom';

export default function AdminKasse() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<KasseEntry[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; user_id: string; vorname: string; nachname: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedSeason, setSelectedSeason] = useState(() => getSeasonLabel(new Date()));
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Edit dialog state
  const [editing, setEditing] = useState<KasseEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBetrag, setEditBetrag] = useState('');
  const [editBeschreibung, setEditBeschreibung] = useState('');

  const { seasonLabels: availableSeasons } = useSeasons();

  const fetchData = useCallback(async () => {
    setLoading(true);

    let fromDate = dateFrom;
    let toDate = dateTo;

    if (filterType === 'week') {
      fromDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      toDate = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (filterType === 'month') {
      fromDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      toDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    } else if (filterType === 'season') {
      const seasonDates = getSeasonDates(selectedSeason);
      fromDate = seasonDates.start;
      toDate = seasonDates.end;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, user_id, vorname, nachname');
    setProfiles(profilesData || []);

    let query = supabase
      .from('kasse_tageskarten')
      .select('*')
      .gte('datum', fromDate)
      .lte('datum', toDate)
      .order('datum', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching kasse entries:', error);
    }

    const entriesWithProfiles = (data || []).map(entry => ({
      ...entry,
      profiles: profilesData?.find(p => p.user_id === entry.user_id),
    }));

    setEntries(entriesWithProfiles);
    setLoading(false);
  }, [filterType, selectedSeason, dateFrom, dateTo, selectedUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEdit = (entry: KasseEntry) => {
    setEditing(entry);
    setEditDate(entry.datum);
    setEditBetrag(entry.betrag.toString());
    setEditBeschreibung(entry.beschreibung || '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const value = parseFloat(editBetrag);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Fehler', description: 'Bitte gültigen Betrag eingeben', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('kasse_tageskarten')
      .update({
        betrag: value,
        beschreibung: editBeschreibung || null,
        datum: editDate,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht aktualisiert werden', variant: 'destructive' });
      return;
    }
    toast({ title: 'Aktualisiert', description: 'Eintrag wurde geändert' });
    setEditing(null);
    fetchData();
  };

  const deleteEntry = async () => {
    if (!editing) return;
    const { error } = await supabase.from('kasse_tageskarten').delete().eq('id', editing.id);
    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden', variant: 'destructive' });
      return;
    }
    toast({ title: 'Gelöscht', description: 'Eintrag wurde entfernt' });
    setEditing(null);
    fetchData();
  };

  const total = entries.reduce((sum, e) => sum + e.betrag, 0);

  const exportCSV = () => {
    const headers = ['Datum', 'Mitarbeiter', 'Betrag', 'Beschreibung'];
    const rows = entries.map(e => [
      format(new Date(e.datum), 'dd.MM.yyyy'),
      e.profiles ? `${e.profiles.vorname} ${e.profiles.nachname}` : 'Unbekannt',
      `CHF ${e.betrag.toFixed(2)}`,
      e.beschreibung || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kasse-tageskarten-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <AdminLayout title="Kasse Tageskarten">
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{entries.length} Einträge</p>
                <p className="text-2xl font-bold">CHF {total.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'season', 'custom'] as FilterType[]).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'week' && 'Diese Woche'}
                  {type === 'month' && 'Dieser Monat'}
                  {type === 'season' && 'Diese Saison'}
                  {type === 'custom' && 'Zeitraum'}
                </Button>
              ))}
            </div>

            {filterType === 'season' && (
              <div className="space-y-2">
                <Label>Saison</Label>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSeasons.map((season) => (
                      <SelectItem key={season} value={season}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Von</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bis</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.vorname} {profile.nachname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{entries.length} Einträge</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV Export
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground">Keine Einträge gefunden</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Beleg</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        {entry.profiles
                          ? `${entry.profiles.vorname} ${entry.profiles.nachname}`
                          : 'Unbekannt'}
                      </TableCell>
                      <TableCell className="font-medium">
                        CHF {entry.betrag.toFixed(2)}
                      </TableCell>
                      <TableCell>{entry.beschreibung || '-'}</TableCell>
                      <TableCell>
                        {entry.beleg_url ? (
                          <a
                            href={entry.beleg_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Ansehen
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => openEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Betrag (CHF)</Label>
              <Input type="number" step="0.05" min="0" value={editBetrag} onChange={(e) => setEditBetrag(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={editBeschreibung} onChange={(e) => setEditBeschreibung(e.target.value)} className="resize-none" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Abbrechen</Button>
              <Button className="flex-1" onClick={saveEdit} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2"><Trash2 className="h-4 w-4" /> Eintrag löschen</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                  <AlertDialogDescription>Dieser Eintrag wird unwiderruflich gelöscht.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteEntry}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
