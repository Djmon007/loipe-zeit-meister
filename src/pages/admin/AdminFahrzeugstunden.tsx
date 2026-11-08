import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSeasons } from '@/hooks/useSeasons';
import { getSeasonDates, getSeasonLabel } from '@/lib/seasonUtils';
import { Download, Gauge } from 'lucide-react';
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

type FilterType = 'week' | 'month' | 'season' | 'custom';

interface Profile {
  user_id: string;
  vorname: string;
  nachname: string;
}

interface VehicleHoursEntry {
  id: string;
  user_id: string;
  datum: string;
  betriebsstunden: number;
}

export default function AdminFahrzeugstunden() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<VehicleHoursEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedSeason, setSelectedSeason] = useState(getSeasonLabel(new Date()));
  const [selectedUser, setSelectedUser] = useState('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [currentReading, setCurrentReading] = useState<{ datum: string; betriebsstunden: number } | null>(null);
  const { seasonLabels } = useSeasons();

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

    const [{ data: people, error: peopleError }, { data, error }, { data: readingData }] = await Promise.all([
      supabase.from('profiles').select('user_id, vorname, nachname').order('nachname'),
      supabase.from('vehicle_hours_entries').select('id, user_id, datum, betriebsstunden')
        .gte('datum', fromDate).lte('datum', toDate)
        .order('datum', { ascending: false }).order('created_at', { ascending: false }),
      supabase.rpc('get_current_vehicle_hours'),
    ]);
    if (peopleError || error) {
      toast({ title: 'Daten nicht geladen', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    setProfiles((people || []) as Profile[]);
    const latestReading = readingData?.[0];
    setCurrentReading(latestReading ? { datum: latestReading.datum, betriebsstunden: Number(latestReading.betriebsstunden) } : null);
    const profileByUser = new Map((people || []).map((profile) => [profile.user_id, profile]));
    const filtered = (data || []) as VehicleHoursEntry[];
    setEntries(filtered.filter((entry) => selectedUser === 'all' || entry.user_id === selectedUser)
      .sort((a, b) => b.datum.localeCompare(a.datum))
      .map((entry) => ({ ...entry, betriebsstunden: Number(entry.betriebsstunden), _profile: profileByUser.get(entry.user_id) })) as VehicleHoursEntry[]);
    setLoading(false);
  }, [filterType, selectedSeason, selectedUser, startDate, endDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (!entries.length) {
      toast({ title: 'Keine Daten', description: 'Für den gewählten Zeitraum gibt es keine Einträge.' });
      return;
    }
    const rows = entries.map((entry) => {
      const person = profiles.find((profile) => profile.user_id === entry.user_id);
      const fullName = person ? `${person.vorname} ${person.nachname}` : 'Unbekannt';
      return [format(parseISO(entry.datum), 'dd.MM.yyyy'), fullName, Number(entry.betriebsstunden).toFixed(1)];
    });
    const content = [['Datum', 'Mitarbeiter', 'Fahrzeugstunden'], ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Fahrzeugstunden_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Fahrzeugstunden">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" /> Filter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'season', 'custom'] as FilterType[]).map((type) => (
                <Button key={type} size="sm" variant={filterType === type ? 'default' : 'outline'} onClick={() => setFilterType(type)}>
                  {type === 'week' ? 'Diese Woche' : type === 'month' ? 'Dieser Monat' : type === 'season' ? 'Diese Saison' : 'Zeitraum'}
                </Button>
              ))}
            </div>
            {filterType === 'season' && (
              <div className="max-w-sm space-y-2"><Label>Saison</Label><Select value={selectedSeason} onValueChange={setSelectedSeason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{seasonLabels.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}</SelectContent></Select></div>
            )}
            {filterType === 'custom' && (
              <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Von</Label><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>Bis</Label><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
              </div>
            )}
            <div className="max-w-sm space-y-2">
              <Label>Mitarbeiter</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {profiles.map((profile) => <SelectItem key={profile.user_id} value={profile.user_id}>{profile.vorname} {profile.nachname}</SelectItem>)}
              </SelectContent></Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{entries.length} Einträge</p>
            {currentReading && <p className="text-sm">Fahrzeugstunden aktuell: <span className="font-semibold">{currentReading.betriebsstunden.toFixed(1)} h</span> · Stand vom {format(parseISO(currentReading.datum), 'dd.MM.yyyy')}</p>}
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> CSV Export</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Mitarbeiter</TableHead><TableHead className="text-right">Fahrzeugstunden</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Laden...</TableCell></TableRow>
                    : entries.length === 0 ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Keine Einträge gefunden</TableCell></TableRow>
                      : entries.map((entry) => {
                        const profile = profiles.find((person) => person.user_id === entry.user_id);
                        return <TableRow key={entry.id}><TableCell>{format(parseISO(entry.datum), 'dd.MM.yyyy', { locale: de })}</TableCell><TableCell>{profile ? `${profile.vorname} ${profile.nachname}` : 'Unbekannt'}</TableCell><TableCell className="text-right font-medium">{Number(entry.betriebsstunden).toFixed(1)} h</TableCell></TableRow>;
                      })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}