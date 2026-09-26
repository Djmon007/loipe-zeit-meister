import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Filter, MapPin, Trash2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { getSeasonDates } from '@/lib/seasonUtils';
import { useSeasons } from '@/hooks/useSeasons';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
}

interface LoipeConfig {
  id: string;
  name: string;
  has_skating: boolean;
  has_klassisch: boolean;
  has_skipiste: boolean;
  sort_order: number;
}

interface ProtokollRow {
  user_id: string;
  datum: string;
  profileName: string;
  loipen: { name: string; type: string }[];
}

export default function AdminLoipen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProtokollRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loipenConfig, setLoipenConfig] = useState<LoipeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState('');

  const { seasonLabels: availableSeasons } = useSeasons();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('loipen_config').select('id, name, has_skating, has_klassisch, has_skipiste, sort_order').order('sort_order');
      if (data) setLoipenConfig(data);
    };
    fetchConfig();
  }, []);

  const fetchData = useCallback(async () => {
    if (loipenConfig.length === 0) return;
    setLoading(true);
    
    const { data: profilesData } = await supabase.from('profiles').select('*');
    setProfiles(profilesData || []);

    let query = supabase
      .from('loipen_protokoll_entries')
      .select('user_id, datum, loipe_config_id, skating, klassisch')
      .gte('datum', startDate)
      .lte('datum', endDate)
      .order('datum', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loipen entries:', error);
      setLoading(false);
      return;
    }

    // Group by user_id + datum
    const grouped: Record<string, { user_id: string; datum: string; entries: Record<string, { skating: boolean; klassisch: boolean }> }> = {};
    (data || []).forEach((entry) => {
      const key = `${entry.user_id}_${entry.datum}`;
      if (!grouped[key]) {
        grouped[key] = { user_id: entry.user_id, datum: entry.datum, entries: {} };
      }
      grouped[key].entries[entry.loipe_config_id] = { skating: entry.skating, klassisch: entry.klassisch };
    });

    const configMap = new Map(loipenConfig.map(l => [l.id, l]));
    const result: ProtokollRow[] = Object.values(grouped).map((group) => {
      const profile = (profilesData || []).find(p => p.user_id === group.user_id);
      const loipen: { name: string; type: string }[] = [];
      
      loipenConfig.forEach((loipe) => {
        const entry = group.entries[loipe.id];
        if (!entry) return;
        if (!entry.skating && !entry.klassisch) return;
        
        if (loipe.has_skipiste) {
          loipen.push({ name: loipe.name, type: 'Skipiste' });
        } else if (entry.skating && entry.klassisch) {
          loipen.push({ name: loipe.name, type: 'Skating, Klassisch' });
        } else if (entry.skating) {
          loipen.push({ name: loipe.name, type: 'Skating' });
        } else {
          loipen.push({ name: loipe.name, type: 'Klassisch' });
        }
      });

      return {
        user_id: group.user_id,
        datum: group.datum,
        profileName: profile ? `${profile.vorname} ${profile.nachname}` : 'Unbekannt',
        loipen,
      };
    });

    // Sort by date desc
    result.sort((a, b) => b.datum.localeCompare(a.datum));
    setRows(result);
    setLoading(false);
  }, [startDate, endDate, selectedUser, loipenConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setWeekPeriod = () => {
    setStartDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    setEndDate(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    setSelectedSeason('');
  };

  const setMonthPeriod = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setSelectedSeason('');
  };

  const setYearPeriod = () => {
    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'));
    setSelectedSeason('');
  };

  const setSeasonPeriod = (seasonLabel: string) => {
    setSelectedSeason(seasonLabel);
    const { start, end } = getSeasonDates(seasonLabel);
    setStartDate(start);
    setEndDate(end);
  };

  const exportCSV = () => {
    if (rows.length === 0) {
      toast({ title: 'Keine Daten', description: 'Keine Einträge für diesen Zeitraum gefunden' });
      return;
    }

    const headers = ['Datum', 'Mitarbeiter', 'Anzahl', ...loipenConfig.map(l => l.name)];
    const csvRows = rows.map((row) => {
      const loipenValues = loipenConfig.map((loipe) => {
        const found = row.loipen.find(l => l.name === loipe.name);
        return found ? found.type : '';
      });
      return [format(new Date(row.datum), 'dd.MM.yyyy'), row.profileName, row.loipen.length.toString(), ...loipenValues];
    });

    const csvContent = [headers.join(';'), ...csvRows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loipen_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: 'Export erfolgreich', description: 'CSV-Datei wurde heruntergeladen' });
  };

  const deleteProtokoll = async (userId: string, datum: string) => {
    const { error } = await supabase
      .from('loipen_protokoll_entries')
      .delete()
      .eq('user_id', userId)
      .eq('datum', datum);
    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden', variant: 'destructive' });
      return;
    }
    toast({ title: 'Gelöscht', description: 'Protokoll wurde entfernt' });
    fetchData();
  };

  return (
    <AdminLayout title="Loipen-Protokoll">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={setWeekPeriod}>Diese Woche</Button>
              <Button variant="outline" size="sm" onClick={setMonthPeriod}>Dieser Monat</Button>
              <Button variant="outline" size="sm" onClick={setYearPeriod}>Dieses Jahr</Button>
              <Select value={selectedSeason} onValueChange={setSeasonPeriod}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Saison" />
                </SelectTrigger>
                <SelectContent>
                  {availableSeasons.map((s: string) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Von</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bis</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">{rows.length} Protokolle</span>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV Export
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
                    <TableHead>Präpariert</TableHead>
                    {loipenConfig.map(loipe => (
                      <TableHead key={loipe.id} className="text-center min-w-[100px]">
                        {loipe.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4 + loipenConfig.length} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4 + loipenConfig.length} className="text-center py-8 text-muted-foreground">Keine Einträge gefunden</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow key={`${row.user_id}_${row.datum}_${idx}`}>
                        <TableCell>{format(new Date(row.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>{row.profileName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.loipen.length}</Badge>
                        </TableCell>
                        {loipenConfig.map(loipe => {
                          const found = row.loipen.find(l => l.name === loipe.name);
                          return (
                            <TableCell key={loipe.id} className="text-center">
                              {found ? (
                                <Badge variant="outline" className="text-xs">{found.type}</Badge>
                              ) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Löschen">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                                <AlertDialogDescription>Dieses Protokoll wird unwiderruflich gelöscht.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteProtokoll(row.user_id, row.datum)}>Löschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </AdminLayout>
  );
}
