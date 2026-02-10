import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Upload, Camera, FileText, Loader2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Expense {
  id: string;
  datum: string;
  betrag: number | null;
  beschreibung: string | null;
  beleg_url: string | null;
  beleg_filename: string | null;
}

export default function Spesen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [beschreibung, setBeschreibung] = useState('');
  const [betrag, setBetrag] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editBetrag, setEditBetrag] = useState('');
  const [editBeschreibung, setEditBeschreibung] = useState('');
  const [editDate, setEditDate] = useState('');

  // View receipt dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewUrl, setViewUrl] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }

    setExpenses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Ungültiger Dateityp', description: 'Bitte JPEG, PNG oder PDF hochladen', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Datei zu gross', description: 'Maximale Dateigrösse ist 10 MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadExpense = async () => {
    if (!user || !selectedFile) return;

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('belege')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) for signed URL generation
      const { error: dbError } = await supabase.from('expenses').insert({
        user_id: user.id,
        datum: selectedDate,
        betrag: betrag ? parseFloat(betrag) : null,
        beschreibung: beschreibung || null,
        beleg_url: fileName,
        beleg_filename: selectedFile.name,
      });

      if (dbError) throw dbError;

      setSelectedFile(null);
      setBeschreibung('');
      setBetrag('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      fetchExpenses();
      toast({ title: 'Beleg hochgeladen', description: 'Spesen wurden erfasst' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Fehler', description: 'Beleg konnte nicht hochgeladen werden', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const viewReceipt = async (expense: Expense) => {
    if (!expense.beleg_url) return;

    // Try to create a signed URL for private bucket
    const filePath = expense.beleg_url;
    
    // If it's already a full URL (legacy data), open directly
    if (filePath.startsWith('http')) {
      window.open(filePath, '_blank');
      return;
    }

    const { data, error } = await supabase.storage
      .from('belege')
      .createSignedUrl(filePath, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      toast({ title: 'Fehler', description: 'Beleg konnte nicht geladen werden', variant: 'destructive' });
      return;
    }

    setViewUrl(data.signedUrl);
    setViewDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setEditBetrag(expense.betrag?.toString() || '');
    setEditBeschreibung(expense.beschreibung || '');
    setEditDate(expense.datum);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingExpense) return;

    setUploading(true);

    const { error } = await supabase
      .from('expenses')
      .update({
        betrag: editBetrag ? parseFloat(editBetrag) : null,
        beschreibung: editBeschreibung || null,
        datum: editDate,
      })
      .eq('id', editingExpense.id);

    setUploading(false);

    if (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht aktualisiert werden', variant: 'destructive' });
      return;
    }

    setEditDialogOpen(false);
    setEditingExpense(null);
    fetchExpenses();
    toast({ title: 'Aktualisiert', description: 'Spesen-Eintrag wurde geändert' });
  };

  return (
    <AppLayout title="Spesen">
      <div className="space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Beleg erfassen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-alpine" />
            </div>

            <div className="space-y-2">
              <Label>Betrag (CHF)</Label>
              <Input type="number" step="0.05" min="0" placeholder="0.00" value={betrag} onChange={(e) => setBetrag(e.target.value)} className="input-alpine" />
            </div>

            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea placeholder="z.B. Material, Restaurant..." value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} className="input-alpine resize-none" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Beleg</Label>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Foto
                </Button>
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Datei
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileSelect} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; if (cameraInputRef.current) cameraInputRef.current.value = ''; }}>✕</Button>
              </div>
            )}

            <Button onClick={uploadExpense} disabled={uploading || !selectedFile} className="w-full gap-2">
              {uploading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Hochladen...</>) : (<><Upload className="h-4 w-4" /> Beleg speichern</>)}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Belege</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Laden...</p>
            ) : expenses.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Belege vorhanden</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.beschreibung || expense.beleg_filename || 'Beleg'}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(expense.datum), 'dd.MM.yyyy', { locale: de })}</span>
                        {expense.betrag !== null && (
                          <span className="font-medium text-foreground">CHF {expense.betrag.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {expense.beleg_url && (
                        <Button variant="ghost" size="sm" onClick={() => viewReceipt(expense)}>
                          Ansehen
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input-alpine" />
              </div>
              <div className="space-y-2">
                <Label>Betrag (CHF)</Label>
                <Input type="number" step="0.05" min="0" value={editBetrag} onChange={(e) => setEditBetrag(e.target.value)} className="input-alpine" />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={editBeschreibung} onChange={(e) => setEditBeschreibung(e.target.value)} className="input-alpine resize-none" rows={2} />
              </div>
              <Button onClick={saveEdit} disabled={uploading} className="w-full">{uploading ? 'Speichern...' : 'Änderungen speichern'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Receipt Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Beleg</DialogTitle></DialogHeader>
            <div className="mt-4">
              {viewUrl && (
                viewUrl.match(/\.pdf/i) ? (
                  <iframe src={viewUrl} className="w-full h-96 rounded border" />
                ) : (
                  <img src={viewUrl} alt="Beleg" className="w-full rounded" />
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
