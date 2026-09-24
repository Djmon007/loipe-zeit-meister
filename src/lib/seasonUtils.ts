// Season utility functions
// A season runs from July 1 to June 30 of the following year

export function getSeasonDates(seasonLabel: string): { start: string; end: string } {
  // Parse "Saison 2025-26" format
  const match = seasonLabel.match(/Saison (\d{4})-(\d{2})/);
  if (!match) {
    // Fallback to current season
    const now = new Date();
    const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      start: `${year}-07-01`,
      end: `${year + 1}-06-30`,
    };
  }

  const startYear = parseInt(match[1]);
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
  };
}

export function getSeasonLabel(date: Date): string {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  
  // If month is July (6) or later, we're in the season starting this year
  // If month is before July, we're in the season that started last year
  const seasonStartYear = month >= 6 ? year : year - 1;
  const seasonEndYear = (seasonStartYear + 1) % 100;
  
  return `Saison ${seasonStartYear}-${seasonEndYear.toString().padStart(2, '0')}`;
}

export function getAvailableSeasons(startYear: number = 2025): string[] {
  const now = new Date();
  const currentSeasonStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  
  const seasons: string[] = [];
  for (let year = currentSeasonStartYear; year >= startYear; year--) {
    const endYear = (year + 1) % 100;
    seasons.push(`Saison ${year}-${endYear.toString().padStart(2, '0')}`);
  }
  
  return seasons;
}

export function isDateInSeason(date: Date, seasonLabel: string): boolean {
  const { start, end } = getSeasonDates(seasonLabel);
  const dateStr = date.toISOString().split('T')[0];
  return dateStr >= start && dateStr <= end;
}
