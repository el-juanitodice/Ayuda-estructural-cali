/** Metadatos EXIF extraídos en el cliente antes de comprimir */
export interface ExifFoto {
  lat?: number | null;
  lng?: number | null;
  tomada_en?: string | null;
}
