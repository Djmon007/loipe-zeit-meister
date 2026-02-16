import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo.jpg';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
});

const signupSchema = loginSchema.extend({
  vorname: z.string().min(1, 'Vorname ist erforderlich'),
  nachname: z.string().min(1, 'Nachname ist erforderlich'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[`login_${error.path[0]}`] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      let message = 'Anmeldung fehlgeschlagen';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Ungültige E-Mail oder Passwort';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Bitte bestätigen Sie Ihre E-Mail-Adresse';
      }
      toast({
        title: 'Fehler',
        description: message,
        variant: 'destructive',
      });
    } else {
      navigate('/zeiterfassung');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        vorname,
        nachname,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[`signup_${error.path[0]}`] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, vorname, nachname);
    setLoading(false);

    if (error) {
      let message = 'Registrierung fehlgeschlagen';
      if (error.message.includes('already registered')) {
        message = 'Diese E-Mail-Adresse ist bereits registriert';
      }
      toast({
        title: 'Fehler',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Registrierung erfolgreich',
        description: 'Bitte überprüfen Sie Ihre E-Mail für die Bestätigung.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-sky-100">
            <img 
              src={logo} 
              alt="Loipen Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">Loipen Arbeitszeit</CardTitle>
            <CardDescription>Zeiterfassung & Protokoll</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@beispiel.ch"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="input-alpine"
                    required
                  />
                  {errors.login_email && (
                    <p className="text-sm text-destructive">{errors.login_email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="input-alpine"
                    required
                  />
                  {errors.login_password && (
                    <p className="text-sm text-destructive">{errors.login_password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Anmelden
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vorname">Vorname</Label>
                    <Input
                      id="vorname"
                      placeholder="Max"
                      value={vorname}
                      onChange={(e) => setVorname(e.target.value)}
                      className="input-alpine"
                      required
                    />
                    {errors.signup_vorname && (
                      <p className="text-sm text-destructive">{errors.signup_vorname}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nachname">Nachname</Label>
                    <Input
                      id="nachname"
                      placeholder="Muster"
                      value={nachname}
                      onChange={(e) => setNachname(e.target.value)}
                      className="input-alpine"
                      required
                    />
                    {errors.signup_nachname && (
                      <p className="text-sm text-destructive">{errors.signup_nachname}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@beispiel.ch"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="input-alpine"
                    required
                  />
                  {errors.signup_email && (
                    <p className="text-sm text-destructive">{errors.signup_email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="input-alpine"
                    required
                  />
                  {errors.signup_password && (
                    <p className="text-sm text-destructive">{errors.signup_password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="input-alpine"
                    required
                  />
                  {errors.signup_confirmPassword && (
                    <p className="text-sm text-destructive">{errors.signup_confirmPassword}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrieren
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
