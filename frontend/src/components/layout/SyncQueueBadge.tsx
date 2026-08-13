import { Camera, ClipboardList } from 'lucide-react';
import { useCampoSync } from '@/contexts/CampoSyncContext';
import { useUploadQueue } from '@/contexts/UploadQueueContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function SyncQueueBadge({ className }: { className?: string }) {
  const { usuario } = useAuth();
  const { pendientes: fotosPendientes } = useUploadQueue();
  const { formulariosPendientes } = useCampoSync();

  const esIngeniero = usuario?.rol === 'ingeniero_a' || usuario?.rol === 'ingeniero_b';
  const total = fotosPendientes + (esIngeniero ? formulariosPendientes : 0);

  if (total <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-semibold text-amber-950',
        className,
      )}
      title="Pendiente de subir cuando haya señal"
    >
      {fotosPendientes > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <Camera className="size-3" aria-hidden />
          {fotosPendientes}
        </span>
      )}
      {esIngeniero && formulariosPendientes > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <ClipboardList className="size-3" aria-hidden />
          {formulariosPendientes}
        </span>
      )}
    </span>
  );
}
