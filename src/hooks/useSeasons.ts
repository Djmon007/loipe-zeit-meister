import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Season {
  id: string;
  start_year: number;
}

export function formatSeasonLabel(startYear: number): string {
  return `Saison ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSeasons = useCallback(async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, start_year')
      .order('start_year', { ascending: false });

    if (!error) setSeasons(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSeasons();
  }, [refreshSeasons]);

  return {
    seasons,
    seasonLabels: seasons.map((season) => formatSeasonLabel(season.start_year)),
    loading,
    refreshSeasons,
  };
}