/** Consulta ciudadana por número de radicado. Solo estado y fechas. */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import { get } from '../api.js';

const html = htm.bind(h);

const DESCRIPCION_ESTADO = {
  nuevo: 'Recibido. Un moderador te llamará para confirmar los datos.',
  validado: 'Validado por teléfono. En cola para asignar un ingeniero.',
  asignado: 'Un ingeniero tiene asignada la visita.',
  en_captura: 'El ingeniero está haciendo la inspección de campo.',
  en_revision_a: 'La captura está en revisión de un ingeniero nivel A.',
  requiere_especialista: 'Requiere un especialista. Sigue en proceso.',
  vencido: 'La asignación venció; volverá a asignarse.',
  cerrado: 'Inspección cerrada con dictamen firmado.',
  revisado_sin_inspeccion: 'Revisado. No se programó inspección para este reporte.',
};

const COLOR_TEXTO = {
  verde: 'HABITABLE', amarillo: 'USO RESTRINGIDO',
  naranja: 'NO HABITABLE', rojo: 'PELIGRO DE COLAPSO',
};

export function PaginaEstado() {
  const [radicado, setRadicado] = useState('');
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);

  const consultar = async (ev) => {
    ev.preventDefault();
    setError(null); setR(null);
    try {
      setR(await get(`/reportes/${radicado.trim().toUpperCase()}/estado`));
    } catch (e) { setError(e.message); }
  };

  return html`
    <div class="tarjeta">
      <h2>Consultar mi reporte</h2>
      <form onSubmit=${consultar}>
        <label>Número de radicado
          <input required pattern="CAL-\\d{4}-\\d{5}" placeholder="CAL-2026-00123"
                 value=${radicado} onInput=${(ev) => setRadicado(ev.target.value)} /></label>
        <button type="submit">Consultar</button>
      </form>
      ${error && html`<p class="error">${error}</p>`}
      ${r && html`
        <div class="estado-resultado">
          <h3>${r.consecutivo}</h3>
          ${r.color && html`<p class="color-dictamen color-${r.color}">${COLOR_TEXTO[r.color]}</p>`}
          <p>${DESCRIPCION_ESTADO[r.estado] || r.estado}</p>
          <ul>
            <li>Recibido: ${new Date(r.creado_en).toLocaleString('es-CO')}</li>
            ${r.validado_en && html`<li>Validado: ${new Date(r.validado_en).toLocaleString('es-CO')}</li>`}
            ${r.firmado_en && html`<li>Dictamen firmado: ${new Date(r.firmado_en).toLocaleString('es-CO')}</li>`}
          </ul>
          ${r.color && html`<p class="nota">El ingeniero deja un aviso físico del color en la
            entrada de la edificación. Si tienes dudas sobre qué significa, pregunta
            al ingeniero o al punto de atención de tu comuna.</p>`}
        </div>`}
    </div>`;
}
