/**
 * Revisión y firma — ingeniero A (punto 7, BRIEF §2.1 y §2.6).
 *
 * El sistema calcula la habitabilidad sugerida EN VIVO y avisa discrepancias.
 * Nunca sobreescribe ni bloquea: si A elige otro color, exige justificación.
 * Firmar pide la contraseña de nuevo aunque la sesión esté activa.
 */

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import {
  NIVELES_RIESGO, ETIQUETA_HABITABILIDAD, HABITABILIDAD, verificarHabitabilidad,
} from '../../../shared/ais.js';
import { get, post } from '../api.js';

const html = htm.bind(h);

const ETIQUETA_RIESGO = {
  bajo: 'Bajo', bajo_medidas: 'Bajo con medidas', alto: 'Alto', muy_alto: 'Muy alto',
};
const NOMBRE_RIESGO = {
  estabilidad: 'Estabilidad global', geotecnico: 'Geotécnico',
  estructural: 'Estructural', no_estructural: 'No estructural',
};

function Galeria({ fotos }) {
  const [urls, setUrls] = useState({});
  const [grande, setGrande] = useState(null);

  useEffect(() => {
    (async () => {
      const nuevas = {};
      for (const f of fotos.slice(0, 60)) {
        try { nuevas[f.uuid] = (await get(`/fotos/${f.uuid}?tam=thumb`)).url; } catch { /* sin url */ }
      }
      setUrls(nuevas);
    })();
  }, [fotos]);

  const abrir = async (f) => {
    try { setGrande((await get(`/fotos/${f.uuid}?tam=full`)).url); } catch { /* nada */ }
  };

  return html`
    <div>
      <div class="galeria">
        ${fotos.map((f) => html`
          <figure onClick=${() => abrir(f)}>
            ${urls[f.uuid] ? html`<img src=${urls[f.uuid]} loading="lazy" />` : html`<div class="foto-carga">…</div>`}
            <figcaption>${f.categoria.replaceAll('_', ' ')}${f.piso ? ' · piso ' + f.piso : ''}</figcaption>
          </figure>`)}
      </div>
      ${grande && html`
        <div class="visor" onClick=${() => setGrande(null)}><img src=${grande} /></div>`}
    </div>`;
}

