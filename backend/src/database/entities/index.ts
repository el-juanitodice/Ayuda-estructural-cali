export { Asignacion } from './asignacion.entity';
export { Foto } from './foto.entity';
export { Usuario } from './usuario.entity';
export { TokenAcceso } from './token-acceso.entity';
export { Reporte } from './reporte.entity';
export { FormularioAis, EstadoFormulario } from './formulario-ais.entity';

import { Asignacion } from './asignacion.entity';
import { Foto } from './foto.entity';
import { Usuario } from './usuario.entity';
import { TokenAcceso } from './token-acceso.entity';
import { Reporte } from './reporte.entity';
import { FormularioAis } from './formulario-ais.entity';

export const entityList = [Usuario, TokenAcceso, Reporte, FormularioAis, Foto, Asignacion];
