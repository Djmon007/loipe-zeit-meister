import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square, Plus, Clock, Calendar, Pause, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatHoursAndMinutes, parseHoursAndMinutes } from '@/lib/timeUtils';

interface TimeEntry {
  id: string;
  datum: string;
  arbeit: string;
  start_zeit: string | null;
  stopp_zeit: string | null;
  total_stunden: number | null;
}

export default function Zeiterfassung() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedProject, setSelectedProject] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef<Date | null>(null);

  // Dynamic work types from tasks table
  const [workTypes, setWorkTypes] = useState<string[]>([]);

  // Manual entry dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualProject, setManualProject] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Fetch dynamic tasks
  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('name')
        .order('name');
      
      if (data && data.length > 0) {
        const names = data.map(t => t.name);
        setWorkTypes(names);
        if (!selectedProject) setSelectedProject(names[0]);
        if (!manualProject) setManualProject(names[0]);
      }
    };
    fetchTasks();
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
      .order('start_zeit', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching entries:', error);
      return;
    }

    const typedData = (data || []) as TimeEntry[];
    setEntries(typedData);

    // Find active timer
    const active = typedData.find(
      (e) => e.start_zeit && !e.stopp_zeit && e.datum === format(new Date(), 'yyyy-MM-dd')
    );
    setActiveTimer(active || null);

    // Calculate weekly and monthly hours
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [{ data: weekData }, { data: monthData }] = await Promise.all([
      supabase.from('time_entries').select('total_stunden').eq('user_id', user.id)
        .gte('datum', format(weekStart, 'yyyy-MM-dd')).lte('datum', format(weekEnd, 'yyyy-MM-dd')),
      supabase.from('time_entries').select('total_stunden').eq('user_id', user.id)
        .gte('datum', format(monthStart, 'yyyy-MM-dd')).lte('datum', format(monthEnd, 'yyyy-MM-dd')),
    ]);

    setWeeklyHours((weekData || []).reduce((sum, e) => sum + (e.total_stunden || 0), 0));
    setMonthlyHours((monthData || []).reduce((sum, e) => sum + (e.total_stunden || 0), 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Timer effect
  useEffect(() => {
    if (!activeTimer || !activeTimer.start_zeit || isPaused) return;

    const startTime = new Date(`${activeTimer.datum}T${activeTimer.start_zeit}`);
    
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000) - pausedTimeRef.current;
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, isPaused]);

  const startTimer = async () => {
    if (!user || !selectedProject) return;

    const now = new Date();
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        datum: format(now, 'yyyy-MM-dd'),
        arbeit: selectedProject,
        start_zeit: format(now, 'HH:mm:ss'),
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Fehler', description: 'Timer konnte nicht gestartet werden', variant: 'destructive' });
      return;
    }

    setActiveTimer(data as TimeEntry);
    setElapsedTime(0);
    pausedTimeRef.current = 0;
    setIsPaused(false);
    toast({ title: 'Timer gestartet', description: `${selectedProject} läuft` });
  };

  const pauseTimer = () => {
    if (!isPaused) {
      pauseStartRef.current = new Date();
      setIsPaused(true);
      toast({ title: 'Pause', description: 'Timer pausiert' });
    }
  };

  const resumeTimer = () => {
    if (isPaused && pauseStartRef.current) {
      const pauseDuration = Math.floor((new Date().getTime() - pauseStartRef.current.getTime()) / 1000);
      pausedTimeRef.current += pauseDuration;
      pauseStartRef.current = null;
      setIsPaused(false);
      toast({ title: 'Weiter', description: 'Timer läuft wieder' });
    }
  };

  const stopTimer = async () => {
    if (!activeTimer || !user) return;

    const now = new Date();
    const startTime = new Date(`${activeTimer.datum}T${activeTimer.start_zeit}`);
    
    let totalSeconds = (now.getTime() - startTime.getTime()) / 1000;
    if (isPaused && pauseStartRef.current) {
      totalSeconds -= (now.getTime() - pauseStartRef.current.getTime()) / 1000;
    }
    totalSeconds -= pausedTimeRef.current;
    const totalHours = totalSeconds / 3600;

    const { error } = await supabase
      .from('time_entries')
      .update({
        stopp_zeit: format(now, 'HH:mm:ss'),
        total_stunden: Math.round(totalHours * 100) / 100,
      })
      .eq('id', activeTimer.id);

    if (error) {
      toast({ title: 'Fehler', description: 'Timer konnte nicht gestoppt werden', variant: 'destructive' });
      return;
    }

    setActiveTimer(null);
    setElapsedTime(0);
    pausedTimeRef.current = 0;
    setIsPaused(false);
    fetchEntries();
    toast({ title: 'Timer gestoppt', description: `${formatDuration(elapsedTime)} erfasst` });
  };

  const addManualEntry = async () => {
    if (!user || !manualProject) return;

    const totalHours = parseHoursAndMinutes(manualDuration);
    if (totalHours === null) {
      toast({ title: 'Fehler', description: 'Bitte Stunden im Format HH:MM eingeben', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      datum: manualDate,
      arbeit: manualProject,
      start_zeit: null,
      stopp_zeit: null,
      total_stunden: totalHours,
    });

    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gespeichert werden', variant: 'destructive' });
      return;
    }

    setManualDialogOpen(false);
    setManualDuration('');
    fetchEntries();
    toast({ title: 'Eintrag gespeichert', description: `${manualDuration} Stunden erfasst` });
  };

  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDate(entry.datum);
    setEditProject(entry.arbeit);
    setEditStart(entry.start_zeit?.substring(0, 5) || '');
    setEditEnd(entry.stopp_zeit?.substring(0, 5) || '');
    setEditDuration(formatHoursAndMinutes(entry.total_stunden));
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingEntry) return;

    const isManual = !editingEntry.start_zeit && !editingEntry.stopp_zeit;
    let totalHours: number | null = null;
    if (isManual) {
      totalHours = parseHoursAndMinutes(editDuration);
      if (totalHours === null) {
        toast({ title: 'Fehler', description: 'Bitte Stunden im Format HH:MM eingeben', variant: 'destructive' });
        return;
      }
    } else {
      if (!editStart || !editEnd) return;
      const start = new Date(`${editDate}T${editStart}`);
      const end = new Date(`${editDate}T${editEnd}`);
      totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (totalHours <= 0) {
        toast({ title: 'Fehler', description: 'Endzeit muss nach Startzeit sein', variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        datum: editDate,
        arbeit: editProject,
        start_zeit: isManual ? null : editStart + ':00',
        stopp_zeit: isManual ? null : editEnd + ':00',
        total_stunden: Math.round(totalHours * 100) / 100,
      })
      .eq('id', editingEntry.id);

    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht aktualisiert werden', variant: 'destructive' });
      return;
    }

    setEditDialogOpen(false);
    setEditingEntry(null);
    fetchEntries();
    toast({ title: 'Aktualisiert', description: 'Zeiteintrag wurde geändert' });
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden', variant: 'destructive' });
      return;
    }
    setEditDialogOpen(false);
    setEditingEntry(null);
    fetchEntries();
    toast({ title: 'Gelöscht', description: 'Zeiteintrag wurde entfernt' });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (time: string | null): string => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  return (
    <AppLayout title="Zeiterfassung">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="stats-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diese Woche</p>
                  <p className="text-xl font-semibold">{weeklyHours.toFixed(1)} h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dieser Monat</p>
                  <p className="text-xl font-semibold">{monthlyHours.toFixed(1)} h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timer Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeTimer && (
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger className="input-alpine">
                  <SelectValue placeholder="Projekt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {workTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTimer && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-1">{activeTimer.arbeit}</p>
                <p className={`text-4xl font-mono font-bold ${isPaused ? 'text-warning' : 'text-primary timer-pulse'}`}>
                  {formatDuration(elapsedTime)}
                </p>
                {isPaused && (
                  <p className="text-sm text-warning mt-2">⏸ Pausiert</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!activeTimer ? (
                <Button onClick={startTimer} className="flex-1 gap-2" disabled={!selectedProject}>
                  <Play className="h-4 w-4" />
                  Starten
                </Button>
              ) : (
                <>
                  <Button onClick={stopTimer} variant="destructive" className="flex-1 gap-2">
                    <Square className="h-4 w-4" />
                    Stoppen
                  </Button>
                  {!isPaused ? (
                    <Button onClick={pauseTimer} variant="outline" className="gap-2">
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeTimer} variant="secondary" className="gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Weiter
                    </Button>
                  )}
                </>
              )}

              <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Manuell
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manueller Eintrag</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="input-alpine" />
                    </div>
                    <div className="space-y-2">
                      <Label>Projekt</Label>
                      <Select value={manualProject} onValueChange={setManualProject}>
                        <SelectTrigger className="input-alpine"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {workTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-duration">Stunden (HH:MM)</Label>
                      <Input
                        id="manual-duration"
                        type="text"
                        inputMode="numeric"
                        placeholder="z. B. 02:30"
                        value={manualDuration}
                        onChange={(e) => setManualDuration(e.target.value)}
                        className="input-alpine"
                      />
                    </div>
                    <Button onClick={addManualEntry} className="w-full">Speichern</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Einträge</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Laden...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Einträge vorhanden</p>
            ) : (
              <div className="space-y-3">
                {entries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{entry.arbeit}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.datum), 'dd.MM.yyyy', { locale: de })}
                        {' • '}
                         {entry.start_zeit || entry.stopp_zeit
                           ? `${formatTime(entry.start_zeit)} - ${formatTime(entry.stopp_zeit)}`
                           : `${formatHoursAndMinutes(entry.total_stunden)} Stunden`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {entry.total_stunden ? `${entry.total_stunden.toFixed(1)} h` : '-'}
                      </p>
                      {entry.total_stunden !== null && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
                <Label>Projekt</Label>
                <Select value={editProject} onValueChange={setEditProject}>
                  <SelectTrigger className="input-alpine"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
               {editingEntry?.start_zeit || editingEntry?.stopp_zeit ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Start</Label>
                     <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="input-alpine" />
                   </div>
                   <div className="space-y-2">
                     <Label>Stopp</Label>
                     <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="input-alpine" />
                   </div>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <Label>Stunden (HH:MM)</Label>
                   <Input type="text" inputMode="numeric" placeholder="z. B. 02:30" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="input-alpine" />
                 </div>
               )}
              <Button onClick={saveEdit} className="w-full">Änderungen speichern</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-4 w-4" /> Eintrag löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                    <AlertDialogDescription>Dieser Eintrag wird unwiderruflich gelöscht.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => editingEntry && deleteEntry(editingEntry.id)}>Löschen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
