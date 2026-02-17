import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import logo from '@/assets/logo.png';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {profile.vorname} {profile.nachname}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
