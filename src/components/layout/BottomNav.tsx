import { Clock, MapPin, Fuel, Receipt, LayoutDashboard, Banknote, Gauge } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const workerNavItems = [
  { to: '/zeiterfassung', icon: Clock, label: 'Zeit' },
  { to: '/loipen', icon: MapPin, label: 'Loipen' },
  { to: '/diesel', icon: Fuel, label: 'Diesel' },
  { to: '/spesen', icon: Receipt, label: 'Spesen' },
  { to: '/kasse', icon: Banknote, label: 'Kasse' },
  { to: '/fahrzeugstunden', icon: Gauge, label: 'Fahrzeug' },
];

const adminNavItems = [
  ...workerNavItems,
  { to: '/admin', icon: LayoutDashboard, label: 'Admin' },
];

export function BottomNav() {
  const { isAdmin } = useAuth();
  const navItems = isAdmin ? adminNavItems : workerNavItems;

  return (
    <nav className="bottom-nav z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors",
              "text-muted-foreground hover:text-primary"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
