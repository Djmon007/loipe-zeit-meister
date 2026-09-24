import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Fuel, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { getSeasonDates, getSeasonLabel } from '@/lib/seasonUtils';
import { useSeasons } from '@/hooks/useSeasons';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
}

interface DieselEntry {
  id: string;
  user_id: string;
  datum: string;
  tank: string;
  liter: number;
  profiles?: Profile;
}

type FilterType = 'week' | 'month' | 'season' | 'custom';

export default function AdminDiesel() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<DieselEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedSeason, setSelectedSeason] = useState(() => getSeasonLabel(new Date()));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedTank, setSelectedTank] = useState<string>('all');

  const { seasonLabels: availableSeasons } = useSeasons();

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
      .from('diesel_entries')
      .select('*')
      .gte('datum', fromDate)
      .lte('datum', toDate)
      .order('datum', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    if (selectedTank !== 'all') {
      query = query.eq('tank', selectedTank as 'Tank Nidfurn' | 'Tank Hätzingen');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching diesel:', error);
      setLoading(false);
      return;
    }

    const entriesWithProfiles = (data || []).map(entry => ({
      ...entry,
      profiles: (profilesData || []).find(p => p.user_id === entry.user_id),
    }));

    setEntries(entriesWithProfiles);
    setLoading(false);
  }, [filterType, selectedSeason, startDate, endDate, selectedUser, selectedTank]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (entries.length === 0) {
      toast({ title: 'Keine Daten', description: 'Keine Einträge für diesen Zeitraum gefunden' });
      return;
    }

    const headers = ['Datum', 'Mitarbeiter', 'Tank', 'Liter'];
    const rows = entries.map((entry) => {
      const name = entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt';
      return [format(new Date(entry.datum), 'dd.MM.yyyy'), name, entry.tank, entry.liter.toString()];
    });

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diesel_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: 'Export erfolgreich', description: 'CSV-Datei wurde heruntergeladen' });
  };

  const totalLiter = entries.reduce((sum, e) => sum + Number(e.liter), 0);
  const tankNidfurn = entries.filter(e => e.tank === 'Tank Nidfurn').reduce((sum, e) => sum + Number(e.liter), 0);
  const tankHaetzingen = entries.filter(e => e.tank === 'Tank Hätzingen').reduce((sum, e) => sum + Number(e.liter), 0);

  return (
    <AdminLayout title="Diesel">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold">{totalLiter.toFixed(0)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tank Nidfurn</p>
              <p className="text-2xl font-semibold">{tankNidfurn.toFixed(0)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tank Hätzingen</p>
              <p className="text-2xl font-semibold">{tankHaetzingen.toFixed(0)} L</p>
            </CardContent>
          </Card>
        </div>

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
                <Label className="text-xs">Tank</Label>
                <Select value={selectedTank} onValueChange={setSelectedTank}>
                  <SelectTrigger><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="Tank Nidfurn">Tank Nidfurn</SelectItem>
                    <SelectItem value="Tank Hätzingen">Tank Hätzingen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" />
            <span className="font-medium">{entries.length} Tankungen</span>
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
                    <TableHead>Tank</TableHead>
                    <TableHead className="text-right">Liter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Keine Einträge gefunden</TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>{entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt'}</TableCell>
                        <TableCell>{entry.tank}</TableCell>
                        <TableCell className="text-right font-medium">{entry.liter} L</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
