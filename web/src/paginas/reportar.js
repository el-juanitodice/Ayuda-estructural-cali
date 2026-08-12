/**
 * Formulario ciudadano (punto 3) con corte de emergencia 123 (BRIEF §2.3).
 *
 * El corte se evalúa EN VIVO con la misma regla del servidor
 * (shared/ais.js, sin modificar). La pantalla 123 no se puede saltar sin
 * reconocerla. El reporte se envía sin esperar las fotos: el JSON de 2 KB
 * es lo urgente para que el moderador pueda llamar.
 */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import { requiereLlamar123, USOS } from '../../../shared/ais.js';
import { post, ErrorApi } from '../api.js';
import { encolarFoto, suscribirse } from '../fotos/cola-subida.js';

const html = htm.bind(h);

const VACIO = {
  reportante_nombre: '', reportante_telefono: '', reportante_relacion: 'propietario',
  direccion: '', barrio: '', tipo_edificacion: 'casa',
  pisos_declarados: 1, unidades_declaradas: 1, habitada: true,
  uso_declarado: 1, descripcion: '',
  personasAtrapadas: false, colapsoEnCurso: false,
};

function PantallaEmergencia({ onContinuar }) {
  return html`
    <div class="emergencia">
      <h2>🚨 Esto es una emergencia con riesgo inmediato para la vida</h2>
      <a class="btn-123" href="tel:123">LLAMA AL 123 AHORA</a>
      <p>Esta plataforma <strong>no atiende emergencias</strong>.
         Los organismos de rescate sí.</p>
      <button class="secundario" onClick=${onContinuar}>
        Ya llamé al 123 — continuar con el reporte
      </button>
    </div>`;
}

