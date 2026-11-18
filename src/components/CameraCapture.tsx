import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  /** Called when the in-app camera cannot be used, so the caller can fall back to the system camera. */
  onUnavailable: () => void;
}

const MAX_SIDE = 1600;

/**
 * In-app camera: keeps the browser in the foreground so Android does not kill
 * the page for low memory while the separate camera app is open.
 */
export function CameraCapture({ open, onOpenChange, onCapture, onUnavailable }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (!cancelled) onUnavailable();
      }
    };
    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onUnavailable]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onCapture(new File([blob], `beleg-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onOpenChange(false);
      },
      'image/jpeg',
      0.85,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4">
        <DialogHeader>
          <DialogTitle>Beleg fotografieren</DialogTitle>
          <DialogDescription>Beleg ins Bild halten und auf „Aufnehmen“ tippen.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full overflow-hidden rounded-lg bg-muted aspect-[3/4]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            onLoadedData={() => setReady(true)}
            className="h-full w-full object-cover"
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" className="flex-1 gap-2" onClick={takePhoto} disabled={!ready || busy}>
            <Camera className="h-4 w-4" /> Aufnehmen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
