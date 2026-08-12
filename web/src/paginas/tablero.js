/** Tablero del coordinador (punto 10): cobertura, discrepancias, vencimientos, CSV. */

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import { get } from '../api.js';

const html = htm.bind(h);

export function PaginaTablero() {
  const [cobertura, setCobertura] = useState(null);
  const [discrepancias, setDiscrepancias] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [error, setError] = useState(null);

  const cargar = () => {
    get('/tablero/cobertura').then(setCobertura).catch((e) => setError(e.message));
    get('/tablero/discrepancias').then((r) => setDiscrepancias(r.discrepancias)).catch(() => {});
    get('/tablero/vencimientos').then((r) => setVencimientos(r.asignaciones)).catch(() => {});
  };
  useEffect(cargar, []);

  if (error) return html`<p class="error">${error}</p>`;
  if (!cobertura) return html`<p>Cargando tablero…</p>`;

  return html`
    <div class="tarjeta">
      <h2>Tablero de coordinación</h2>

      <h3>Dictámenes por color</h3>
      <div class="contadores-color">
        ${['verde', 'amarillo', 'naranja', 'rojo'].map((c) => {
          const fila = cobertura.por_color.find((x) => x.color === c);
          return html`<span class="color-dictamen color-${c}">${fila ? fila.total : 0}</span>`;
        })}
      </div>

      <h3>Cobertura por comuna</h3>
      <table class="tabla-danos">
        <thead><tr><th>Comuna</th><th>Nuevos</th><th>Por asignar</th><th>En proceso</th><th>Cerrados</th></tr></thead>
        <tbody>
          ${cobertura.por_comuna.map((c) => html`<tr>
            <td>${c.comuna}</td><td>${c.nuevos}</td><td>${c.por_asignar}</td>
            <td>${c.en_proceso}</td><td>${c.cerrados}</td></tr>`)}
        </tbody>
      </table>

      <h3>Asignaciones por vencer (${vencimientos.length})</h3>
      <ul class="lista-cola">
        ${vencimientos.map((v) => html`
          <li>
            <strong>${v.consecutivo}</strong> · ${v.ingeniero} (${v.nivel === 'ingeniero_a' ? 'A' : 'B'})
            ${v.vencida ? html` <span class="etiqueta-urgente">VENCIDA</span>` : ''}
            <br /><small>Vence ${new Date(v.vence_en).toLocaleString('es-CO')}
              · ${v.abierta_en ? 'abierta' : 'SIN ABRIR'}</small>
          </li>`)}
      </ul>

      <h3>Discrepancias firmadas (${discrepancias.length})</h3>
      <p class="nota">Color firmado distinto del sugerido, con su justificación. Cola de revisión de calidad.</p>
      <ul class="lista-cola">
        ${discrepancias.map((d) => html`
          <li>
            <strong>${d.consecutivo}</strong> · sugerido <b>${d.sugerida}</b> → firmado <b>${d.final}</b>
            por ${d.firmado_por_nombre} (mat. ${d.matricula})
            <br /><small>"${d.motivo_discrepancia}"</small>
          </li>`)}
      </ul>

      <h3>Exportar</h3>
      <p class="nota">CSV sin datos personales del reportante (Ley 1581). La exportación queda auditada.</p>
      <a href="/api/v1/tablero/exportar?formato=csv" download><button>⬇️ Exportar CSV</button></a>
      <button class="secundario" onClick=${cargar}>Actualizar</button>
    </div>`;
}
