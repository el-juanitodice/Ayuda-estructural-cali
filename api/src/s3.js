/**
 * Cliente S3 para Railway Bucket (S3-compatible).
 * El API firma URLs; los bytes de las fotos JAMÁS pasan por aquí.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
  forcePathStyle: true, // los buckets S3-compatibles suelen exigirlo
});

/** URL prefirmada de subida (PUT). Expira en S3_URL_TTL_SEGUNDOS. */
export function prefirmarPut(key, contentType) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, ContentType: contentType }),
    { expiresIn: config.s3.urlTtlSegundos },
  );
}

/** URL prefirmada de LECTURA. El bucket es privado: esta es la única vía. */
export function prefirmarGet(key) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }),
    { expiresIn: config.s3.urlTtlSegundos },
  );
}

/** ¿Existe el objeto? Se usa en /confirmar para no registrar fotos fantasma. */
export async function existeObjeto(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata && err.$metadata.httpStatusCode === 404) return false;
    if (err.name === 'NotFound') return false;
    throw err; // otro error (credenciales, red): que suba, no lo escondas
  }
}
