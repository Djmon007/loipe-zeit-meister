import { useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatSeasonLabel, useSeasons } from '@/hooks/useSeasons';

export default function AdminSaisons() {
  const { toast } = useToast();
  const { seasons, loading, refreshSeasons } = useSeasons();
  const nextStartYear = seasons.length > 0 ? Math.max(...seasons.map((season) => season.start_year)) + 1 : 2025;
  const [startYear, setStartYear] = useState(nextStartYear);

  const addSeason = async () => {
    if (startYear < 2025 || startYear > 9998) {
      toast({ title: 'Ungültiges Jahr', description: 'Bitte ein Startjahr ab 2025 eingeben.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('seasons').insert({ start_year: startYear });
    if (error) {
      toast({ title: 'Saison nicht erstellt', description: 'Diese Saison besteht möglicherweise bereits.', variant: 'destructive' });
      return;
    }

    await refreshSeasons();
    setStartYear(startYear + 1);
    toast({ title: 'Saison erstellt', description: formatSeasonLabel(startYear) });
  };

  const deleteSeason = async (id: string) => {
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) {
      toast({ title: 'Saison nicht gelöscht', description: 'Bitte erneut versuchen.', variant: 'destructive' });
      return;
    }
    await refreshSeasons();
    toast({ title: 'Saison gelöscht' });
  };

  return (
    <AdminLayout title="Saisons">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4" /> Verfügbare Saisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : (
              <div className="divide-y divide-border">
                {seasons.map((season) => (
                  <div key={season.id} className="flex h-14 items-center justify-between">
                    <span className="font-medium">{formatSeasonLabel(season.start_year)}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`${formatSeasonLabel(season.start_year)} löschen`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Saison löschen?</AlertDialogTitle>
                          <AlertDialogDescription>Die Saison verschwindet aus allen Auswahllisten. Erfasste Daten bleiben erhalten.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSeason(season.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Neue Saison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="season-year">Startjahr</Label>
              <Input id="season-year" type="number" min={2025} max={9998} value={startYear} onChange={(event) => setStartYear(Number(event.target.value))} />
              <p className="text-sm text-muted-foreground">Erstellt {formatSeasonLabel(startYear || 2025)}</p>
            </div>
            <Button onClick={addSeason} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Saison erstellen
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}