# Informe de seguridad del MVP Inversora

Informe de postura de seguridad del MVP, cubriendo el backend `inversora-api` y el cliente Expo/React Native `invesora`. Complementa la guia operativa [security-hardening.md](./security-hardening.md) y el plan de respuesta [security-contingency-plan.md](./security-contingency-plan.md).

**Fecha del informe:** 12 de julio de 2026
**Actualizacion API:** rama `codex/security-api-p0-p1`
**Metodo:** revision estatica del codigo fuente. No incluye pentest dinamico ni escaneo de infraestructura desplegada.

## 1. Resumen ejecutivo

La base del MVP es solida para un producto educativo sin cuentas ni operaciones financieras. Desde la revision inicial, el backend ya cubre varios puntos que antes figuraban como pendientes: `npm audit` y Dependabot existen en CI, Swagger queda deshabilitado por defecto en `pro`, la validacion de entorno rechaza secretos `change-me-*` fuera de `local`, y la alerta transitiva de `@hono/node-server` queda fijada a una version parcheada.

Esta rama endurece la API en los puntos P0/P1 backend:

- body parser explicito con limite configurable;
- `ZodError` global como HTTP 400;
- throttling dedicado para analytics y registro de dispositivos;
- tracker de throttling basado en `request.ip`, no en `x-forwarded-for` directo;
- prompt de SORA con input delimitado como datos no confiables;
- guardrails de salida ES/EN;
- binding opcional de sesiones SORA a device token;
- contadores diarios/mensuales de llamadas LLM;
- logs de analytics reducidos en produccion;
- chequeo de mojibake en CI.

Quedan fuera de esta rama los hallazgos del cliente `invesora` y el refactor arquitectonico `FundsModule <-> ScoringModule`.

## 2. Controles backend implementados

