/**
 * Tokens visuales centralizados — reflejados en src/index.css (@theme / :root).
 * Usar en componentes para mantener coherencia con Tailwind.
 */

export const colors = {
  ink: '#0f172a',
  paper: '#f6f4ef',
  institutional: '#1e3a5f',
  institutionalDeep: '#152a45',
  steel: '#64748b',
  safety: '#d97706',
  habitabilidad: {
    verde: '#16a34a',
    amarillo: '#eab308',
    naranja: '#ea580c',
    rojo: '#dc2626',
  },
} as const;

export const fonts = {
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  serif: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, monospace',
} as const;

export const layout = {
  contentNarrow: 'max-w-3xl',
  contentWide: 'max-w-6xl',
  headerHeight: '3.5rem',
  sidebarWidth: '16rem',
  sidebarWidthIcon: '3rem',
} as const;

export const radius = {
  card: '0.75rem',
  button: '0.5rem',
} as const;

/** Clases Tailwind reutilizables */
export const ui = {
  pageCanvas: 'app-canvas min-h-svh',
  pageCanvasMap: 'app-canvas-map min-h-svh',
  elevatedCard: 'rounded-xl border bg-card/95 shadow-sm backdrop-blur-sm',
  navActive:
    'border-l-2 border-amber-400 bg-primary-foreground/10 pl-[calc(0.75rem-2px)] text-primary-foreground',
  navIdle:
    'border-l-2 border-transparent text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground',
} as const;
