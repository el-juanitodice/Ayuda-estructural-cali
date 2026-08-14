import { fotosService } from '@/api/fotos/fotos.service';

export async function fetchFotoBlobUrl(
  uuid: string,
  tam: 'thumb' | 'full' = 'thumb',
): Promise<string> {
  return fotosService.fetchBlobUrl(uuid, tam);
}
