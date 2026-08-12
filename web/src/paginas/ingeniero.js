/**
 * Captura de campo — ingeniero B (y A cuando captura directo). Punto 6.
 *
 * Reglas: local-first con autoguardado EN CADA CAMBIO (BRIEF §4.1);
 * B no ve riesgos ni color (eso es del dictamen, página aparte);
 * el formulario se adapta al sistema estructural (elementosEstructurales).
 */

import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import htm from 'htm';
import {
  USOS, SISTEMAS_ESTRUCTURALES, elementosEstructurales,
  ELEMENTOS_NO_ESTRUCTURALES, validarMatrizDanos, completarConNinguno,
  CATEGORIAS_FOTO,
} from '../../../shared/ais.js';
import {
  guardarLocal, formularioDeReporte, refrescarAsignaciones,
  iniciarSyncCampo, alCambiarPendientes, sincronizar,
} from '../campo/sync.js';
import { encolarFoto } from '../fotos/cola-subida.js';

const html = htm.bind(h);
const NIVELES_DANO = ['ninguno', 'leve', 'moderado', 'fuerte', 'severo'];

function filaVacia(grupo, elemento) {
  return { grupo, elemento, pct_ninguno: 100, pct_leve: 0, pct_moderado: 0, pct_fuerte: 0, pct_severo: 0 };
}

function MatrizDanos({ filas, onCambio }) {
  const validacion = validarMatrizDanos(filas.map((d) => ({
    elemento: d.elemento, ninguno: d.pct_ninguno, leve: d.pct_leve,
    moderado: d.pct_moderado, fuerte: d.pct_fuerte, severo: d.pct_severo,
  })));

  const setPct = (i, nivel, valor) => {
    const nuevas = filas.slice();
    nuevas[i] = { ...nuevas[i], ['pct_' + nivel]: Math.max(0, Math.min(100, Number(valor) || 0)) };
    onCambio(nuevas);
  };
  const completar = (i) => {
    const f = filas[i];
    const c = completarConNinguno({
      leve: f.pct_leve, moderado: f.pct_moderado, fuerte: f.pct_fuerte, severo: f.pct_severo,
    });
    const nuevas = filas.slice();
    nuevas[i] = { ...f, pct_ninguno: c.ninguno };
    onCambio(nuevas);
  };

  return html`
    <div class="matriz">
      <table>
        <thead><tr><th>Elemento</th>${NIVELES_DANO.map((n) => html`<th>${n}</th>`)}<th></th></tr></thead>
        <tbody>
          ${filas.map((f, i) => {
            const suma = NIVELES_DANO.reduce((a, n) => a + (f['pct_' + n] || 0), 0);
            return html`<tr class=${suma !== 100 ? 'fila-mal' : ''}>
              <td>${f.elemento.replaceAll('_', ' ')}</td>
              ${NIVELES_DANO.map((n) => html`
                <td><input type="number" min="0" max="100" inputmode="numeric"
                  value=${f['pct_' + n]}
                  onInput=${(e) => setPct(i, n, e.target.value)} /></td>`)}
              <td>${suma !== 100
                ? html`<button type="button" class="mini" title="Completar con ninguno"
                    onClick=${() => completar(i)}>=${100 - suma > 0 ? '+' : ''}${100 - suma}</button>`
                : '✓'}</td>
            </tr>`;
          })}
        </tbody>
      </table>
      ${!validacion.ok && html`<p class="error">Cada fila debe sumar exactamente 100%.</p>`}
    </div>`;
}

