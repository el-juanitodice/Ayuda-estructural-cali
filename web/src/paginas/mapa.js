/**
 * Mapa público (punto 5, BRIEF §2.2).
 *
 *  - Gris = reportado sin inspección. Color = dictamen firmado.
 *  - La leyenda viene DEL SERVIDOR y se muestra fija, sin poder colapsarse.
 *  - Las coordenadas ya llegan difuminadas a ~100 m (vista mapa_publico).
 */

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import htm from 'htm';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../api.js';

const html = htm.bind(h);

const COLORES = {
  gris: '#8a8a8a', verde: '#2e7d32', amarillo: '#f9a825',
  naranja: '#ef6c00', rojo: '#c62828',
};
const ETIQUETAS = {
  gris: 'Reportado, sin inspección', verde: 'Habitable',
  amarillo: 'Uso restringido', naranja: 'No habitable', rojo: 'Peligro de colapso',
};

export function PaginaMapa() {
  const ref = useRef(null);
  const [leyenda, setLeyenda] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mapa;
    (async () => {
      try {
        const datos = await get('/mapa');
        setLeyenda(datos.leyenda);

        mapa = L.map(ref.current).setView([3.4372, -76.5225], 12); // Cali
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 17, // coherente con la difuminación de ~100 m
          attribution: '© OpenStreetMap',
        }).addTo(mapa);

        for (const p of datos.puntos) {
          L.circleMarker([p.lat, p.lng], {
            radius: p.con_dictamen ? 8 : 6,
            color: '#333', weight: 1,
            fillColor: COLORES[p.color] || COLORES.gris,
            fillOpacity: 0.85,
          }).addTo(mapa).bindPopup(
            `<strong>${ETIQUETAS[p.color] || p.color}</strong><br>` +
            `${p.barrio || ''} ${p.comuna ? '(comuna ' + p.comuna + ')' : ''}<br>` +
            (p.con_dictamen
              ? `Dictamen firmado el ${new Date(p.dictaminado_en).toLocaleDateString('es-CO')}`
              : 'Sin inspección técnica todavía') +
            '<br><em>Ubicación aproximada (±100 m)</em>',
          );
        }
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => mapa && mapa.remove();
  }, []);

  return html`
    <div class="pagina-mapa">
      ${error && html`<p class="error">${error}</p>`}
      <div class="mapa" ref=${ref}></div>

      <!-- Leyenda obligatoria: siempre visible, sin poder colapsarse (BRIEF §2.2) -->
      <div class="leyenda-fija" role="note">
        <div class="leyenda-colores">
          <span><i style="background:${COLORES.gris}"></i> Reportado, sin inspección. No indica daño.</span>
          <span><i style="background:${COLORES.verde}"></i> Habitable</span>
          <span><i style="background:${COLORES.amarillo}"></i> Uso restringido</span>
          <span><i style="background:${COLORES.naranja}"></i> No habitable</span>
          <span><i style="background:${COLORES.rojo}"></i> Peligro de colapso</span>
        </div>
        <p class="advertencia">
          ⚠️ ${leyenda ? leyenda.advertencia
            : 'Que no haya punto no significa que una edificación esté en buen estado.'}
        </p>
      </div>
    </div>`;
}
