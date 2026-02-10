import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface WorkerStats {
  profile: Profile;
  role: string;
  hoursThisMonth: number;
  entriesThisMonth: number;
}

export default function AdminMitarbeiter() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerStats | null>(null);
  const [editVorname, setEditVorname] = useState('');
  const [editNachname, setEditNachname] = useState('');
  const [editRole, setEditRole] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [
      { data: profiles },
      { data: roles },
      { data: timeEntries },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('nachname'),
      supabase.from('user_roles').select('*'),
      supabase.from('time_entries').select('user_id, total_stunden').gte('datum', monthStart).lte('datum', monthEnd),
    ]);

    const workerStats: WorkerStats[] = (profiles || []).map(profile => {
      const userRole = (roles || []).find(r => r.user_id === profile.user_id);
      const userEntries = (timeEntries || []).filter(e => e.user_id === profile.user_id);
      const totalHours = userEntries.reduce((sum, e) => sum + (e.total_stunden || 0), 0);

      return {
        profile,
        role: userRole?.role || 'worker',
        hoursThisMonth: totalHours,
        entriesThisMonth: userEntries.length,
      };
    });

    setWorkers(workerStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditDialog = (worker: WorkerStats) => {
    setEditingWorker(worker);
    setEditVorname(worker.profile.vorname);
    setEditNachname(worker.profile.nachname);
    setEditRole(worker.role);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingWorker) return;

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ vorname: editVorname, nachname: editNachname })
      .eq('user_id', editingWorker.profile.user_id);

    if (profileError) {
      toast({ title: 'Fehler', description: 'Profil konnte nicht aktualisiert werden', variant: 'destructive' });
      return;
    }

    // Update role if changed
    if (editRole !== editingWorker.role) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editRole as 'admin' | 'worker' })
        .eq('user_id', editingWorker.profile.user_id);

      if (roleError) {
        toast({ title: 'Fehler', description: 'Rolle konnte nicht aktualisiert werden', variant: 'destructive' });
        return;
      }
    }

    setEditDialogOpen(false);
    setEditingWorker(null);
    fetchData();
    toast({ title: 'Aktualisiert', description: 'Mitarbeiter wurde geändert' });
  };

  return (
    <AdminLayout title="Mitarbeiter">
      <div className="space-y-6">
        {/* Summary */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registrierte Mitarbeiter</p>
                <p className="text-2xl font-semibold">{workers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle Mitarbeiter</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Registriert</TableHead>
                    <TableHead className="text-right">Stunden (Monat)</TableHead>
                    <TableHead className="text-right">Einträge (Monat)</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
                    </TableRow>
                  ) : workers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Mitarbeiter gefunden</TableCell>
                    </TableRow>
                  ) : (
                    workers.map((worker) => (
                      <TableRow key={worker.profile.id}>
                        <TableCell className="font-medium">
                          {worker.profile.vorname} {worker.profile.nachname}
                        </TableCell>
                        <TableCell>
                          <Badge variant={worker.role === 'admin' ? 'default' : 'secondary'}>
                            {worker.role === 'admin' ? 'Admin' : 'Arbeiter'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(worker.profile.created_at), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className="text-right">{worker.hoursThisMonth.toFixed(1)} h</TableCell>
                        <TableCell className="text-right">{worker.entriesThisMonth}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(worker)}>
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vorname</Label>
                  <Input value={editVorname} onChange={(e) => setEditVorname(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nachname</Label>
                  <Input value={editNachname} onChange={(e) => setEditNachname(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Arbeiter</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Hinweis: Passwort-Zurücksetzung kann über die Funktion "Passwort vergessen" auf der Anmeldeseite erfolgen.
              </p>
              <Button onClick={saveEdit} className="w-full">Änderungen speichern</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
