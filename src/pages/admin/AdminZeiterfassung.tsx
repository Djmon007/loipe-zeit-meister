import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Clock, Calendar, Pencil } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { getSeasonDates, getSeasonLabel } from '@/lib/seasonUtils';
import { useSeasons } from '@/hooks/useSeasons';
import { parseHoursAndMinutes, formatHoursAndMinutes } from '@/lib/timeUtils';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
}

type WorkType = string;

interface TimeEntry {
  id: string;
  user_id: string;
  datum: string;
  arbeit: WorkType;
  start_zeit: string | null;
  stopp_zeit: string | null;
  total_stunden: number | null;
  profiles?: Profile;
}

type FilterType = 'week' | 'month' | 'season' | 'custom';

export default function AdminZeiterfassung() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedSeason, setSelectedSeason] = useState(() => getSeasonLabel(new Date()));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [tasks, setTasks] = useState<string[]>([]);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [editDatum, setEditDatum] = useState('');
  const [editArbeit, setEditArbeit] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editStopp, setEditStopp] = useState('');
  const [editDauer, setEditDauer] = useState('');
  const [saving, setSaving] = useState(false);

  const { seasonLabels: availableSeasons } = useSeasons();

  useEffect(() => {
    supabase.from('tasks').select('name').order('name').then(({ data }) => {
      setTasks((data || []).map((t) => t.name));
    });
  }, []);

  const openEdit = (entry: TimeEntry) => {
    setEditing(entry);
    setEditDatum(entry.datum);
    setEditArbeit(entry.arbeit);
    setEditStart(entry.start_zeit?.substring(0, 5) || '');
    setEditStopp(entry.stopp_zeit?.substring(0, 5) || '');
    setEditDauer(formatHoursAndMinutes(entry.total_stunden));
  };

  const isManual = editing ? !editing.start_zeit && !editing.stopp_zeit : false;

  const saveEdit = async () => {
    if (!editing) return;
    let total: number | null;
    const update: { datum: string; arbeit: string; start_zeit?: string; stopp_zeit?: string; total_stunden?: number } = { datum: editDatum, arbeit: editArbeit };
    if (isManual) {
      total = parseHoursAndMinutes(editDauer);
      if (total === null) {
        toast({ title: 'Ungültige Dauer', description: 'Bitte im Format HH:MM eingeben', variant: 'destructive' });
        return;
      }
    } else {
      if (!editStart || !editStopp) {
        toast({ title: 'Fehlende Zeit', description: 'Start und Stopp angeben', variant: 'destructive' });
        return;
      }
      const [sh, sm] = editStart.split(':').map(Number);
      const [eh, em] = editStopp.split(':').map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      total = Math.round((mins / 60) * 100) / 100;
      update.start_zeit = editStart;
      update.stopp_zeit = editStopp;
    }
    update.total_stunden = total;
    setSaving(true);
    const { error } = await supabase.from('time_entries').update(update).eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Gespeichert', description: 'Eintrag wurde aktualisiert' });
    setEditing(null);
    fetchData();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    let fromDate = startDate;
    let toDate = endDate;

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
    
    const { data: profilesData } = await supabase.from('profiles').select('*');
    setProfiles(profilesData || []);

    let query = supabase
      .from('time_entries')
      .select('*')
      .gte('datum', fromDate)
      .lte('datum', toDate)
      .order('datum', { ascending: false })
      .order('start_zeit', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    if (selectedProject !== 'all') {
      query = query.eq('arbeit', selectedProject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching entries:', error);
      setLoading(false);
      return;
    }

    const entriesWithProfiles = (data || []).map(entry => ({
      ...entry,
      arbeit: entry.arbeit as WorkType,
      profiles: (profilesData || []).find(p => p.user_id === entry.user_id),
    }));

    setEntries(entriesWithProfiles);
    setLoading(false);
  }, [filterType, selectedSeason, startDate, endDate, selectedUser, selectedProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (entries.length === 0) {
      toast({ title: 'Keine Daten', description: 'Keine Einträge für diesen Zeitraum gefunden' });
      return;
    }

    const headers = ['Datum', 'Mitarbeiter', 'Projekt', 'Start', 'Stopp', 'Stunden'];
    const rows = entries.map((entry) => {
      const name = entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt';
      return [
        format(new Date(entry.datum), 'dd.MM.yyyy'),
        name,
        entry.arbeit,
        entry.start_zeit?.substring(0, 5) || '',
        entry.stopp_zeit?.substring(0, 5) || '',
        entry.total_stunden?.toFixed(2) || '',
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arbeitszeit_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: 'Export erfolgreich', description: 'CSV-Datei wurde heruntergeladen' });
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.total_stunden || 0), 0);

  return (
    <AdminLayout title="Arbeitszeit">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableSeasons.map((season) => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Von</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bis</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Mitarbeiter</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.vorname} {p.nachname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Projekt</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{entries.length} Einträge</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold text-primary">{totalHours.toFixed(1)} Stunden</span>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            CSV Export
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Stopp</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Einträge gefunden</TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>{entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt'}</TableCell>
                        <TableCell>{entry.arbeit}</TableCell>
                        <TableCell>{entry.start_zeit?.substring(0, 5) || '–'}</TableCell>
                        <TableCell>{entry.stopp_zeit?.substring(0, 5) || '–'}</TableCell>
                        <TableCell className="text-right font-medium">{entry.total_stunden?.toFixed(1) || '–'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => openEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={editDatum} onChange={(e) => setEditDatum(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Projekt</Label>
              <Select value={editArbeit} onValueChange={setEditArbeit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([editArbeit, ...tasks])).filter(Boolean).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isManual ? (
              <div className="space-y-2">
                <Label>Stunden (HH:MM)</Label>
                <Input placeholder="02:30" value={editDauer} onChange={(e) => setEditDauer(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Stopp</Label>
                  <Input type="time" value={editStopp} onChange={(e) => setEditStopp(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
