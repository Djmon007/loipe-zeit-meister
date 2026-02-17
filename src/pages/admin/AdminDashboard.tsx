import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Fuel, Receipt, MapPin, Banknote, ArrowRight, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { getSeasonLabel } from '@/lib/seasonUtils';

interface DashboardStats {
  totalHoursWeek: number;
  totalHoursMonth: number;
  totalDieselMonth: number;
  totalExpensesMonth: number;
  totalKasseMonth: number;
  loipenToday: number;
  mitarbeiterCount: number;
}

interface RecentActivity {
  type: 'time' | 'loipe' | 'diesel' | 'expense' | 'kasse';
  user: string;
  description: string;
  time: string;
  sortDate: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalHoursWeek: 0,
    totalHoursMonth: 0,
    totalDieselMonth: 0,
    totalExpensesMonth: 0,
    totalKasseMonth: 0,
    loipenToday: 0,
    mitarbeiterCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const today = format(now, 'yyyy-MM-dd');

    const [
      { data: weekTime },
      { data: monthTime },
      { data: monthDiesel },
      { data: monthExpenses },
      { data: monthKasse },
      { data: todayLoipen },
      { data: profilesData },
      { data: recentTimeEntries },
      { data: recentDiesel },
      { data: recentExpenses },
      { data: recentKasse },
      { data: recentLoipenEntries },
    ] = await Promise.all([
      supabase.from('time_entries').select('total_stunden').gte('datum', weekStart).lte('datum', weekEnd),
      supabase.from('time_entries').select('total_stunden').gte('datum', monthStart).lte('datum', monthEnd),
      supabase.from('diesel_entries').select('liter').gte('datum', monthStart).lte('datum', monthEnd),
      supabase.from('expenses').select('betrag').gte('datum', monthStart).lte('datum', monthEnd),
      supabase.from('kasse_tageskarten').select('betrag').gte('datum', monthStart).lte('datum', monthEnd),
      supabase.from('loipen_protokoll_entries').select('id').eq('datum', today),
      supabase.from('profiles').select('id'),
      supabase.from('time_entries').select('*, profiles!inner(vorname, nachname)').order('created_at', { ascending: false }).limit(5),
      supabase.from('diesel_entries').select('*, profiles!inner(vorname, nachname)').order('created_at', { ascending: false }).limit(3),
      supabase.from('expenses').select('*, profiles!inner(vorname, nachname)').order('created_at', { ascending: false }).limit(3),
      supabase.from('kasse_tageskarten').select('*, profiles!inner(vorname, nachname)').order('created_at', { ascending: false }).limit(3),
      supabase.from('loipen_protokoll_entries').select('*, profiles!inner(vorname, nachname), loipen_config!inner(name)').order('created_at', { ascending: false }).limit(3),
    ]);

    const totalHoursWeek = (weekTime || []).reduce((sum, e) => sum + (e.total_stunden || 0), 0);
    const totalHoursMonth = (monthTime || []).reduce((sum, e) => sum + (e.total_stunden || 0), 0);
    const totalDieselMonth = (monthDiesel || []).reduce((sum, e) => sum + Number(e.liter || 0), 0);
    const totalExpensesMonth = (monthExpenses || []).reduce((sum, e) => sum + (e.betrag || 0), 0);
    const totalKasseMonth = (monthKasse || []).reduce((sum, e) => sum + (e.betrag || 0), 0);

    // Count unique users from today's loipen entries
    const uniqueLoipenUsers = new Set((todayLoipen || []).map((e: any) => e.user_id));

    setStats({
      totalHoursWeek,
      totalHoursMonth,
      totalDieselMonth,
      totalExpensesMonth,
      totalKasseMonth,
      loipenToday: uniqueLoipenUsers.size || (todayLoipen || []).length,
      mitarbeiterCount: (profilesData || []).length,
    });

    // Build combined recent activities
    const activities: RecentActivity[] = [];
    