| Control | Evidencia |
| --- | --- |
| Helmet con HSTS en entornos no locales y `referrerPolicy: no-referrer` | `src/main.ts`, `src/shared/http/security-headers.config.ts` |
| Body parser explicito con limite `API_BODY_LIMIT` (`100kb` por defecto) | `src/main.ts`, `src/shared/http/body-parser.config.ts` |
| Rate limiting global, SORA, analytics y registro de dispositivos | `src/shared/http/throttler.config.ts`, decorators de throttling |
| Tracker de rate limit basado en `request.ip` resuelto por Express | `src/shared/http/ip-throttler.guard.ts` |
| Redis opcional para throttling distribuido | `THROTTLE_REDIS_URL` |
| CORS condicional, sin credentials, cerrado por defecto fuera de desarrollo si no hay origenes | `src/shared/http/cors.config.ts` |
| Admin API protegida por API key timing-safe y 404 cuando la feature esta deshabilitada | `src/modules/admin/guards`, `src/shared/security/api-key.utils.ts` |
| Swagger deshabilitado por defecto en `pro` | `src/shared/config/app-environment.ts`, `env/pro.env` |
| Validacion de entorno con Zod y rechazo de placeholders `change-me-*` en qa/pro | `src/shared/config/env.schema.ts` |
| `ZodError` global como HTTP 400, sin detalles sensibles en `pro` | `src/shared/http/http-exception.filter.ts` |
| SORA con prompt delimitado, contexto factual, RAG curado y guardrails ES/EN | `assistant-system-prompt.ts`, `assistant-output.guardrails.ts` |
| SORA chat opcionalmente vinculado a `X-Device-Token` | `AssistantConversation.deviceId`, `assistant.controller.ts`, `assistant.service.ts` |
| Limites diarios/mensuales de llamadas LLM, desactivados por defecto con `0` | `ASSISTANT_DAILY_LLM_LIMIT`, `ASSISTANT_MONTHLY_LLM_LIMIT` |
| Logs de analytics reducidos en produccion | `analytics.service.ts` |
| Auditoria de dependencias y Dependabot | `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| Override transitivo de `@hono/node-server` a `1.19.13` | `package.json`, `package-lock.json` |
| Chequeo de mojibake en CI | `npm run security:check-encoding` |

## 3. Hallazgos resueltos o parcialmente resueltos

| ID previo | Estado | Nota |
| --- | --- | --- |
| A1 Prompt injection parcial | Parcialmente resuelto en API | El input de usuario queda dentro de `<user_input>` y el system prompt lo declara no confiable. Los guardrails cubren patrones ES/EN. Sigue recomendado evaluar moderacion/LLM classifier en una fase posterior. |
| A3 Sin auditoria de dependencias | Resuelto en API | La API ya tiene `npm audit --omit=dev --audit-level=high` y Dependabot. El cliente debe mantenerse alineado en su propio repo. |
| A3.1 Dependabot: `@hono/node-server` via Prisma | Resuelto en API | La API no usa `serveStatic` ni Hono directamente. Aun asi, se fuerza `@hono/node-server@1.19.13` con `overrides` y `npm audit` queda en 0 vulnerabilidades. |
| A4 Placeholders locales reutilizables | Resuelto en API | `env.schema.ts` rechaza `change-me` cuando `APP_ENV !== local`; `env/local.env` queda como perfil Docker local. |
| M1 Sin limite de body | Resuelto en API | `API_BODY_LIMIT=100kb` por defecto. |
| M3 `ZodError` como 500 | Resuelto en API | Filtro global devuelve 400. |
| M4 Analytics/register sin throttle dedicado | Resuelto en API | Nuevos throttlers dedicados. |
| M5 Sesion SORA controlada por cliente | Parcialmente resuelto en API | Si hay device token valido, la conversacion se vincula al device y no puede usarse desde otro. Sesiones legacy sin device siguen permitidas por compatibilidad. |
| M6 Sin limite de coste LLM | Parcialmente resuelto en API | Contadores de llamadas configurables; el limite economico real debe seguir configurado en el proveedor. |
| M7 Logs de analytics completos | Resuelto en API | Produccion no loguea `sessionId` ni `deviceId`. |
| M8 IP spoofing en throttling | Resuelto en API | El guard ya no lee `x-forwarded-for` directamente. La configuracion del proxy sigue siendo responsabilidad operativa. |

## 4. Hallazgos vigentes

### Backend

| Severidad | Hallazgo | Recomendacion |
| --- | --- | --- |
| Media | `FundsModule` y `ScoringModule` dependen entre si con `forwardRef` | Separar un read-model/port de fondos para scoring o mover la orquestacion `sync + scoring` a una capa application. |
| Media | Conversaciones y mensajes de usuario sin purga automatica | Anadir job de retencion y reflejarlo en la politica de privacidad. |
| Baja | Rutas sin versionado `/v1` | Planificar antes de abrir integraciones publicas. |
| Baja | CSP/COEP desactivados | Aceptable para API JSON; revisar si se sirve UI adicional. |

### Cliente `invesora` (fuera de esta rama)

| Severidad | Hallazgo | Recomendacion |
| --- | --- | --- |
| Alta | SSL pinning declarado pero no implementado como SPKI real | Corregir politica/comentarios o implementar pinning nativo real con estrategia de rotacion. |
| Alta | `expo-dev-client` en plugins globales | Condicionar plugin por perfil o migrar a config dinamico antes de builds de tienda. |
| Media | Mensajes de error backend retransmitidos a UI | Mostrar mensajes genericos y enviar detalles solo a Sentry/dev. |
| Media | `logoUrl` remoto en `<Image>` sin allowlist local | Validar host/protocolo antes de renderizar. |
| Media | `apiGet<T>` castea sin parser obligatorio | Exigir parser por endpoint o Zod uniforme. |

## 5. Checklist pre-lanzamiento API

- [ ] `APP_ENV=pro` y `NODE_ENV=production`.
- [ ] `SWAGGER_ENABLED=false` salvo ventana puntual de diagnostico.
- [ ] `ADMIN_SYNC_ENABLED=false` y `ADMIN_CATALOG_ENABLED=false` salvo operacion puntual.
- [ ] Ninguna variable con `change-me-*` en qa/pro.
- [ ] `CORS_ORIGINS` con lista exacta o vacio si solo hay app nativa.
- [ ] `THROTTLE_REDIS_URL` configurado si hay mas de una replica.
- [ ] `ASSISTANT_DAILY_LLM_LIMIT` y `ASSISTANT_MONTHLY_LLM_LIMIT` definidos si SORA esta activo.
- [ ] Limite de gasto configurado tambien en OpenAI/proveedor LLM.
- [ ] Agente Python sin dominio publico.
- [ ] `npm run security:check-encoding`, `npm run lint:ci`, `npm run test`, `npm run test:e2e` y `npm run test:integration` ejecutados antes de merge.

## 6. Prioridad siguiente

1. Resolver los hallazgos del cliente `invesora` en una rama separada.
2. Anadir retencion automatica de conversaciones SORA.
3. Refactorizar la frontera `FundsModule`/`ScoringModule` cuando se toque scoring o sync.
4. Evaluar una segunda capa de moderacion/clasificacion para SORA si se activa publicamente con trafico real.
