export const routes = {
  home: '/',
  reportar: '/reportar',
  estado: '/estado',
  ingreso: '/ingreso',
  definirClave: '/definir-clave',
  recuperarClave: '/recuperar-clave',
  campo: '/campo',
  revision: '/revision',
  aviso: '/aviso',
  moderacion: '/moderacion',
  tablero: '/tablero',
  admin: '/admin',
} as const;

export function estadoConRadicado(radicado: string) {
  return `${routes.estado}?radicado=${encodeURIComponent(radicado)}`;
}
