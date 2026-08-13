import { config } from 'dotenv';
import { resolve } from 'node:path';

/** Carga .env antes del resto de módulos (límites de throttle, JWT, etc.). */
config({ path: resolve(__dirname, '../../.env') });
