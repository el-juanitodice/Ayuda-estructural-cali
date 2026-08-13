import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { fetchFotoBlobUrl } from '@/lib/foto';
import type { FotoResumen } from '@/types/revision';

export function ReviewPhotoGallery({
  fotos,
  vacio = 'Sin fotos en la captura.',
  mostrarOrigen = false,
}: {
  fotos: FotoResumen[];
  vacio?: string;
  mostrarOrigen?: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [grande, setGrande] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargadas: Record<string, string> = {};

    (async () => {
      for (const f of fotos.slice(0, 60)) {
        try {
          const url = await fetchFotoBlobUrl(f.uuid, 'thumb');
          if (cancelado) {
            URL.revokeObjectURL(url);
            return;
          }
          cargadas[f.uuid] = url;
        } catch {
          /* sin imagen */
        }
      }
      if (!cancelado) setUrls(cargadas);
    })();

    return () => {
      cancelado = true;
      Object.values(cargadas).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [fotos]);

  const abrir = async (f: FotoResumen) => {
    try {
      const url = await fetchFotoBlobUrl(f.uuid, 'full');
      setGrande(url);
    } catch {
      /* nada */
    }
  };

  const cerrarGrande = () => {
    if (grande) URL.revokeObjectURL(grande);
    setGrande(null);
  };

  if (!fotos.length) {
    return <p className="text-sm text-muted-foreground">{vacio}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {fotos.map((f) => (
          <button
            key={f.uuid}
            type="button"
            className="group overflow-hidden rounded-md border bg-muted text-left"
            onClick={() => abrir(f)}
          >
            {urls[f.uuid] ? (
              <img
                src={urls[f.uuid]}
                alt={f.categoria}
                className="aspect-square w-full object-cover transition group-hover:opacity-90"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                …
              </div>
            )}
            <figcaption className="truncate px-2 py-1 text-xs text-muted-foreground">
              {f.categoria.replace(/_/g, ' ')}
              {f.piso ? ` · piso ${f.piso}` : ''}
              {mostrarOrigen && f.origen === 'ciudadano' ? ' · reportante' : ''}
            </figcaption>
          </button>
        ))}
      </div>

      <Dialog open={!!grande} onOpenChange={(o) => !o && cerrarGrande()}>
        <DialogContent className="max-w-4xl p-2">
          {grande && (
            <img src={grande} alt="Foto ampliada" className="max-h-[80vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
