import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function PasswortSetzen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionAvailable, setSessionAvailable] = useState(false);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSessionAvailable(Boolean(data.session));
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        setSessionAvailable(true);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const saveNewPassword = async () => {
    if (!sessionAvailable) return;
    if (!vorname.trim() || !nachname.trim()) {
      toast({ title: 'Name fehlt', description: 'Bitte Vorname und Nachname eingeben.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Passwort zu kurz', description: 'Das Passwort muss mindestens 6 Zeichen haben.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwörter stimmen nicht überein', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: { user }, error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError || !user) {
      setSaving(false);
      toast({ title: 'Passwort nicht gespeichert', description: passwordError?.message || 'Bitte öffnen Sie den Link erneut.', variant: 'destructive' });
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: user.id,
      vorname: vorname.trim(),
      nachname: nachname.trim(),
    }, { onConflict: 'user_id' });
    if (profileError) {
      setSaving(false);
      toast({ title: 'Name nicht gespeichert', description: 'Das Passwort wurde geändert. Melden Sie sich an und tragen Sie den Namen im Profil ein.', variant: 'destructive' });
      navigate('/auth', { replace: true });
      return;
    }

    await supabase.auth.signOut();
    toast({ title: 'Konto eingerichtet', description: 'Bitte melden Sie sich mit Ihrem neuen Passwort an.' });
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20 bg-sky-100/50">
            <img src={logo} alt="Loipen Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-xl">Konto einrichten</CardTitle>
            <CardDescription>Bitte Namen und neues Passwort festlegen.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !sessionAvailable ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Der Link ist abgelaufen oder wurde bereits verwendet. Fordern Sie auf der Anmeldeseite einen neuen Link an.</p>
              <Button asChild className="w-full"><Link to="/auth">Zur Anmeldung</Link></Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="invite-first">Vorname</Label><Input id="invite-first" value={vorname} onChange={(event) => setVorname(event.target.value)} autoComplete="given-name" /></div>
                <div className="space-y-2"><Label htmlFor="invite-last">Nachname</Label><Input id="invite-last" value={nachname} onChange={(event) => setNachname(event.target.value)} autoComplete="family-name" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="invite-password">Neues Passwort</Label><Input id="invite-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="invite-confirm">Passwort erneut eingeben</Label><Input id="invite-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
              <Button className="w-full" onClick={saveNewPassword} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Passwort speichern
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}