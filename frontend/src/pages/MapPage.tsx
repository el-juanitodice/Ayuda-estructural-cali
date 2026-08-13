import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapLegend } from '@/components/map/MapLegend';
import { CALI_CENTER, COLORES_MAPA, ETIQUETAS_MAPA } from '@/constants/map';
import { get } from '@/lib/api';
import type { MapaPunto, MapaResponse } from '@/types/map';

function popupHtml(p: MapaPunto): string {
  const etiqueta = ETIQUETAS_MAPA[p.color] ?? p.color;
  const ubicacion = [p.barrio, p.comuna ? `(comuna ${p.comuna})` : ''].filter(Boolean).join(' ');
  const detalle =
    p.con_dictamen && p.dictaminado_en
      ? `Dictamen firmado el ${new Date(p.dictaminado_en).toLocaleDateString('es-CO')}`
      : 'Sin inspección técnica todavía';

  return (
    `<strong>${etiqueta}</strong><br>` +
    `${ubicacion}<br>` +
    `${detalle}<br>` +
    `<em>Ubicación aproximada (±100 m)</em>`
  );
}

export function MapPage() {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [leyenda, setLeyenda] = useState<MapaResponse['leyenda'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinPuntos, setSinPuntos] = useState(false);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    let mapa: L.Map | undefined;
    let cancelado = false;

    (async () => {
      try {
        const datos = await get<MapaResponse>('/mapa');
        if (cancelado) return;

        setLeyenda(datos.leyenda);
        setSinPuntos(datos.puntos.length === 0);

        mapa = L.map(contenedor).setView([CALI_CENTER.lat, CALI_CENTER.lng], CALI_CENTER.zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: '© OpenStreetMap',
        }).addTo(mapa);

        const capaMarcadores = L.layerGroup().addTo(mapa);

        for (const p of datos.puntos) {
          const lat = Number(p.lat);
          const lng = Number(p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          L.circleMarker([lat, lng], {
            radius: p.con_dictamen ? 8 : 6,
            color: '#333',
            weight: 1,
            fillColor: COLORES_MAPA[p.color] ?? COLORES_MAPA.gris,
            fillOpacity: 0.85,
          })
            .addTo(capaMarcadores)
            .bindPopup(popupHtml(p));
        }

        if (datos.puntos.length > 0) {
          const bounds = L.latLngBounds(
            datos.puntos.map((p) => [Number(p.lat), Number(p.lng)] as [number, number]),
          );
          mapa.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
        }

        requestAnimationFrame(() => mapa?.invalidateSize());
      } catch (e) {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el mapa');
        }
      }
    })();

    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && <p className="mb-2 text-sm font-medium text-destructive">{error}</p>}
      {sinPuntos && !error && (
        <p className="mb-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          No hay puntos en el mapa todavía. Los reportes aparecen en gris cuando un moderador los
          valida por teléfono. En desarrollo, activa <code className="text-xs">MAPA_INCLUIR_NUEVO=true</code>{' '}
          en el backend para ver reportes recién enviados.
        </p>
      )}
      <div
        ref={contenedorRef}
        className="relative z-0 isolate min-h-[300px] flex-1 rounded-lg border"
        aria-label="Mapa público de inspecciones en Cali"
      />
      <MapLegend leyenda={leyenda} />
    </div>
  );
}
