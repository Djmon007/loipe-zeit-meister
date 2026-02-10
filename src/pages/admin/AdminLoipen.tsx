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
import { Download, Filter, MapPin } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { getSeasonDates, getSeasonLabel, getAvailableSeasons } from '@/lib/seasonUtils';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
}

interface LoipeConfigDB {
  id: string;
  name: string;
  has_skating: boolean;
  has_klassisch: boolean;
  has_skipiste: boolean;
  sort_order: number;
  column_key: string | null;
}

interface LoipenProtokoll {
  id: string;
  user_id: string;
  datum: string;
  profiles?: Profile;
  [key: string]: unknown;
}

export default function AdminLoipen() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<LoipenProtokoll[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loipenConfig, setLoipenConfig] = useState<LoipeConfigDB[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState('');

  const availableSeasons = getAvailableSeasons();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('loipen_config').select('*').order('sort_order');
      if (data) setLoipenConfig(data as LoipeConfigDB[]);
    };
    fetchConfig();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const { data: profilesData } = await supabase.from('profiles').select('*');
    setProfiles(profilesData || []);

    let query = supabase
      .from('loipen_protokoll')
      .select('*')
      .gte('datum', startDate)
      .lte('datum', endDate)
      .order('datum', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loipen:', error);
      setLoading(false);
      return;
    }

    const entriesWithProfiles = (data || []).map(entry => ({
      ...entry,
      profiles: (profilesData || []).find(p => p.user_id === entry.user_id),
    }));

    setEntries(entriesWithProfiles);
    setLoading(false);
  }, [startDate, endDate, selectedUser]);

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

  const getLoipenForEntry = (entry: LoipenProtokoll) => {
    const result: { name: string; type: string }[] = [];
    loipenConfig.forEach(loipe => {
      if (!loipe.column_key) return;
      const skating = entry[`${loipe.column_key}_skating`] as boolean;
      const klassisch = entry[`${loipe.column_key}_klassisch`] as boolean;
      if (!skating && !klassisch) return;

      if (loipe.has_skipiste) {
        if (skating || klassisch) {
          result.push({ name: loipe.name, type: 'Skipiste' });
        }
      } else {
        if (skating && klassisch) {
          result.push({ name: loipe.name, type: 'Skating, Klassisch' });
        } else if (skating) {
          result.push({ name: loipe.name, type: 'Skating' });
        } else if (klassisch) {
          result.push({ name: loipe.name, type: 'Klassisch' });
        }
      }
    });
    return result;
  };

  const countLoipen = (entry: LoipenProtokoll): number => {
    return getLoipenForEntry(entry).length;
  };

  const exportCSV = () => {
    if (entries.length === 0) {
      toast({ title: 'Keine Daten', description: 'Keine Einträge für diesen Zeitraum gefunden' });
      return;
    }

    const loipenWithKeys = loipenConfig.filter(l => l.column_key);
    const headers = ['Datum', 'Mitarbeiter', 'Präpariert', ...loipenWithKeys.map(l => l.name)];
    const rows = entries.map((entry) => {
      const name = entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt';
      const loipenValues = loipenWithKeys.map(loipe => {
        const skating = entry[`${loipe.column_key}_skating`] as boolean;
        const klassisch = entry[`${loipe.column_key}_klassisch`] as boolean;
        if (loipe.has_skipiste) return (skating || klassisch) ? 'Skipiste' : '';
        const parts = [];
        if (skating) parts.push('Skating');
        if (klassisch) parts.push('Klassisch');
        return parts.join(', ');
      });
      return [format(new Date(entry.datum), 'dd.MM.yyyy'), name, countLoipen(entry).toString(), ...loipenValues];
    });

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
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

  const loipenWithKeys = loipenConfig.filter(l => l.column_key);

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
            <span className="font-medium">{entries.length} Protokolle</span>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV Export
          </Button>
        </div>

        {/* Table with track names in header */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Präpariert</TableHead>
                    {loipenWithKeys.map(loipe => (
                      <TableHead key={loipe.id} className="text-center min-w-[100px]">
                        {loipe.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3 + loipenWithKeys.length} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3 + loipenWithKeys.length} className="text-center py-8 text-muted-foreground">Keine Einträge gefunden</TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>
                          {entry.profiles ? `${entry.profiles.vorname} ${entry.profiles.nachname}` : 'Unbekannt'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{countLoipen(entry)}</Badge>
                        </TableCell>
                        {loipenWithKeys.map(loipe => {
                          const skating = entry[`${loipe.column_key}_skating`] as boolean;
                          const klassisch = entry[`${loipe.column_key}_klassisch`] as boolean;
                          
                          if (loipe.has_skipiste) {
                            return (
                              <TableCell key={loipe.id} className="text-center">
                                {(skating || klassisch) ? (
                                  <Badge variant="outline" className="text-xs">Skipiste</Badge>
                                ) : '-'}
                              </TableCell>
                            );
                          }
                          
                          const parts = [];
                          if (skating) parts.push('Skating');
                          if (klassisch) parts.push('Klassisch');
                          
                          return (
                            <TableCell key={loipe.id} className="text-center">
                              {parts.length > 0 ? (
                                <div className="flex flex-col gap-1 items-center">
                                  {parts.map(p => (
                                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                  ))}
                                </div>
                              ) : '-'}
                            </TableCell>
                          );
                        })}
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
