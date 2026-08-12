/**
 * Harness de prueba del punto 1. NO es la app: es el banco de pruebas para
 * validar compresión y cola en celulares reales antes de construir encima.
 */

import { soporte, comprimirFoto } from './fotos/compresor.js';
import { extraerExif } from './fotos/exif.js';
import { encolarFoto, procesarCola, iniciarCola, reintentarFallidas, suscribirse } from './fotos/cola-subida.js';

const $ = (id) => document.getElementById(id);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

// Soporte del navegador
const s = soporte();
$('soporte').innerHTML = `
  Worker: <code>${s.worker ? 'sí' : 'NO'}</code> ·
  OffscreenCanvas: <code>${s.offscreen ? 'sí' : 'NO (fallback canvas)'}</code> ·
  createImageBitmap: <code>${s.imageBitmap ? 'sí' : 'NO'}</code> ·
  En línea: <code id="online">${navigator.onLine ? 'sí' : 'no'}</code>`;
window.addEventListener('online', () => { $('online').textContent = 'sí'; });
window.addEventListener('offline', () => { $('online').textContent = 'no'; });

// Cola persistente + contadores
iniciarCola();
suscribirse((c) => {
  $('c-pendiente').textContent = c.pendiente;
  $('c-subiendo').textContent = c.subiendo;
  $('c-confirmada').textContent = c.confirmada;
  $('c-fallida').textContent = c.fallida;
});

$('btn-encolar').onclick = async () => {
  const archivos = [...$('archivos').files];
  const reporte = $('reporte').value.trim();
  const tbody = document.querySelector('#tabla tbody');

  for (const archivo of archivos) {
    const fila = tbody.insertRow();
    fila.innerHTML = `<td>${kb(archivo.size)}</td><td colspan="5">comprimiendo…</td>`;
    try {
      const exif = await extraerExif(archivo);
      const r = await comprimirFoto(archivo);
      fila.innerHTML = `
        <td>${kb(archivo.size)}</td><td>${kb(r.full.size)}</td>
        <td>${kb(r.thumb.size)}</td><td>${r.formato}</td><td>${r.ms}</td>
        <td>${exif && exif.lat != null ? exif.lat.toFixed(4) + ',' + exif.lng.toFixed(4) : '—'}</td>`;

      if (reporte) {
        await encolarFoto({ archivo, reporte_uuid: reporte, categoria: 'otras' });
      }
    } catch (err) {
      fila.innerHTML = `<td>${kb(archivo.size)}</td><td colspan="5">❌ ${err.message}</td>`;
    }
  }
  if (!reporte) alert('Sin UUID de reporte solo se probó la compresión (no se encoló).');
};

$('btn-procesar').onclick = () => procesarCola();
$('btn-reintentar').onclick = () => reintentarFallidas();
