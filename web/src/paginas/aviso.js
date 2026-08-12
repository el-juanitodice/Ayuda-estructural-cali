/**
 * Aviso imprimible de habitabilidad — tamaño carta (punto 8, BRIEF §8).
 * Color grande, dirección, número de formulario, fecha, ingeniero A con
 * matrícula, QR a la ficha pública y qué significa el color.
 * Se imprime con el botón o Ctrl+P; "Guardar como PDF" del navegador
 * también genera el PDF del expediente.
 */

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import QRCode from 'qrcode';
import { ETIQUETA_HABITABILIDAD } from '../../../shared/ais.js';
import { get } from '../api.js';

const html = htm.bind(h);

const SIGNIFICADO = {
  verde: 'La edificación puede usarse y habitarse normalmente. Si aparecen nuevos daños tras una réplica, repórtela de nuevo.',
  amarillo: 'USO RESTRINGIDO. Solo entradas breves para recuperar bienes esenciales. No pernocte. Siga las restricciones indicadas por el ingeniero.',
  naranja: 'NO HABITABLE. Prohibido habitarla hasta ser reparada y reinspeccionada. Entradas solo autorizadas y acompañadas.',
  rojo: 'PELIGRO DE COLAPSO. Prohibido entrar. Aléjese de la edificación y no permita el ingreso de nadie.',
};

export function PaginaAviso({ uuid }) {
  const [datos, setDatos] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await get(`/campo/formularios/${uuid}`);
        setDatos(r);
        const urlFicha = `${location.origin}/#/estado?radicado=${r.formulario.consecutivo}`;
        setQr(await QRCode.toDataURL(urlFicha, { width: 220, margin: 1 }));
      } catch (e) { setError(e.message); }
    })();
  }, [uuid]);

  if (error) return html`<p class="error">${error}</p>`;
  if (!datos) return html`<p>Cargando…</p>`;
  const f = datos.formulario;

  if (f.estado !== 'firmado' || !f.habitabilidad_final) {
    return html`<p class="error">Este formulario aún no tiene dictamen firmado.</p>`;
  }
  const color = f.habitabilidad_final;

  return html`
    <div>
      <p class="no-imprimir" style="text-align:center">
        <button onClick=${() => window.print()}>🖨️ Imprimir (o guardar como PDF)</button>
        <span class="nota"> Pega una copia en CADA entrada y explícalo verbalmente a los ocupantes.</span>
      </p>

      <div class="aviso-carta fondo-${color}">
        <header>
          <p class="aviso-titulo">INSPECCIÓN POST-SÍSMICA DE EDIFICACIONES</p>
          <p class="aviso-sub">Formulario Único AIS — Emergencia sísmica, agosto de 2026</p>
        </header>

        <div class="aviso-color">
          ${ETIQUETA_HABITABILIDAD[color].toUpperCase()}
        </div>

        <p class="aviso-significado">${SIGNIFICADO[color]}</p>

        <table class="aviso-datos">
          <tr><td>Dirección</td><td>${f.direccion || f.reporte_direccion}</td></tr>
          <tr><td>Radicado</td><td>${f.consecutivo}</td></tr>
          <tr><td>N.º de formulario</td><td>${f.numero_formulario}</td></tr>
          <tr><td>Fecha del dictamen</td><td>${new Date(f.firmado_en).toLocaleString('es-CO')}</td></tr>
          <tr><td>Dictamen</td><td>Ing. ${f.firmado_por_nombre} — Matrícula ${f.firmado_por_matricula}
            ${f.visita_presencial_a ? '(visita presencial)' : '(revisión remota sobre captura de campo)'}</td></tr>
          <tr><td>Captura de campo</td><td>${f.capturado_por_nombre ? `Ing. ${f.capturado_por_nombre} — Matrícula ${f.capturado_por_matricula}` : '—'}</td></tr>
        </table>

        <div class="aviso-pie">
          ${qr && html`<img class="aviso-qr" src=${qr} alt="QR ficha pública" />`}
          <div>
            <p>Escanee el código para consultar esta ficha. Verifique la matrícula
               profesional en <strong>copnia.gov.co</strong>.</p>
            <p><strong>Este aviso no debe retirarse</strong> mientras la condición
               no cambie por una nueva inspección. Emergencias: <strong>llame al 123</strong>.</p>
          </div>
        </div>
      </div>
    </div>`;
}
