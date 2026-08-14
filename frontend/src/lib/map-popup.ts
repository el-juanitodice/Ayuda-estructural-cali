import type { MapaPunto } from '@/types/map';
import { ETIQUETAS_MAPA } from '@/constants/map';

export function htmlPopupMapa(p: MapaPunto): string {
  const etiqueta = ETIQUETAS_MAPA[p.color] ?? p.color;
  const ubicacion = [p.barrio, p.comuna ? `(comuna ${p.comuna})` : ''].filter(Boolean).join(' ');
  const detalle =
    p.con_dictamen && p.dictaminado_en
      ? `Dictamen firmado el ${new Date(p.dictaminado_en).toLocaleDateString('es-CO')}`
      : 'Sin inspección técnica todavía';

  return (
    `<strong>${etiqueta}</strong><br>` +
    `${ubicacion}<br>` +
    `${detalle}<br>` +
    `<em>Ubicación aproximada (±100 m)</em>`
  );
}
