import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportesService } from '@/api/reportes/reportes.service';
import { CALI_CENTER, COLORES_MAPA } from '@/constants/map';
import { htmlPopupMapa } from '@/lib/map-popup';
import type { MapaLeyenda } from '@/types/map';

export function useMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leyenda, setLeyenda] = useState<MapaLeyenda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinPuntos, setSinPuntos] = useState(false);

  useEffect(() => {
    const contenedor = containerRef.current;
    if (!contenedor) return;

    let mapa: L.Map | undefined;
    let cancelado = false;

    void (async () => {
      try {
        const datos = await reportesService.obtenerMapa();
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
            .bindPopup(htmlPopupMapa(p));
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

  return {
    containerRef,
    leyenda,
    error,
    sinPuntos,
  };
}
