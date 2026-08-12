/** Admin mínimo: crear cuentas (el sistema envía el enlace de alta) y listar. */

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import { get, post } from '../api.js';

const html = htm.bind(h);

const NUEVO = { email: '', nombre: '', rol: 'moderador', telefono: '', matricula: '', profesion: '' };

export function PaginaAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [f, setF] = useState(NUEVO);
  const [msj, setMsj] = useState(null);

  const cargar = () => get('/admin/usuarios').then((r) => setUsuarios(r.usuarios)).catch((e) => setMsj(e.message));
  useEffect(cargar, []);

  const campo = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const esIngeniero = ['ingeniero_a', 'ingeniero_b'].includes(f.rol);

  const crear = async (ev) => {
    ev.preventDefault();
    setMsj(null);
    try {
      const r = await post('/admin/usuarios', {
        email: f.email, nombre: f.nombre, rol: f.rol,
        telefono: f.telefono || null,
        matricula: esIngeniero ? f.matricula : null,
        profesion: esIngeniero ? f.profesion : null,
      });
      setMsj(r.mensaje);
      setF(NUEVO);
      cargar();
    } catch (e) { setMsj(e.message); }
  };

  return html`
    <div class="tarjeta">
      <h2>Usuarios</h2>
      <form onSubmit=${crear}>
        <h3>Crear cuenta</h3>
        <p class="nota">La contraseña NO la defines tú: el sistema envía un enlace
           de un solo uso (24 h) al correo de la persona.</p>
        <label>Correo <input type="email" required value=${f.email} onInput=${campo('email')} /></label>
        <label>Nombre <input required minlength="3" value=${f.nombre} onInput=${campo('nombre')} /></label>
        <label>Rol
          <select value=${f.rol} onChange=${campo('rol')}>
            <option value="moderador">Moderador/a</option>
            <option value="ingeniero_b">Ingeniero/a nivel B (captura)</option>
            <option value="ingeniero_a">Ingeniero/a nivel A (dictamina y firma)</option>
            <option value="coordinador">Coordinador/a</option>
            <option value="admin">Admin</option>
          </select></label>
        <label>Teléfono <input value=${f.telefono} onInput=${campo('telefono')} /></label>
        ${esIngeniero && html`
          <p class="nota"><strong>Verifica la matrícula en copnia.gov.co antes de crear.</strong>
             Un ingeniero sin matrícula verificada no puede existir en el sistema.</p>
          <label>Matrícula COPNIA <input required value=${f.matricula} onInput=${campo('matricula')} /></label>
          <label>Profesión <input required value=${f.profesion} onInput=${campo('profesion')}
                 placeholder="Ingeniero Civil" /></label>`}
        <button type="submit">Crear y enviar enlace</button>
      </form>
      ${msj && html`<p class="nota">${msj}</p>`}

      <h3>Cuentas (${usuarios.length})</h3>
      <ul class="lista-cola">
        ${usuarios.map((u) => html`
          <li>
            <strong>${u.nombre}</strong> · ${u.email} · ${u.rol}
            ${!u.activo && html` <span class="etiqueta-urgente">inactiva</span>`}
            ${!u.clave_definida && html` <small>(aún no define contraseña)</small>`}
          </li>`)}
      </ul>
    </div>`;
}