function Formulario({ asignacion, alVolver }) {
  const [f, setF] = useState(null);
  const [msj, setMsj] = useState(null);
  const [fotosMsj, setFotosMsj] = useState(null);

  // Carga (o crea) el borrador local
  useEffect(() => {
    (async () => {
      let borrador = await formularioDeReporte(asignacion.reporte_uuid);
      if (!borrador) {
        borrador = {
          uuid: crypto.randomUUID(),
          reporte_uuid: asignacion.reporte_uuid,
          estado: 'borrador',
          creado_offline_en: new Date().toISOString(),
          direccion: asignacion.direccion,
          barrio: asignacion.barrio,
          comuna: asignacion.comuna,
          pisos_sobre_terreno: asignacion.pisos_declarados || 1,
          sotanos: 0,
          uso_edificacion: asignacion.uso_declarado || 1,
          tipo_inspeccion: 'exterior',
          sistema_estructural: 21,
          anio_construccion: 2,
          colapso: 'ninguno', inclinacion: 'ninguna',
          asentamiento: 'ninguno', falla_talud: 'ninguno',
          porcentaje_dano: 'ninguno',
          visita_presencial_b: true,
          danos: null,
          comentarios: '',
        };
      }
      setF(borrador);
    })();
  }, [asignacion.reporte_uuid]);

  const elementos = useMemo(
    () => (f ? elementosEstructurales(f.sistema_estructural) : []),
    [f?.sistema_estructural],
  );

  // La matriz se regenera si cambia el sistema estructural, conservando lo tecleado
  const danos = useMemo(() => {
    if (!f) return [];
    const previas = f.danos || [];
    const est = elementos.map((e) =>
      previas.find((d) => d.grupo === 'estructural' && d.elemento === e) || filaVacia('estructural', e));
    const noEst = ELEMENTOS_NO_ESTRUCTURALES.map((e) =>
      previas.find((d) => d.grupo === 'no_estructural' && d.elemento === e) || filaVacia('no_estructural', e));
    return [...est, ...noEst];
  }, [f, elementos]);

  if (!f) return html`<p>Cargando…</p>`;

  // AUTOGUARDADO en cada cambio de campo — nunca "al enviar" (BRIEF §4.1)
  const campo = (k, transform = (v) => v) => (ev) => {
    const t = ev.target;
    const v = t.type === 'checkbox' ? t.checked : transform(t.value);
    const nuevo = { ...f, [k]: v };
    setF(nuevo);
    guardarLocal(nuevo);
  };
  const setDanos = (nuevas) => {
    const nuevo = { ...f, danos: nuevas };
    setF(nuevo);
    guardarLocal(nuevo);
  };

  const agregarFotos = async (ev, categoria) => {
    setFotosMsj(null);
    let ok = 0;
    for (const archivo of [...ev.target.files]) {
      try {
        await encolarFoto({
          archivo, reporte_uuid: asignacion.reporte_uuid,
          categoria, piso: f.piso_mayor_dano || null,
        });
        ok++;
      } catch (e) { setFotosMsj('Una foto falló: ' + e.message); }
    }
    if (ok) setFotosMsj(`${ok} foto(s) en cola. Suben solas cuando haya señal.`);
    ev.target.value = '';
  };

  const cerrarCaptura = async () => {
    const filas = danos.map((d) => ({
      elemento: d.elemento, ninguno: d.pct_ninguno, leve: d.pct_leve,
      moderado: d.pct_moderado, fuerte: d.pct_fuerte, severo: d.pct_severo,
    }));
    const v = validarMatrizDanos(filas);
    if (!v.ok) return setMsj('La matriz de daños no cuadra: ' + v.errores[0].mensaje);

    const nuevo = { ...f, danos, estado: 'capturado' };
    setF(nuevo);
    await guardarLocal(nuevo);
    await sincronizar();
    setMsj('Captura cerrada. Si no hay señal, se sincroniza sola después. Pasa a revisión de nivel A.');
  };

  const num = (v) => (v === '' ? null : Number(v));

  return html`
    <div class="tarjeta">
      <button class="secundario" onClick=${alVolver}>← Mis asignaciones</button>
      <h2>${asignacion.consecutivo} — ${asignacion.direccion}</h2>
      <p class="nota">Guardado automático en este dispositivo con cada cambio.
        ${f.estado === 'capturado' ? ' · CAPTURA CERRADA' : ''}</p>
      ${asignacion.descripcion && html`<p class="nota">Reporte ciudadano: "${asignacion.descripcion}"</p>`}

      <h3>Tipo de inspección</h3>
      <label>Tipo
        <select value=${f.tipo_inspeccion} onChange=${campo('tipo_inspeccion')}>
          <option value="exterior">Solo exterior</option>
          <option value="parcial">Parcial (entré parcialmente)</option>
          <option value="completa">Completa</option>
        </select></label>
      <label>¿Visita presencial? <input type="checkbox" checked=${f.visita_presencial_b} onChange=${campo('visita_presencial_b')} /></label>

      <h3>Identificación de la edificación</h3>
      <label>Dirección <input value=${f.direccion || ''} onInput=${campo('direccion')} /></label>
      <label>Barrio <input value=${f.barrio || ''} onInput=${campo('barrio')} /></label>
      <label>Comuna <input value=${f.comuna || ''} onInput=${campo('comuna')} /></label>
      <label>Nombre de la edificación <input value=${f.nombre_edificacion || ''} onInput=${campo('nombre_edificacion')} /></label>
      <div class="grid2">
        <label>Pisos sobre terreno <input type="number" min="1" value=${f.pisos_sobre_terreno || ''} onInput=${campo('pisos_sobre_terreno', num)} /></label>
        <label>Sótanos <input type="number" min="0" value=${f.sotanos ?? ''} onInput=${campo('sotanos', num)} /></label>
        <label>Frente (m) <input type="number" step="0.1" value=${f.frente_m || ''} onInput=${campo('frente_m', num)} /></label>
        <label>Fondo (m) <input type="number" step="0.1" value=${f.fondo_m || ''} onInput=${campo('fondo_m', num)} /></label>
      </div>
      <label>Uso principal
        <select value=${f.uso_edificacion} onChange=${campo('uso_edificacion', Number)}>
          ${Object.entries(USOS).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
        </select></label>

      <h3>Sistema estructural</h3>
      <label>Sistema
        <select value=${f.sistema_estructural} onChange=${campo('sistema_estructural', Number)}>
          ${Object.entries(SISTEMAS_ESTRUCTURALES).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
        </select></label>
      <label>Época de construcción
        <select value=${f.anio_construccion} onChange=${campo('anio_construccion', Number)}>
          <option value="1">Antes de 1984</option>
          <option value="2">1984 – 1997</option>
          <option value="3">1998 – 2010</option>
          <option value="4">Después de 2010</option>
        </select></label>

      <h3>Estabilidad y suelo (lo observado, no el dictamen)</h3>
      <div class="grid2">
        <label>Colapso
          <select value=${f.colapso} onChange=${campo('colapso')}>
            <option value="ninguno">Ninguno</option>
            <option value="parcial_menor_50">Parcial &lt; 50%</option>
            <option value="parcial_mayor_50">Parcial &gt; 50%</option>
            <option value="total">Total</option>
          </select></label>
        <label>Inclinación
          <select value=${f.inclinacion} onChange=${campo('inclinacion')}>
            <option value="ninguna">Ninguna</option>
            <option value="dudas">Dudas</option>
            <option value="evidente">Evidente</option>
          </select></label>
        <label>Asentamiento
          <select value=${f.asentamiento} onChange=${campo('asentamiento')}>
            <option value="ninguno">Ninguno</option>
            <option value="dudas">Dudas</option>
            <option value="evidente">Evidente</option>
          </select></label>
        <label>Falla de talud
          <select value=${f.falla_talud} onChange=${campo('falla_talud')}>
            <option value="ninguno">Ninguna</option>
            <option value="puntual">Puntual</option>
            <option value="general">General</option>
          </select></label>
      </div>

      <h3>Matriz de daños (severidad × %, cada fila suma 100)</h3>
      <p class="nota">Elementos según el sistema elegido: a un muro de tapia no se le piden nudos.</p>
      <${MatrizDanos} filas=${danos} onCambio=${setDanos} />

      <div class="grid2">
        <label>Piso con mayor daño <input value=${f.piso_mayor_dano || ''} onInput=${campo('piso_mayor_dano')} /></label>
        <label>% daño global
          <select value=${f.porcentaje_dano} onChange=${campo('porcentaje_dano')}>
            <option value="ninguno">Ninguno</option><option value="0_10">0–10%</option>
            <option value="10_30">10–30%</option><option value="30_60">30–60%</option>
            <option value="60_100">60–100%</option><option value="100">100%</option>
          </select></label>
      </div>

      <h3>Fotos de la inspección</h3>
      ${[...CATEGORIAS_FOTO.obligatorias, ...CATEGORIAS_FOTO.libres].map((c) => html`
        <label class="foto-cat">${c.replaceAll('_', ' ')}
          ${CATEGORIAS_FOTO.obligatorias.includes(c) ? html`<b>*</b>` : ''}
          <input type="file" accept="image/*" multiple onChange=${(ev) => agregarFotos(ev, c)} />
        </label>`)}
      ${fotosMsj && html`<p class="nota">${fotosMsj}</p>`}

      <h3>Comentarios</h3>
      <label><textarea rows="4" value=${f.comentarios || ''} onInput=${campo('comentarios')}
        placeholder="Observaciones de campo, mediciones, acceso…"></textarea></label>

      ${msj && html`<p class="nota"><strong>${msj}</strong></p>`}
      ${f.estado !== 'capturado' && html`
        <button onClick=${cerrarCaptura}>Cerrar captura → revisión nivel A</button>`}
      <p class="nota">Cerrar la captura NO asigna riesgos ni color: eso lo hace
        y lo firma el ingeniero nivel A.</p>
    </div>`;
}

