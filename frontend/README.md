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

## Arquitectura (patrón Festiva)

```
src/
├── api/                    # Servicios HTTP por dominio
│   ├── http.client.ts      # fetch + auth + errores
│   ├── auth/auth.service.ts
│   ├── admin/admin.service.ts
│   └── …
├── hooks/                  # Hooks globales (useAuth, …)
└── pages/
    └── AdminPage/
        ├── AdminPage.tsx   # Solo UI
        └── hooks/
            └── useAdminPage.ts  # Estado + llamadas a services
```

- **ESLint** flat config igual que Festiva (`eslint.config.js`).
- Las páginas nuevas: lógica en `hooks/useXxxPage.ts`, componente delgado.
- No usar `lib/api.ts` (eliminado); usar `src/api/*.service.ts`.

## Desarrollo

Desde la raíz del monorepo:

```bash
npm run install:all   # instala frontend/ y backend/ por separado
npm run dev:backend   # NestJS en :3001
npm run dev:frontend  # Vite en :5173
```

O en cada carpeta:

```bash
cd frontend && npm install && npm run dev
cd backend && npm install && npm run start:dev
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
