/**
 * Panel de moderador (punto 4). Cola por señales objetivas, registro de
 * llamada, validar/descartar, asignar ingeniero (respetando escalación A).
 */

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import { get, post } from '../api.js';

const html = htm.bind(h);

function Detalle({ reporte, alCerrar, alHecho }) {
  const [notas, setNotas] = useState('');
  const [corr, setCorr] = useState({});
  const [ingenieros, setIngenieros] = useState([]);
  const [ingenieroId, setIngenieroId] = useState('');
  const [resultadoValidacion, setResultadoValidacion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    get('/moderacion/ingenieros').then((r) => setIngenieros(r.ingenieros)).catch(() => {});
  }, []);

  const validar = async () => {
    setError(null);
    try {
      const r = await post(`/moderacion/${reporte.uuid}/validar`, {
        notas_llamada: notas,
        correcciones: Object.keys(corr).length ? corr : undefined,
      });
      setResultadoValidacion(r);
    } catch (e) { setError(e.message); }
  };

  const descartar = async (motivo) => {
    setError(null);
    try {
      await post(`/moderacion/${reporte.uuid}/descartar`, { motivo });
      alHecho();
    } catch (e) { setError(e.message); }
  };

  const asignar = async () => {
    setError(null);
    try {
      await post(`/moderacion/${reporte.uuid}/asignar`, { ingeniero_id: Number(ingenieroId) });
      alHecho();
    } catch (e) { setError(e.message); }
  };

  const requiereA = resultadoValidacion?.requiere_nivel_a;
  const elegibles = requiereA
    ? ingenieros.filter((i) => i.rol === 'ingeniero_a')
    : ingenieros;

  return html`
    <div class="tarjeta detalle">
      <button class="secundario" onClick=${alCerrar}>← Volver a la cola</button>
      <h3>${reporte.consecutivo} — ${reporte.direccion}</h3>
      ${reporte.menciona_colapso && html`<p class="etiqueta-urgente">⚠️ Marcado como posible emergencia</p>`}
      <p><strong>Llamar a:</strong> ${reporte.reportante_nombre} —
         <a href="tel:${reporte.reportante_telefono}">${reporte.reportante_telefono}</a>
         (${reporte.reportante_relacion || 'sin relación declarada'})</p>
      <ul>
        <li>${reporte.barrio || 'Barrio sin declarar'} · ${reporte.tipo_edificacion || '—'}
            · ${reporte.pisos_declarados ?? '?'} pisos · ${reporte.unidades_declaradas ?? '?'} unidades
            · ${reporte.habitada ? 'habitada' : 'no habitada / sin dato'}</li>
        <li>Reportes del mismo predio: ${reporte.reportes_del_predio}</li>
        <li>Descripción: ${reporte.descripcion || '—'}</li>
      </ul>

      ${!resultadoValidacion && html`
        <h4>Registro de la llamada</h4>
        <label>Notas (obligatorio)
          <textarea rows="3" value=${notas} onInput=${(e) => setNotas(e.target.value)}
            placeholder="Confirmado con la propietaria. Edificio de 5 pisos…"></textarea></label>

        <details>
          <summary>Correcciones tras la llamada</summary>
          <label>Pisos <input type="number" min="1"
            onInput=${(e) => setCorr({ ...corr, pisos_declarados: Number(e.target.value) })} /></label>
          <label>Unidades <input type="number" min="1"
            onInput=${(e) => setCorr({ ...corr, unidades_declaradas: Number(e.target.value) })} /></label>
          <label>Comuna <input maxlength="10"
            onInput=${(e) => setCorr({ ...corr, comuna: e.target.value })} /></label>
          <label>¿Menciona colapso? <input type="checkbox"
            onChange=${(e) => setCorr({ ...corr, menciona_colapso: e.target.checked })} /></label>
          <label>¿Menciona inclinación? <input type="checkbox"
            onChange=${(e) => setCorr({ ...corr, menciona_inclinacion: e.target.checked })} /></label>
          <label>¿Indicio geotécnico (grietas en suelo, hundimiento)? <input type="checkbox"
            onChange=${(e) => setCorr({ ...corr, menciona_geotecnico: e.target.checked })} /></label>
        </details>

        <div class="acciones">
          <button onClick=${validar} disabled=${notas.length < 5}>✓ Validar</button>
          <button class="secundario" onClick=${() => descartar('duplicado')}>Duplicado</button>
          <button class="secundario" onClick=${() => descartar('no_contesta')}>No contesta</button>
          <button class="secundario" onClick=${() => descartar('fuera_de_zona')}>Fuera de zona</button>
          <button class="secundario" onClick=${() => descartar('spam')}>Spam</button>
        </div>`}

      ${resultadoValidacion && html`
        <div class="validado-ok">
          <p>✅ Validado. Ya aparece como punto gris en el mapa público.</p>
          ${requiereA && html`
            <p class="etiqueta-urgente">Escalado a nivel A (${resultadoValidacion.motivos.join(', ')}).
               Solo ingenieros nivel A en la lista.</p>`}
          <h4>Asignar ingeniero</h4>
          <label>
            <select value=${ingenieroId} onChange=${(e) => setIngenieroId(e.target.value)}>
              <option value="">— elegir —</option>
              ${elegibles.map((i) => html`
                <option value=${i.id}>
                  ${i.nombre} (${i.rol === 'ingeniero_a' ? 'A' : 'B'}) — ${i.carga_actual} activas
                </option>`)}
            </select></label>
          <div class="acciones">
            <button onClick=${asignar} disabled=${!ingenieroId}>Asignar</button>
            <button class="secundario" onClick=${alHecho}>Asignar después</button>
          </div>
        </div>`}

      ${error && html`<p class="error">${error}</p>`}
    </div>`;
}

export function PaginaModeracion() {
  const [cola, setCola] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    setAbierto(null);
    get('/moderacion/cola')
      .then((r) => setCola(r.reportes))
      .catch((e) => setError(e.message));
  };
  useEffect(cargar, []);

  if (error) return html`<p class="error">${error}</p>`;
  if (abierto) return html`<${Detalle} reporte=${abierto} alCerrar=${() => setAbierto(null)} alHecho=${cargar} />`;
  if (!cola) return html`<p>Cargando cola…</p>`;

  return html`
    <div class="tarjeta">
      <h2>Cola de moderación (${cola.length})</h2>
      <p class="nota">Ordenada por señales objetivas: reportes del mismo predio, uso
         indispensable, unidades, antigüedad. El acceso a teléfonos queda auditado.</p>
      ${cola.length === 0 && html`<p>No hay reportes nuevos. 🎉</p>`}
      <ul class="lista-cola">
        ${cola.map((r) => html`
          <li onClick=${() => setAbierto(r)}>
            <strong>${r.consecutivo}</strong> · ${r.direccion} (${r.barrio || 's/b'})
            ${r.menciona_colapso && html` <span class="etiqueta-urgente">⚠️</span>`}
            <br /><small>
              ${r.reportes_del_predio > 0 ? `+${r.reportes_del_predio} reportes del predio · ` : ''}
              ${r.unidades_declaradas ?? '?'} unidades ·
              ${new Date(r.creado_en).toLocaleString('es-CO')}
            </small>
          </li>`)}
      </ul>
      <button class="secundario" onClick=${cargar}>Actualizar</button>
    </div>`;
}
