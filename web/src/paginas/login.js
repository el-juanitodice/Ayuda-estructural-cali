/** Ingreso del personal y definición de contraseña por enlace de un solo uso. */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import { post } from '../api.js';

const html = htm.bind(h);

export function PaginaLogin({ alEntrar }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (ev) => {
    ev.preventDefault();
    setError(null); setCargando(true);
    try {
      const r = await post('/auth/login', { email, clave });
      alEntrar(r.usuario);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const recuperar = async () => {
    if (!email) return setError('Escribe tu correo primero.');
    await post('/auth/recuperar', { email }).catch(() => {});
    setError('Si el correo existe, te llegará un enlace de recuperación.');
  };

  return html`
    <form class="tarjeta angosta" onSubmit=${entrar}>
      <h2>Ingreso del personal</h2>
      <p class="nota">Solo cuentas creadas por el administrador. El registro está cerrado.</p>
      <label>Correo <input type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} /></label>
      <label>Contraseña <input type="password" required value=${clave} onInput=${(e) => setClave(e.target.value)} /></label>
      ${error && html`<p class="error">${error}</p>`}
      <button type="submit" disabled=${cargando}>${cargando ? 'Entrando…' : 'Entrar'}</button>
      <button type="button" class="secundario" onClick=${recuperar}>Olvidé mi contraseña</button>
    </form>`;
}

export function PaginaDefinirClave({ token }) {
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msj, setMsj] = useState(null);
  const [listo, setListo] = useState(false);

  const enviar = async (ev) => {
    ev.preventDefault();
    if (clave.length < 12) return setMsj('Mínimo 12 caracteres. Una frase larga sirve.');
    if (clave !== confirmar) return setMsj('Las contraseñas no coinciden.');
    try {
      await post('/auth/definir-clave', { token, clave });
      setListo(true);
    } catch (e) { setMsj(e.message); }
  };

  if (listo) {
    return html`<div class="tarjeta angosta">
      <h2>Contraseña definida ✅</h2>
      <p><a href="#/ingreso">Ir a ingresar</a></p>
    </div>`;
  }

  return html`
    <form class="tarjeta angosta" onSubmit=${enviar}>
      <h2>Define tu contraseña</h2>
      <p class="nota">El enlace es de un solo uso y vence a las 24 horas.</p>
      <label>Nueva contraseña (mínimo 12 caracteres)
        <input type="password" required minlength="12" value=${clave} onInput=${(e) => setClave(e.target.value)} /></label>
      <label>Repítela
        <input type="password" required value=${confirmar} onInput=${(e) => setConfirmar(e.target.value)} /></label>
      ${msj && html`<p class="error">${msj}</p>`}
      <button type="submit">Guardar</button>
    </form>`;
}
