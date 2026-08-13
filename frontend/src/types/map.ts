export type ColorMapa = 'gris' | 'verde' | 'amarillo' | 'naranja' | 'rojo';

export interface MapaLeyenda {
  gris: string;
  colores: string;
  advertencia: string;
}

export interface MapaPunto {
  uuid: string;
  consecutivo: string;
  barrio: string | null;
  comuna: number | null;
  lat: number;
  lng: number;
  color: ColorMapa;
  con_dictamen: boolean;
  dictaminado_en: string | null;
}

export interface MapaResponse {
  leyenda: MapaLeyenda;
  puntos: MapaPunto[];
}
