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

interface LoipeConfigDB {
  id: string;
  name: string;
  has_skating: boolean;
  has_klassisch: boolean;
  has_skipiste: boolean;
  sort_order: number;
  column_key: string | null;
}

type LoipenState = Record<string, boolean>;

export default function Loipen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loipenState, setLoipenState] = useState<LoipenState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loipenConfig, setLoipenConfig] = useState<LoipeConfigDB[]>([]);

  // Fetch loipen config from DB
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('loipen_config')
        .select('*')
        .order('sort_order');
      
      if (data) {
        setLoipenConfig(data as LoipeConfigDB[]);
      }
    };
    fetchConfig();
  }, []);

  const fetchLoipenData = useCallback(async () => {
    if (!user || loipenConfig.length === 0) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('loipen_protokoll')
      .select('*')
      .eq('user_id', user.id)
      .eq('datum', selectedDate)
      .maybeSingle();

    if (error) {
      console.error('Error fetching loipen:', error);
    }

    if (data) {
      setExistingId(data.id);
      const state: LoipenState = {};
      loipenConfig.forEach((loipe) => {
        if (loipe.column_key) {
          state[`${loipe.column_key}_skating`] = (data as Record<string, unknown>)[`${loipe.column_key}_skating`] as boolean || false;
          state[`${loipe.column_key}_klassisch`] = (data as Record<string, unknown>)[`${loipe.column_key}_klassisch`] as boolean || false;
        }
      });
      setLoipenState(state);
    } else {
      setExistingId(null);
      const initialState: LoipenState = {};
      loipenConfig.forEach((loipe) => {
        if (loipe.column_key) {
          initialState[`${loipe.column_key}_skating`] = false;
          initialState[`${loipe.column_key}_klassisch`] = false;
        }
      });
      setLoipenState(initialState);
    }
    setLoading(false);
  }, [user, selectedDate, loipenConfig]);

  useEffect(() => {
    fetchLoipenData();
  }, [fetchLoipenData]);

  const toggleLoipe = (key: string) => {
    setLoipenState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleBoth = (loipe: LoipeConfigDB) => {
    if (!loipe.column_key) return;
    const skKey = `${loipe.column_key}_skating`;
    const klKey = `${loipe.column_key}_klassisch`;
    const bothSelected = loipenState[skKey] && loipenState[klKey];
    setLoipenState((prev) => ({
      ...prev,
      [skKey]: !bothSelected,
      [klKey]: !bothSelected,
    }));
  };

  const toggleSkipiste = (loipe: LoipeConfigDB) => {
    if (!loipe.column_key) return;
    const skKey = `${loipe.column_key}_skating`;
    const klKey = `${loipe.column_key}_klassisch`;
    const isSelected = loipenState[skKey] || loipenState[klKey];
    setLoipenState((prev) => ({
      ...prev,
      [skKey]: !isSelected,
      [klKey]: !isSelected,
    }));
  };

  const saveLoipen = async () => {
    if (!user) return;

    setSaving(true);

    // Only include columns that exist in the DB
    const payload: Record<string, unknown> = {
      user_id: user.id,
      datum: selectedDate,
    };
    
    loipenConfig.forEach((loipe) => {
      if (loipe.column_key) {
        payload[`${loipe.column_key}_skating`] = loipenState[`${loipe.column_key}_skating`] || false;
        payload[`${loipe.column_key}_klassisch`] = loipenState[`${loipe.column_key}_klassisch`] || false;
      }
    });

    let error;

    if (existingId) {
      const result = await supabase
        .from('loipen_protokoll')
        .update(payload)
        .eq('id', existingId);
      error = result.error;
    } else {
      const result = await supabase.from('loipen_protokoll').insert(payload as any);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({ title: 'Fehler', description: 'Protokoll konnte nicht gespeichert werden', variant: 'destructive' });
      return;
    }

    toast({ title: 'Gespeichert', description: 'Loipen-Protokoll wurde aktualisiert' });
    fetchLoipenData();
  };

  const countSelected = () => {
    let count = 0;
    loipenConfig.forEach((loipe) => {
      if (!loipe.column_key) return;
      if (loipe.has_skipiste) {
        if (loipenState[`${loipe.column_key}_skating`] || loipenState[`${loipe.column_key}_klassisch`]) count++;
      } else {
        if (loipenState[`${loipe.column_key}_skating`]) count++;
        if (loipenState[`${loipe.column_key}_klassisch`]) count++;
      }
    });
    return count;
  };

  const hasAnySelected = Object.values(loipenState).some((v) => v);

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
                {loipenConfig.filter(l => l.column_key).map((loipe) => (
                  <div key={loipe.id} className="loipe-card p-4 rounded-lg border border-border bg-card">
                    <p className="font-medium mb-3">{loipe.name}</p>
                    {loipe.has_skipiste ? (
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${loipe.column_key}_skipiste`}
                            checked={loipenState[`${loipe.column_key}_skating`] || loipenState[`${loipe.column_key}_klassisch`] || false}
                            onCheckedChange={() => toggleSkipiste(loipe)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor={`${loipe.column_key}_skipiste`} className="text-sm cursor-pointer">Skipiste</Label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 flex-wrap">
                        {loipe.has_skating && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.column_key}_skating`}
                              checked={loipenState[`${loipe.column_key}_skating`] || false}
                              onCheckedChange={() => toggleLoipe(`${loipe.column_key}_skating`)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.column_key}_skating`} className="text-sm cursor-pointer">Skating</Label>
                          </div>
                        )}
                        {loipe.has_klassisch && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.column_key}_klassisch`}
                              checked={loipenState[`${loipe.column_key}_klassisch`] || false}
                              onCheckedChange={() => toggleLoipe(`${loipe.column_key}_klassisch`)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.column_key}_klassisch`} className="text-sm cursor-pointer">Klassisch</Label>
                          </div>
                        )}
                        {loipe.has_skating && loipe.has_klassisch && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${loipe.column_key}_beides`}
                              checked={loipenState[`${loipe.column_key}_skating`] && loipenState[`${loipe.column_key}_klassisch`]}
                              onCheckedChange={() => toggleBoth(loipe)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`${loipe.column_key}_beides`} className="text-sm cursor-pointer">Beides</Label>
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