function Revision({ item, alCerrar, alFirmado }) {
  const [datos, setDatos] = useState(null);
  const [riesgos, setRiesgos] = useState({
    estabilidad: '', geotecnico: '', estructural: '', no_estructural: '',
  });
  const [colorFinal, setColorFinal] = useState('');
  const [motivo, setMotivo] = useState('');
  const [visita, setVisita] = useState(false);
  const [clave, setClave] = useState('');
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [msj, setMsj] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    get(`/campo/formularios/${item.formulario_uuid}`).then(setDatos).catch((e) => setMsj(e.message));
  }, [item.formulario_uuid]);

  if (!datos) return html`<p>${msj || 'Cargando captura…'}</p>`;
  const { formulario: f, danos, fotos } = datos;

  const chequeo = verificarHabitabilidad(riesgos, colorFinal || null);
  const discrepancia = chequeo.discrepancia === true;

  const firmar = async () => {
    setMsj(null);
    try {
      const { ticket_firma } = await post('/auth/reautenticar', { clave });
      const r = await post(`/campo/formularios/${item.formulario_uuid}/firmar`, {
        ticket_firma, riesgos,
        habitabilidad_final: colorFinal,
        motivo_discrepancia: discrepancia ? motivo : null,
        visita_presencial: visita,
      });
      setResultado(r);
      alFirmado();
    } catch (e) {
      setMsj(e.message);
      setPidiendoClave(false);
    } finally {
      setClave('');
    }
  };

  if (resultado) {
    return html`
      <div class="tarjeta">
        <h2>Dictamen firmado ✓</h2>
        <p class="color-dictamen color-${resultado.habitabilidad_final}">
          ${ETIQUETA_HABITABILIDAD[resultado.habitabilidad_final].toUpperCase()}</p>
        <p><strong>${resultado.recordatorio}</strong></p>
        <p><a href="#/aviso?uuid=${item.formulario_uuid}"><button>🖨️ Imprimir aviso de habitabilidad</button></a></p>
        <button class="secundario" onClick=${alCerrar}>← Volver a la cola de revisión</button>
      </div>`;
  }

  return html`
    <div class="tarjeta">
      <button class="secundario" onClick=${alCerrar}>← Cola de revisión</button>
      <h2>${f.consecutivo} — ${f.direccion || f.reporte_direccion}</h2>
      <p class="nota">Captura de campo: ${item.capturado_por_nombre || '—'}
        (matrícula ${item.capturado_por_matricula || '—'})
        · ${f.visita_presencial_b ? 'con visita presencial' : 'SIN visita presencial'}
        · ${new Date(f.capturado_en).toLocaleString('es-CO')}</p>
      ${f.requiere_nivel_a && html`<p class="etiqueta-urgente">Escalado: ${(f.motivo_escalacion || []).join(', ')}</p>`}

      <details open>
        <summary><strong>Captura (solo lectura)</strong></summary>
        <ul>
          <li>Sistema estructural: código ${f.sistema_estructural} · pisos: ${f.pisos_sobre_terreno} · época: ${f.anio_construccion}</li>
          <li>Colapso: ${f.colapso} · inclinación: ${f.inclinacion} · asentamiento: ${f.asentamiento} · talud: ${f.falla_talud}</li>
          <li>% daño global: ${f.porcentaje_dano} · piso con mayor daño: ${f.piso_mayor_dano || '—'}</li>
          <li>Comentarios de B: ${f.comentarios || '—'}</li>
        </ul>
        <table class="tabla-danos">
          <thead><tr><th>Elemento</th><th>ning.</th><th>leve</th><th>mod.</th><th>fuerte</th><th>severo</th></tr></thead>
          <tbody>${danos.map((d) => html`<tr>
            <td>${d.elemento.replaceAll('_', ' ')}</td><td>${d.pct_ninguno}</td><td>${d.pct_leve}</td>
            <td>${d.pct_moderado}</td><td>${d.pct_fuerte}</td><td>${d.pct_severo}</td></tr>`)}
          </tbody>
        </table>
      </details>

      <h3>Fotos (${fotos.length})</h3>
      <${Galeria} fotos=${fotos} />

      <h3>Dictamen — niveles de riesgo</h3>
      <div class="grid2">
        ${Object.keys(NOMBRE_RIESGO).map((k) => html`
          <label>${NOMBRE_RIESGO[k]}
            <select value=${riesgos[k]} onChange=${(e) => setRiesgos({ ...riesgos, [k]: e.target.value })}>
              <option value="">— asignar —</option>
              ${NIVELES_RIESGO.map((n) => html`<option value=${n}>${ETIQUETA_RIESGO[n]}</option>`)}
            </select></label>`)}
      </div>

      ${chequeo.sugerida && html`
        <p>Según los riesgos marcados corresponde:
          <span class="color-dictamen color-${chequeo.sugerida}" style="display:inline-block;padding:4px 12px">
            ${ETIQUETA_HABITABILIDAD[chequeo.sugerida].toUpperCase()}</span></p>`}

      <label>Habitabilidad final (tu criterio profesional)
        <select value=${colorFinal} onChange=${(e) => setColorFinal(e.target.value)}>
          <option value="">— elegir —</option>
          ${HABITABILIDAD.map((c) => html`<option value=${c}>${ETIQUETA_HABITABILIDAD[c]}</option>`)}
        </select></label>

      ${discrepancia && html`
        <p class="error">${chequeo.mensaje}</p>
        <label>Motivo de la discrepancia (obligatorio)
          <textarea rows="3" value=${motivo} onInput=${(e) => setMotivo(e.target.value)}></textarea></label>`}

      <label>¿Hiciste visita presencial?
        <input type="checkbox" checked=${visita} onChange=${(e) => setVisita(e.target.checked)} /></label>
      <p class="nota">Si cierras sin visitar queda registrado "revisión remota sobre
        captura de B" en el documento. No es una debilidad: es transparencia.</p>

      ${msj && html`<p class="error">${msj}</p>`}

      ${!pidiendoClave
        ? html`<button
            disabled=${!chequeo.sugerida || !colorFinal || (discrepancia && motivo.length < 5)}
            onClick=${() => setPidiendoClave(true)}>Firmar dictamen…</button>`
        : html`
          <div class="reauth">
            <p><strong>Confirma tu identidad para firmar</strong> (dictamen con matrícula profesional):</p>
            <label>Contraseña <input type="password" value=${clave}
              onInput=${(e) => setClave(e.target.value)} /></label>
            <button onClick=${firmar} disabled=${!clave}>Firmar ${ETIQUETA_HABITABILIDAD[colorFinal] || ''}</button>
            <button class="secundario" onClick=${() => setPidiendoClave(false)}>Cancelar</button>
          </div>`}
    </div>`;
}

export function PaginaDictamen() {
  const [cola, setCola] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    setAbierto(null);
    get('/campo/revision').then((r) => setCola(r.pendientes)).catch((e) => setError(e.message));
  };
  useEffect(cargar, []);

  if (error) return html`<p class="error">${error}</p>`;
  if (abierto) return html`<${Revision} item=${abierto} alCerrar=${() => setAbierto(null)} alFirmado=${() => {}} />`;
  if (!cola) return html`<p>Cargando…</p>`;

  return html`
    <div class="tarjeta">
      <h2>Cola de revisión — nivel A (${cola.length})</h2>
      <p class="nota">Capturas cerradas por ingenieros B esperando dictamen.
        Puedes cerrar remotamente sobre la captura: quedará registrado así.</p>
      ${cola.length === 0 && html`<p>No hay capturas pendientes de revisión.</p>`}
      <ul class="lista-cola">
        ${cola.map((c) => html`
          <li onClick=${() => setAbierto(c)}>
            <strong>${c.consecutivo}</strong> · ${c.direccion} (${c.barrio || 's/b'})
            ${c.requiere_nivel_a && html` <span class="etiqueta-urgente">escalado</span>`}
            <br /><small>Capturó ${c.capturado_por_nombre || '—'} ·
              ${new Date(c.capturado_en).toLocaleString('es-CO')}
              · ${c.visita_presencial_b ? 'presencial' : 'sin visita'}</small>
          </li>`)}
      </ul>
      <button class="secundario" onClick=${cargar}>Actualizar</button>
    </div>`;
}