export function PaginaReportar() {
  const [f, setF] = useState(VACIO);
  const [gps, setGps] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [fase, setFase] = useState('formulario'); // formulario | emergencia | enviando | listo
  const [radicado, setRadicado] = useState(null);
  const [error, setError] = useState(null);
  const [cola, setCola] = useState(null);

  const campo = (k) => (ev) => {
    const t = ev.target;
    setF({ ...f, [k]: t.type === 'checkbox' ? t.checked : t.value });
  };

  const esEmergencia = () =>
    requiereLlamar123(f.descripcion, {
      personasAtrapadas: f.personasAtrapadas,
      colapsoEnCurso: f.colapsoEnCurso,
    });

  const pedirGps = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      () => setError('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const enviar = async (yaReconocioEmergencia = false) => {
    setError(null);
    if (!gps) return setError('Necesitamos la ubicación del predio. Toca "Usar mi ubicación".');
    if (esEmergencia() && !yaReconocioEmergencia) return setFase('emergencia');

    setFase('enviando');
    try {
      const r = await post('/reportes', {
        reportante_nombre: f.reportante_nombre,
        reportante_telefono: f.reportante_telefono,
        reportante_relacion: f.reportante_relacion,
        direccion: f.direccion,
        barrio: f.barrio || null,
        lat: gps.lat, lng: gps.lng, precision_gps_m: gps.precision,
        tipo_edificacion: f.tipo_edificacion,
        pisos_declarados: Number(f.pisos_declarados) || null,
        unidades_declaradas: Number(f.unidades_declaradas) || null,
        habitada: f.habitada,
        uso_declarado: Number(f.uso_declarado),
        descripcion: f.descripcion || null,
        banderas: { personasAtrapadas: f.personasAtrapadas, colapsoEnCurso: f.colapsoEnCurso },
      });
      terminar(r);
    } catch (e) {
      if (e instanceof ErrorApi && e.codigo === 'emergencia_123') {
        // El servidor también lo detectó. El reporte YA quedó guardado.
        terminar(e.cuerpo);
        setFase('emergencia');
        return;
      }
      setFase('formulario');
      setError(e.message);
    }
  };

  // Con el reporte creado, las fotos van a la cola persistente (suben cuando haya señal)
  const terminar = async (r) => {
    setRadicado(r);
    setFase('listo');
    if (fotos.length) {
      suscribirse(setCola);
      for (const archivo of fotos) {
        try {
          await encolarFoto({ archivo, reporte_uuid: r.uuid, categoria: 'otras' });
        } catch { /* una foto ilegible no daña el reporte */ }
      }
    }
  };

  if (fase === 'emergencia' && !radicado) {
    return html`<${PantallaEmergencia} onContinuar=${() => enviar(true)} />`;
  }

  if (fase === 'listo' || (fase === 'emergencia' && radicado)) {
    return html`
      <div class="tarjeta">
        ${fase === 'emergencia' && html`
          <div class="emergencia compacta">
            <a class="btn-123" href="tel:123">🚨 LLAMA AL 123 AHORA</a>
          </div>`}
        <h2>Reporte recibido</h2>
        <p>Tu número de radicado es:</p>
        <p class="radicado">${radicado.consecutivo}</p>
        <p>Guárdalo. Con él consultas el estado en la sección
           <a href="#/estado">Consultar</a>. Un moderador te llamará al teléfono
           que dejaste para confirmar los datos.</p>
        ${cola && (cola.pendiente + cola.subiendo) > 0 && html`
          <p class="aviso-cola">📷 Subiendo fotos: ${cola.confirmada} listas,
             ${cola.pendiente + cola.subiendo} en cola.
             Puedes cerrar esta página: se suben solas cuando haya señal.</p>`}
      </div>`;
  }

  return html`
    <form class="tarjeta" onSubmit=${(ev) => { ev.preventDefault(); enviar(); }}>
      <h2>Reportar daños en una edificación</h2>
      <p class="nota">Si hay personas atrapadas, colapso en curso, incendio u
         olor a gas, <strong>llama primero al 123</strong>.</p>

      <label>¿Hay personas atrapadas?
        <input type="checkbox" checked=${f.personasAtrapadas} onChange=${campo('personasAtrapadas')} /></label>
      <label>¿La edificación se está cayendo en este momento?
        <input type="checkbox" checked=${f.colapsoEnCurso} onChange=${campo('colapsoEnCurso')} /></label>

      <h3>Tus datos (para que un moderador te llame)</h3>
      <label>Nombre completo
        <input required minlength="3" value=${f.reportante_nombre} onInput=${campo('reportante_nombre')} /></label>
      <label>Teléfono
        <input required type="tel" minlength="7" value=${f.reportante_telefono} onInput=${campo('reportante_telefono')} /></label>
      <label>Relación con el predio
        <select value=${f.reportante_relacion} onChange=${campo('reportante_relacion')}>
          <option value="propietario">Propietario/a</option>
          <option value="arrendatario">Arrendatario/a</option>
          <option value="administrador">Administrador/a</option>
          <option value="vecino">Vecino/a</option>
          <option value="otro">Otro</option>
        </select></label>

      <h3>La edificación</h3>
      <label>Dirección
        <input required minlength="5" value=${f.direccion} onInput=${campo('direccion')}
               placeholder="Carrera 23 # 15-19" /></label>
      <label>Barrio
        <input value=${f.barrio} onInput=${campo('barrio')} /></label>

      <p>
        <button type="button" class="secundario" onClick=${pedirGps}>📍 Usar mi ubicación</button>
        ${gps && html` <span class="ok">Ubicación lista (±${gps.precision} m)</span>`}
      </p>

      <label>Tipo
        <select value=${f.tipo_edificacion} onChange=${campo('tipo_edificacion')}>
          <option value="casa">Casa</option>
          <option value="edificio">Edificio</option>
          <option value="local">Local</option>
          <option value="otro">Otro</option>
        </select></label>
      <label>Pisos <input type="number" min="1" max="120" value=${f.pisos_declarados} onInput=${campo('pisos_declarados')} /></label>
      <label>Viviendas o locales <input type="number" min="1" value=${f.unidades_declaradas} onInput=${campo('unidades_declaradas')} /></label>
      <label>¿Está habitada? <input type="checkbox" checked=${f.habitada} onChange=${campo('habitada')} /></label>
      <label>Uso principal
        <select value=${f.uso_declarado} onChange=${campo('uso_declarado')}>
          ${Object.entries(USOS).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
        </select></label>

      <label>Describe el daño que ves
        <textarea rows="4" maxlength="4000" value=${f.descripcion} onInput=${campo('descripcion')}
                  placeholder="Grietas en la columna del parqueadero…"></textarea></label>

      <label>Fotos del daño (opcional, se suben solas al final)
        <input type="file" accept="image/*" multiple
               onChange=${(ev) => setFotos([...ev.target.files].slice(0, 20))} /></label>
      ${fotos.length > 0 && html`<p class="nota">${fotos.length} foto(s) seleccionadas</p>`}

      ${error && html`<p class="error">${error}</p>`}
      <button type="submit" disabled=${fase === 'enviando'}>
        ${fase === 'enviando' ? 'Enviando…' : 'Enviar reporte'}
      </button>
    </form>`;
}