    (recentTimeEntries || []).forEach((entry: any) => {
      activities.push({
        type: 'time',
        user: `${entry.profiles?.vorname || ''} ${entry.profiles?.nachname || ''}`.trim() || 'Unbekannt',
        description: `${entry.arbeit}: ${entry.total_stunden?.toFixed(1) || '–'} h`,
        time: format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de }),
        sortDate: entry.created_at,
      });
    });

    (recentDiesel || []).forEach((entry: any) => {
      activities.push({
        type: 'diesel',
        user: `${entry.profiles?.vorname || ''} ${entry.profiles?.nachname || ''}`.trim() || 'Unbekannt',
        description: `Diesel: ${entry.liter} L`,
        time: format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de }),
        sortDate: entry.created_at,
      });
    });

    (recentExpenses || []).forEach((entry: any) => {
      activities.push({
        type: 'expense',
        user: `${entry.profiles?.vorname || ''} ${entry.profiles?.nachname || ''}`.trim() || 'Unbekannt',
        description: `Spesen: CHF ${entry.betrag || 0}`,
        time: format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de }),
        sortDate: entry.created_at,
      });
    });

    (recentKasse || []).forEach((entry: any) => {
      activities.push({
        type: 'kasse',
        user: `${entry.profiles?.vorname || ''} ${entry.profiles?.nachname || ''}`.trim() || 'Unbekannt',
        description: `Kasse: CHF ${entry.betrag}`,
        time: format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de }),
        sortDate: entry.created_at,
      });
    });

    (recentLoipenEntries || []).forEach((entry: any) => {
      activities.push({
        type: 'loipe',
        user: `${entry.profiles?.vorname || ''} ${entry.profiles?.nachname || ''}`.trim() || 'Unbekannt',
        description: `Loipe: ${entry.loipen_config?.name || '–'}`,
        time: format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de }),
        sortDate: entry.created_at,
      });
    });

    // Sort by date desc and take top 8
    activities.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    setRecentActivity(activities.slice(0, 8));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentSeason = getSeasonLabel(new Date());

  const statCards = [
    { label: 'Stunden (Woche)', value: `${stats.totalHoursWeek.toFixed(1)} h`, icon: Clock, color: 'text-primary' },
    { label: 'Stunden (Monat)', value: `${stats.totalHoursMonth.toFixed(1)} h`, icon: Clock, color: 'text-primary' },
    { label: 'Diesel (Monat)', value: `${stats.totalDieselMonth.toFixed(0)} L`, icon: Fuel, color: 'text-warning' },
    { label: 'Spesen (Monat)', value: `CHF ${stats.totalExpensesMonth.toFixed(0)}`, icon: Receipt, color: 'text-info' },
    { label: 'Kasse (Monat)', value: `CHF ${stats.totalKasseMonth.toFixed(0)}`, icon: Banknote, color: 'text-success' },
    { label: 'Loipen heute', value: stats.loipenToday.toString(), icon: MapPin, color: 'text-primary' },
    { label: 'Mitarbeiter', value: stats.mitarbeiterCount.toString(), icon: Users, color: 'text-muted-foreground' },
  ];

  const quickLinks = [
    { href: '/admin/zeiterfassung', label: 'Arbeitszeit verwalten', icon: Clock },
    { href: '/admin/loipen', label: 'Loipen-Protokolle', icon: MapPin },
    { href: '/admin/diesel', label: 'Diesel-Übersicht', icon: Fuel },
    { href: '/admin/spesen', label: 'Belege verwalten', icon: Receipt },
    { href: '/admin/kasse', label: 'Kasse Tageskarten', icon: Banknote },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Current Season */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Aktuelle Saison</p>
            <p className="text-xl font-semibold text-primary">{currentSeason}</p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-muted rounded-lg`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{loading ? '–' : stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schnellzugriff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <Button variant="ghost" className="w-full justify-between h-12">
                    <span className="flex items-center gap-3">
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Laden...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Aktivitäten</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{activity.user}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
