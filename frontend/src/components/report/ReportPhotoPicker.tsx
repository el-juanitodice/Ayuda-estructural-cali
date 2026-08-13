import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MAX_FOTOS_REPORTE = 20;

interface ReportPhotoPickerProps {
  fotos: File[];
  onChange: (fotos: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ReportPhotoPicker({ fotos, onChange, disabled, className }: ReportPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = fotos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);

  const agregar = (lista: FileList | null) => {
    if (!lista?.length) return;
    const nuevas = [...fotos, ...Array.from(lista)].slice(0, MAX_FOTOS_REPORTE);
    onChange(nuevas);
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = (indice: number) => {
    onChange(fotos.filter((_, i) => i !== indice));
  };

  return (
    <section className={cn('mt-1 flex min-h-0 flex-col space-y-3 border-t pt-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Fotos del daño (opcional, se suben solas al enviar)
        </p>
        <span className="text-xs text-muted-foreground">
          {fotos.length}/{MAX_FOTOS_REPORTE}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="sr-only"
        disabled={disabled || fotos.length >= MAX_FOTOS_REPORTE}
        onChange={(e) => agregar(e.target.files)}
      />

      {fotos.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-8 sm:min-h-[260px] lg:min-h-0">
          <p className="flex max-w-xs items-center gap-2 text-center text-xs text-muted-foreground">
            <ImagePlus className="size-4 shrink-0" />
            Ayuda al moderador a ver el daño antes de la visita.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={disabled || fotos.length >= MAX_FOTOS_REPORTE}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" />
            Tomar o elegir foto
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={disabled || fotos.length >= MAX_FOTOS_REPORTE}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" />
              Tomar o elegir foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              Quitar todas
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                <img src={url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Quitar foto"
                  className={cn(
                    'absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white',
                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                  )}
                  onClick={() => quitar(i)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
