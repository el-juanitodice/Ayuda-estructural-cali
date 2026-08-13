/**
 * Selector de ubicación con marcador arrastrable.
 *
 * El GPS de un celular en zona urbana se equivoca entre 5 y 50 metros: puede
 * poner el punto en la casa del vecino. Y dentro de un edificio de concreto
 * a veces no funciona del todo. Por eso la persona SIEMPRE puede corregir:
 * arrastrando el marcador o tocando el mapa.
 *
 * La precisión declarada se vuelve null cuando se marca a mano: el moderador
 * necesita saber si la coordenada vino del GPS o del dedo de alguien.
 */

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const html = htm.bind(h);

const CALI = [3.4372, -76.5225];

export function SelectorUbicacion({ gps, alMover }) {
  const ref = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);

  useEffect(() => {
    if (mapaRef.current) return;
    const mapa = L.map(ref.current, { attributionControl: false })
      .setView(gps ? [gps.lat, gps.lng] : CALI, gps ? 18 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(mapa);

    const marcador = L.marker(gps ? [gps.lat, gps.lng] : CALI, {
      draggable: true, autoPan: true,
    }).addTo(mapa);

    const avisar = (latlng) => alMover({
      lat: Number(latlng.lat.toFixed(6)),
      lng: Number(latlng.lng.toFixed(6)),
      precision: null,          // marcado a mano
    });

    marcador.on('dragend', () => avisar(marcador.getLatLng()));
    mapa.on('click', (ev) => {
      marcador.setLatLng(ev.latlng);
      avisar(ev.latlng);
    });

    mapaRef.current = mapa;
    marcadorRef.current = marcador;
    // El contenedor puede montarse antes de tener tamaño final
    setTimeout(() => mapa.invalidateSize(), 200);

    return () => { mapa.remove(); mapaRef.current = null; };
  }, []);

  // Cuando llega una lectura NUEVA del GPS, recentra y mueve el marcador
  useEffect(() => {
    if (!gps || !mapaRef.current || gps.precision === null) return;
    marcadorRef.current.setLatLng([gps.lat, gps.lng]);
    mapaRef.current.setView([gps.lat, gps.lng], 18);
  }, [gps && gps.precision !== null ? `${gps.lat},${gps.lng}` : null]);

  return html`
    <div class="selector-ubicacion">
      <div class="mapa-selector" ref=${ref}></div>
      <p class="nota">
        📍 <strong>Arrastra el marcador</strong> (o toca el mapa) hasta la entrada
        exacta de la edificación. Acércate con dos dedos para más precisión.
        ${gps
          ? html`<br/><span class="ok">Ubicación marcada:</span>
              ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}
              ${gps.precision === null ? ' · marcada a mano' : ` · GPS ±${gps.precision} m`}`
          : html`<br/><span class="error">Aún no has marcado la ubicación:
              arrastra el marcador o toca el mapa.</span>`}
      </p>
    </div>`;
}