export function PaginaIngeniero() {
  const [asignaciones, setAsignaciones] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    iniciarSyncCampo();
    refrescarAsignaciones().then(setAsignaciones);
    return alCambiarPendientes(setPendientes);
  }, []);

  if (abierta) return html`<${Formulario} asignacion=${abierta} alVolver=${() => setAbierta(null)} />`;

  return html`
    <div class="tarjeta">
      <h2>Mis asignaciones</h2>
      ${pendientes > 0 && html`
        <p class="aviso-cola">📋 ${pendientes} formulario(s) con cambios sin sincronizar.
           Se suben solos cuando haya señal.</p>`}
      ${!asignaciones && html`<p>Cargando…</p>`}
      ${asignaciones && asignaciones.length === 0 && html`
        <p>No tienes asignaciones activas. Si estás sin señal, esta lista es la
           última descargada.</p>`}
      <ul class="lista-cola">
        ${(asignaciones || []).map((a) => html`
          <li onClick=${() => setAbierta(a)}>
            <strong>${a.consecutivo}</strong> · ${a.direccion} (${a.barrio || 's/b'})
            ${a.requiere_nivel_a && html` <span class="etiqueta-urgente">nivel A</span>`}
            <br /><small>Vence: ${new Date(a.vence_en).toLocaleString('es-CO')}
              · ${a.formulario_estado ? 'captura ' + a.formulario_estado : 'sin empezar'}</small>
          </li>`)}
      </ul>
      <button class="secundario" onClick=${() => refrescarAsignaciones().then(setAsignaciones)}>
        Actualizar (requiere señal)</button>
    </div>`;
}
