import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Save, Check } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface LoipeConfig {
  id: string;
  name: string;
  has_skating: boolean;
  has_klassisch: boolean;
  has_skipiste: boolean;
  sort_order: number;
}

interface LoipeEntry {
  loipe_config_id: string;
  skating: boolean;
  klassisch: boolean;
}

export default function Loipen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState<Record<string, LoipeEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loipenConfig, setLoipenConfig] = useState<LoipeConfig[]>([]);

  // Fetch loipen config from DB
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('loipen_config')
        .select('id, name, has_skating, has_klassisch, has_skipiste, sort_order')
        .order('sort_order');
      
      if (data) {
        setLoipenConfig(data);
      }
    };
    fetchConfig();
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!user || loipenConfig.length === 0) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('loipen_protokoll_entries')
      .select('loipe_config_id, skating, klassisch')
      .eq('user_id', user.id)
      .eq('datum', selectedDate);

    if (error) {
      console.error('Error fetching loipen entries:', error);
    }

    const entryMap: Record<string, LoipeEntry> = {};
    loipenConfig.forEach((loipe) => {
      entryMap[loipe.id] = { loipe_config_id: loipe.id, skating: false, klassisch: false };
    });

    (data || []).forEach((entry) => {
      entryMap[entry.loipe_config_id] = entry;
    });

    setEntries(entryMap);
    setLoading(false);
  }, [user, selectedDate, loipenConfig]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const toggle = (loipeId: string, field: 'skating' | 'klassisch') => {
    setEntries((prev) => ({
      ...prev,
      [loipeId]: {
        ...prev[loipeId],
        [field]: !prev[loipeId]?.[field],
      },
    }));
  };

  const toggleBoth = (loipeId: string) => {
    const current = entries[loipeId];
    const bothSelected = current?.skating && current?.klassisch;
    setEntries((prev) => ({
      ...prev,
      [loipeId]: {
        ...prev[loipeId],
        skating: !bothSelected,
        klassisch: !bothSelected,
      },
    }));
  };

  const toggleSkipiste = (loipeId: string) => {
    const current = entries[loipeId];
    const isSelected = current?.skating || current?.klassisch;
    setEntries((prev) => ({
      ...prev,
      [loipeId]: {
        ...prev[loipeId],
        skating: !isSelected,
        klassisch: !isSelected,
      },
    }));
  };

  const saveLoipen = async () => {
    if (!user) return;

    setSaving(true);

    // Delete existing entries for this date, then insert new ones
    await supabase
      .from('loipen_protokoll_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('datum', selectedDate);

    const toInsert = Object.values(entries)
      .filter((e) => e.skating || e.klassisch)
      .map((e) => ({
        user_id: user.id,
        datum: selectedDate,
        loipe_config_id: e.loipe_config_id,
        skating: e.skating,
        klassisch: e.klassisch,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('loipen_protokoll_entries').insert(toInsert);
      if (error) {
        toast({ title: 'Fehler', description: 'Protokoll konnte nicht gespeichert werden', variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: 'Gespeichert', description: 'Loipen-Protokoll wurde aktualisiert' });
    fetchEntries();
  };

  const countSelected = () => {
    let count = 0;
    loipenConfig.forEach((loipe) => {
      const entry = entries[loipe.id];
      if (!entry) return;
      if (loipe.has_skipiste) {
        if (entry.skating || entry.klassisch) count++;
      } else {
        if (entry.skating) count++;
        if (entry.klassisch) count++;
      }
    });
    return count;
  };

  const hasAnySelected = Object.values(entries).some((e) => e.skating || e.klassisch);

  return (
    <AppLayout title="Loipen-Protokoll">
      <div className="space-y-6">
        {/* Date Picker */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="date" className="text-sm text-muted-foreground">Datum</Label>
                <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-alpine mt-1" />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Heute</p>
                <p className="font-medium">{format(new Date(), 'EEEE', { locale: de })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loipen List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Präparierte Loipen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Laden...</p>
            ) : (
              <div className="space-y-4">
                {loipenConfig.map((loipe) => (
                  <div key={loipe.id} className="loipe-card p-4 rounded-lg border border-border bg-card">
                    <p className="font-medium mb-3">{loipe.name}</p>
                    {loipe.has_skipiste ? (
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${loipe.id}_skipiste`}
                            checked={entries[loipe.id]?.skating || entries[loipe.id]?.klassisch || false}
                            onCheckedChange={() => toggleSkipiste(loipe.id)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor={`${loipe.id}_skipiste`} className="text-sm cursor-pointer">Skipiste</Label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 flex-wrap">
                        {loipe.has_skating && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.id}_skating`}
                              checked={entries[loipe.id]?.skating || false}
                              onCheckedChange={() => toggle(loipe.id, 'skating')}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.id}_skating`} className="text-sm cursor-pointer">Skating</Label>
                          </div>
                        )}
                        {loipe.has_klassisch && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.id}_klassisch`}
                              checked={entries[loipe.id]?.klassisch || false}
                              onCheckedChange={() => toggle(loipe.id, 'klassisch')}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.id}_klassisch`} className="text-sm cursor-pointer">Klassisch</Label>
                          </div>
                        )}
                        {loipe.has_skating && loipe.has_klassisch && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.id}_beides`}
                              checked={entries[loipe.id]?.skating && entries[loipe.id]?.klassisch}
                              onCheckedChange={() => toggleBoth(loipe.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.id}_beides`} className="text-sm cursor-pointer">Beides</Label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={saveLoipen} disabled={saving || loading} className="w-full gap-2">
          {saving ? 'Speichern...' : (
            <><Save className="h-4 w-4" /> Protokoll speichern</>
          )}
        </Button>

        {/* Summary */}
        {hasAnySelected && (
          <Card className="bg-success/10 border-success/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                <p className="font-medium">{countSelected()} Loipen markiert</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
