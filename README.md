# Daily Tech News

Frontend de suscripción a un resumen diario de noticias tecnológicas. El usuario elige sus temas de interés, registra su correo, verifica un código OTP y queda suscrito para recibir el digest cada mañana.

El backend corre en AWS (Lambdas, API Gateway, DynamoDB, SES, EventBridge). Este repo es solo la interfaz web.

## Qué hace

1. El usuario elige uno o más temas: **Cloud**, **IA**, **Ciberseguridad**, **Development**
2. Ingresa su correo y recibe un código OTP de 6 dígitos
3. Verifica el código y confirma la suscripción
4. Cada día a las 9:00 AM (hora de Panamá) el backend genera y envía el digest por correo

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**

## Empezar en local

Requisitos: Node.js 20+ y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Antes de arrancar, crea un `.env` en la raíz (ver abajo).

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno

**Local y Vercel (servidor — no expuestas al navegador):**

```env
OTP_API_ENDPOINT=https://tu-api-gateway.amazonaws.com
OTP_API_KEY=tu-api-key-de-api-gateway
```

El frontend llama a `/api/*` en el mismo dominio; Next.js reenvía esas peticiones a API Gateway con el header `x-api-key`. La clave nunca llega al navegador.

| Ruta | Método | Body |
|------|--------|------|
| `/generate` | POST | `{ "email": "...", "topics": ["Cloud", "IA"] }` |
| `/validate` | POST | `{ "id": "...", "otp": "...", "email": "..." }` |
| `/unsubscribe` | POST | `{ "id": "...", "email": "..." }` |

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                    # Flujo principal (correo → OTP → éxito)
│   ├── unsubscribe/              # Baja de suscripción (?id=...&email=...)
│   ├── terminos-de-uso/
│   └── politica-de-privacidad/
├── components/
│   ├── auth/                       # EmailStep, OTPStep, SuccessStep…
│   └── legal/
└── lib/
    └── topics.ts                   # Temas disponibles

docs/
└── architecture/
    ├── diagrams/                   # Diagramas del flujo AWS
    └── decisions/                  # ADRs
```

## Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build de producción
pnpm start    # servir build
pnpm lint     # eslint
```

## Arquitectura

Decisiones de diseño documentadas en `docs/architecture/decisions/`:

- **ADR-001** — SES para envío de OTP
- **ADR-002** — DynamoDB para almacenar OTP
- **ADR-003** — Lambda directo a SES vs SNS fanout para el digest diario

Diagramas en `docs/architecture/diagrams/`.

## Páginas

- `/unsubscribe?id={id}&email={email}` — cancelación de suscripción (enlace del correo)
- `/terminos-de-uso`
- `/politica-de-privacidad`

## TODO

Cosas pendientes, en el orden que tiene sentido irlas atacando:

### Infra como código (IaC)

Convertir la infra en IaC para que sea portable y replicable. Vamos por pedazos:

- [ ] `generateOtp`
- [ ] `validateOtp`
- [ ] Generación del digest + envío del digest (`sendDigestMail`)

