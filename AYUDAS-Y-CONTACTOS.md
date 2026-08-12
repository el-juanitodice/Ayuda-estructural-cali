# Ayudas para el proyecto y borradores de contacto

Investigado el 12 de agosto de 2026. Resumen honesto: ni Anthropic ni Railway
tienen (público) un programa específico de respuesta a desastres, pero ambos
tienen canales donde esta solicitud tiene sentido y precedente.

## Anthropic

Rutas reales hoy:

- **Claude for Nonprofits** — descuentos para organizaciones sin ánimo de lucro
  (plan Team desde ~US$8/usuario/mes): https://www.anthropic.com/news/claude-for-nonprofits
- **Solicitud de créditos de API** — no hay formulario de desastres; el canal es
  el soporte oficial https://support.claude.com (botón de contacto) explicando el caso.
- **AI for Science** no aplica (es para investigación); **Claude Corps** es un
  programa de fellowships en EE. UU., tampoco aplica directamente.

### Borrador (inglés, para el formulario de soporte / contacto de Anthropic)

> Subject: API credits request — volunteer post-earthquake building-inspection
> platform, Cali, Colombia
>
> Hello — I'm part of a volunteer group of engineers in Cali, Colombia,
> responding to the M7.4 earthquake of August 10, 2026 (190+ deaths, national
> disaster declared). We are building a free, open tool that helps civil
> engineers capture the official AIS post-seismic inspection form offline and
> helps coordinators dispatch inspections across the city. The system never
> makes habitability decisions — those stay with licensed engineers.
>
> We're using Claude to accelerate development. We'd like to ask whether
> Anthropic offers API credits, nonprofit discounts, or any other support for
> disaster-response volunteer teams like ours, and what the right application
> path would be.
>
> Contact: Juan David Montoya — juandavidom@icloud.com — Cali, Colombia.

## Railway

- No hay programa público de créditos para emergencias. Canales:
  - Soporte oficial: https://docs.railway.com/platform/support
    (Hobby: estación de ayuda + comunidad; los planes de pago tienen soporte directo).
  - Comunidad/Discord y el correo team@railway — explicar el caso suele funcionar
    con equipos pequeños: piden contexto y a veces dan créditos ad hoc.
- Costo real del despliegue mientras tanto: es bajo. Postgres+API+bucket para
  cientos de reportes/día cabe en el plan Hobby (~US$5/mes) y el bucket cuesta
  centavos (ver ARQUITECTURA.md §3).

### Borrador (inglés, para Railway)

> Subject: Volunteer disaster-response project from Cali, Colombia — credits?
>
> Hi — we're volunteer engineers in Cali, Colombia deploying a post-earthquake
> building-inspection platform on Railway (Fastify + PostGIS + Buckets) after
> the Aug 10 M7.4 earthquake. Expected load is modest (hundreds of reports/day)
> but the project is unfunded. Do you offer credits or sponsorship for
> disaster-response deployments? Happy to share the repo and architecture.
>
> Contact: Juan David Montoya — juandavidom@icloud.com

## Nota importante

Soy Claude (el asistente): no puedo enviar correos ni escalar nada dentro de
Anthropic por mi cuenta. Estos borradores los envías tú desde tu correo o el
formulario de soporte. Si el grupo se constituye como ONG o se apoya en una
existente (universidad, la AIS misma), las puertas de "nonprofit" se abren
mucho más fácil en ambas empresas.
