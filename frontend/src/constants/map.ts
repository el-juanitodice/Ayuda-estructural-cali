import type { ColorMapa } from '@/types/map';

export const CALI_CENTER = { lat: 3.4372, lng: -76.5225, zoom: 12 } as const;

export const COLORES_MAPA: Record<ColorMapa, string> = {
  gris: '#8a8a8a',
  verde: '#2e7d32',
  amarillo: '#f9a825',
  naranja: '#ef6c00',
  rojo: '#c62828',
};

export const ETIQUETAS_MAPA: Record<ColorMapa, string> = {
  gris: 'Reportado, sin inspección',
  verde: 'Habitable',
  amarillo: 'Uso restringido',
  naranja: 'No habitable',
  rojo: 'Peligro de colapso',
};

export const LEYENDA_ITEMS: { color: ColorMapa; texto: string }[] = [
  { color: 'gris', texto: 'Reportado, sin inspección. No indica daño.' },
  { color: 'verde', texto: 'Habitable' },
  { color: 'amarillo', texto: 'Uso restringido' },
  { color: 'naranja', texto: 'No habitable' },
  { color: 'rojo', texto: 'Peligro de colapso' },
];

export const ADVERTENCIA_MAPA_DEFAULT =
  'Que no haya punto no significa que una edificación esté en buen estado.';
