import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CALI_CENTER } from '@/constants/map';
import {
  describirUbicacionReporte,
  gpsEnAreaCali,
  LIMITES_GPS_CALI,
  PRECISION_UBICACION_MANUAL_M,
  type UbicacionReporte,
} from '@/lib/reporte';
import { cn } from '@/lib/utils';
import { geocodificarInverso } from '@/lib/geocoding';

interface ReportLocationPickerProps {
  ubicacion: UbicacionReporte | null;
  onUbicacionChange: (ubicacion: UbicacionReporte) => void;
  onDireccionDetectada?: (datos: { direccion: string; barrio?: string | null }) => void;
  onError?: (mensaje: string | null) => void;
  className?: string;
}

function crearIconoMarcador() {
  return L.divIcon({
    className: 'report-location-marker-wrap',
    html: '<span class="report-location-marker" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ubicacionManual(lat: number, lng: number): UbicacionReporte {
  return {
    lat,
    lng,
    precision: PRECISION_UBICACION_MANUAL_M,
    origen: 'manual',
  };
}

export function ReportLocationPicker({
  ubicacion,
  onUbicacionChange,
  onDireccionDetectada,
  onError,
  className,
}: ReportLocationPickerProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onUbicacionChange);
  const onDireccionRef = useRef(onDireccionDetectada);
  const onErrorRef = useRef(onError);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);

  onChangeRef.current = onUbicacionChange;
  onDireccionRef.current = onDireccionDetectada;
  onErrorRef.current = onError;

  const geocodeSeqRef = useRef(0);

  const resolverDireccion = useCallback(async (lat: number, lng: number) => {
    const seq = ++geocodeSeqRef.current;
    setBuscandoDireccion(true);
    try {
      const { direccion, barrio } = await geocodificarInverso(lat, lng);
      if (seq !== geocodeSeqRef.current) return;
      if (direccion) {
        onDireccionRef.current?.({ direccion, barrio });
      }
    } catch {
      /* la dirección se puede escribir a mano */
    } finally {
      if (seq === geocodeSeqRef.current) {
        setBuscandoDireccion(false);
      }
    }
  }, []);

  const resolverDireccionRef = useRef(resolverDireccion);
  resolverDireccionRef.current = resolverDireccion;

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const bounds = L.latLngBounds(
      [LIMITES_GPS_CALI.latMin, LIMITES_GPS_CALI.lngMin],
      [LIMITES_GPS_CALI.latMax, LIMITES_GPS_CALI.lngMax],
    );

    const mapa = L.map(contenedor, { scrollWheelZoom: true }).setView(
      [CALI_CENTER.lat, CALI_CENTER.lng],
      CALI_CENTER.zoom,
    );

    mapa.setMaxBounds(bounds.pad(0.05));

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(mapa);

    const icono = crearIconoMarcador();

    const colocarMarcador = (lat: number, lng: number, emitir: boolean, origen: UbicacionReporte['origen'], precision?: number) => {
      if (marcadorRef.current) {
        marcadorRef.current.setLatLng([lat, lng]);
      } else {
        const marcador = L.marker([lat, lng], { draggable: true, icon: icono }).addTo(mapa);
        marcador.on('dragend', () => {
          const punto = marcador.getLatLng();
          onChangeRef.current(ubicacionManual(punto.lat, punto.lng));
          onErrorRef.current?.(null);
          void resolverDireccionRef.current(punto.lat, punto.lng);
        });
        marcadorRef.current = marcador;
      }

      if (emitir) {
        onChangeRef.current({
          lat,
          lng,
          precision: origen === 'manual' ? PRECISION_UBICACION_MANUAL_M : Math.round(precision ?? PRECISION_UBICACION_MANUAL_M),
          origen,
        });
        onErrorRef.current?.(null);
      }
    };

    mapa.on('click', (evento) => {
      const { lat, lng } = evento.latlng;
      colocarMarcador(lat, lng, true, 'manual');
      void resolverDireccionRef.current(lat, lng);
    });

    mapaRef.current = mapa;
    (mapa as L.Map & { __colocarMarcador?: typeof colocarMarcador }).__colocarMarcador = colocarMarcador;

    requestAnimationFrame(() => mapa.invalidateSize());

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current as (L.Map & { __colocarMarcador?: (lat: number, lng: number, emitir: boolean, origen: UbicacionReporte['origen'], precision?: number) => void }) | null;
    if (!mapa || !ubicacion) return;

    mapa.__colocarMarcador?.(
      ubicacion.lat,
      ubicacion.lng,
      false,
      ubicacion.origen,
      ubicacion.precision,
    );

    const zoom = Math.max(mapa.getZoom(), ubicacion.origen === 'gps' ? 16 : 17);
    mapa.setView([ubicacion.lat, ubicacion.lng], zoom, { animate: true });
  }, [ubicacion]);

  const pedirGps = () => {
    onErrorRef.current?.(null);

    if (!window.isSecureContext) {
      onErrorRef.current?.(
        'El GPS requiere conexión segura (HTTPS). Abre la app con https:// en lugar de http://.',
      );
      return;
    }
    if (!navigator.geolocation) {
      onErrorRef.current?.('Tu navegador no soporta geolocalización. Ubica el predio manualmente en el mapa.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lat = posicion.coords.latitude;
        const lng = posicion.coords.longitude;

        if (!gpsEnAreaCali(lat, lng)) {
          onErrorRef.current?.(
            'El GPS está fuera del área de Cali. Acerca el mapa al predio y coloca el marcador manualmente.',
          );
          return;
        }

        onChangeRef.current({
          lat,
          lng,
          precision: Math.round(posicion.coords.accuracy),
          origen: 'gps',
        });

        void resolverDireccionRef.current(lat, lng);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onErrorRef.current?.(
            'Permiso de ubicación denegado. Coloca el marcador manualmente en el mapa.',
          );
          return;
        }
        if (err.code === err.TIMEOUT) {
          onErrorRef.current?.(
            'No pudimos obtener el GPS a tiempo. Coloca el marcador manualmente en el mapa.',
          );
          return;
        }
        onErrorRef.current?.(
          'No pudimos obtener tu ubicación. Coloca el marcador manualmente en el mapa.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Toca el mapa o arrastra el marcador para ubicar el predio. Si el GPS falla, hazlo manualmente.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 shrink-0"
          onClick={pedirGps}
          disabled={buscandoDireccion}
        >
          <MapPin className="size-4" />
          {buscandoDireccion ? 'Buscando dirección…' : 'Usar GPS'}
        </Button>
      </div>

      <div
        ref={contenedorRef}
        className="relative z-0 isolate h-[220px] rounded-lg border bg-muted/20 sm:h-[260px]"
        aria-label="Mapa para ubicar el predio"
      />

      {buscandoDireccion && (
        <p className="text-xs text-muted-foreground">Buscando dirección…</p>
      )}

      {ubicacion && (
        <p className="text-xs text-muted-foreground">
          {describirUbicacionReporte(ubicacion)} · {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}
          {!gpsEnAreaCali(ubicacion.lat, ubicacion.lng) && (
            <span className="font-medium text-destructive"> · Fuera del área de Cali</span>
          )}
        </p>
      )}
    </div>
  );
}
