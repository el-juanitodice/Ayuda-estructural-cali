# Frontend — Inspección post-sísmica Cali

React 18 + TypeScript + Vite + Tailwind CSS + **shadcn/ui**.

Conecta al backend NestJS (`backend/`) vía proxy en desarrollo.

## Stack

- React Router v6 (`BrowserRouter`, URLs limpias)
- Context API (`AuthProvider`)
- React Hook Form + Zod (formularios)
- Lucide React (iconos)
- Leaflet (mapa público)
- Fetch nativo (`src/lib/api.ts`) con JWT Bearer

## Desarrollo

Desde la raíz del monorepo:

```bash
npm install
npm run backend:dev   # NestJS en :3001
npm run frontend:dev  # Vite en :5173
```

O solo el frontend (con backend ya corriendo):

```bash
cd frontend && npm run dev
```

## Build

```bash
npm run frontend:build
```

## Rutas

| Ruta | Acceso | Estado |
|------|--------|--------|
| `/` | Público | Mapa Leaflet |
| `/estado` | Público | Consulta radicado |
| `/ingreso` | Público | Login JWT |
| `/reportar` | Público | Formulario + fotos |
| `/campo`, `/revision`, `/moderacion`, etc. | Protegido | Ver tabla en código |

## Cliente activo

Este es el **frontend oficial** del monorepo. La carpeta `web/` (Preact legacy) ya no se usa en desarrollo ni en build.

## shadcn/ui

Componentes en `src/components/ui/`. Configuración en `components.json`.

```bash
npx shadcn@latest add <componente>
```
