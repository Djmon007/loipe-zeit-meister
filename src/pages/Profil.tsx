import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Profil() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVorname(profile?.vorname ?? '');
    setNachname(profile?.nachname ?? '');
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    if (!vorname.trim() || !nachname.trim()) {
      toast({ title: 'Name fehlt', description: 'Bitte Vorname und Nachname eingeben.', variant: 'destructive' });
      return;
    }
    const changingPassword = Boolean(newPassword || confirmPassword || currentPassword);
    if (changingPassword && newPassword.length < 6) {
      toast({ title: 'Passwort zu kurz', description: 'Das neue Passwort muss mindestens 6 Zeichen haben.', variant: 'destructive' });
      return;
    }
    if (changingPassword && newPassword !== confirmPassword) {
      toast({ title: 'Passwörter stimmen nicht überein', variant: 'destructive' });
      return;
    }
    if (changingPassword && !currentPassword) {
      toast({ title: 'Aktuelles Passwort fehlt', description: 'Zur Bestätigung der Passwortänderung bitte das aktuelle Passwort eingeben.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error: profileError } = await supabase.from('profiles')
      .update({ vorname: vorname.trim(), nachname: nachname.trim() })
      .eq('user_id', user.id);
    if (profileError) {
      setSaving(false);
      toast({ title: 'Profil nicht gespeichert', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      return;
    }

    if (changingPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (passwordError) {
        setSaving(false);
        toast({ title: 'Passwort nicht geändert', description: passwordError.message, variant: 'destructive' });
        return;
      }
    }

    await refreshProfile();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaving(false);
    toast({ title: 'Änderungen gespeichert', description: changingPassword ? 'Profil und Passwort wurden aktualisiert.' : 'Ihr Name wurde aktualisiert.' });
  };

  return (
    <AppLayout title="Profil">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Meine Angaben</CardTitle>
          <CardDescription>Name anpassen oder ein neues Passwort festlegen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first">Vorname</Label>
              <Input id="profile-first" value={vorname} onChange={(event) => setVorname(event.target.value)} autoComplete="given-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last">Nachname</Label>
              <Input id="profile-last" value={nachname} onChange={(event) => setNachname(event.target.value)} autoComplete="family-name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-current-password">Aktuelles Passwort zur Bestätigung</Label>
            <Input id="profile-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-new-password">Neues Passwort</Label>
              <Input id="profile-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-confirm-password">Passwort erneut eingeben</Label>
              <Input id="profile-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Änderungen speichern
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}