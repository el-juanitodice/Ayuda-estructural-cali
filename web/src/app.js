/**
 * Shell de la SPA. Router por hash (funciona bien con precache offline y
 * con el fallback SPA del servidor).
 */

import { h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import htm from 'htm';
import { get, post } from './api.js';
import { iniciarCola, suscribirse } from './fotos/cola-subida.js';
import { PaginaReportar } from './paginas/reportar.js';
import { PaginaEstado } from './paginas/estado.js';
import { PaginaMapa } from './paginas/mapa.js';
import { PaginaLogin, PaginaDefinirClave } from './paginas/login.js';
import { PaginaModeracion } from './paginas/moderacion.js';
import { PaginaAdmin } from './paginas/admin.js';
import './estilos.css';

const html = htm.bind(h);

function rutaActual() {
  const hash = location.hash.slice(1) || '/';
  const [ruta, query = ''] = hash.split('?');
  return { ruta, params: new URLSearchParams(query) };
}

function App() {
  const [{ ruta, params }, setRuta] = useState(rutaActual());
  const [usuario, setUsuario] = useState(null);
  const [cola, setCola] = useState(null);

  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual());
    window.addEventListener('hashchange', alCambiar);
    get('/auth/yo').then((r) => setUsuario(r.usuario)).catch(() => {});
    iniciarCola();
    return suscribirse(setCola), () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const salir = async () => {
    await post('/auth/logout').catch(() => {});
    setUsuario(null);
    location.hash = '#/';
  };

  const pendientes = cola ? cola.pendiente + cola.subiendo : 0;

  let pagina;
  if (ruta === '/reportar') pagina = html`<${PaginaReportar} />`;
  else if (ruta === '/estado') pagina = html`<${PaginaEstado} />`;
  else if (ruta === '/ingreso') pagina = html`<${PaginaLogin} alEntrar=${(u) => { setUsuario(u); location.hash = u.rol === 'admin' ? '#/admin' : '#/moderacion'; }} />`;
  else if (ruta === '/definir-clave' || ruta === '/recuperar-clave') {
    pagina = html`<${PaginaDefinirClave} token=${params.get('token') || ''} />`;
  } else if (ruta === '/moderacion') {
    pagina = usuario ? html`<${PaginaModeracion} />` : html`<${PaginaLogin} alEntrar=${setUsuario} />`;
  } else if (ruta === '/admin') {
    pagina = usuario ? html`<${PaginaAdmin} />` : html`<${PaginaLogin} alEntrar=${setUsuario} />`;
  } else pagina = html`<${PaginaMapa} />`;

  return html`
    <header class="barra">
      <a href="#/" class="logo">🏗️ Inspección Cali</a>
      <nav>
        <a href="#/reportar">Reportar</a>
        <a href="#/estado">Consultar</a>
        ${pendientes > 0 && html`
          <span class="chip-cola" title="Fotos pendientes de subir">📷 ${pendientes}</span>`}
        ${usuario
          ? html`
            ${['moderador', 'admin'].includes(usuario.rol) && html`<a href="#/moderacion">Moderación</a>`}
            ${usuario.rol === 'admin' && html`<a href="#/admin">Admin</a>`}
            <a href="#/" onClick=${(e) => { e.preventDefault(); salir(); }}>Salir</a>`
          : html`<a href="#/ingreso">Ingresar</a>`}
      </nav>
    </header>
    <main>${pagina}</main>
    <footer class="pie">
      <p>🚨 Emergencias con riesgo para la vida: <a href="tel:123"><strong>llama al 123</strong></a>.
         Esta plataforma no atiende emergencias.</p>
      <p>Los dictámenes de habitabilidad los emiten y firman ingenieros con matrícula
         verificada, nunca el sistema.</p>
    </footer>`;
}

render(html`<${App} />`, document.getElementById('app'));

// Service worker: precache del shell para abrir sin señal (BRIEF §4.1)
if ('serviceWorker' in navigator && !location.hostname.includes('localhost')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
