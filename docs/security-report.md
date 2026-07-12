# Informe de seguridad del MVP Inversora

Informe de la postura de seguridad del MVP, cubriendo el backend (`inversora-api`) y el cliente Expo/React Native (`invesora`). Complementa la guía operativa [security-hardening.md](./security-hardening.md) y el plan de respuesta [security-contingency-plan.md](./security-contingency-plan.md).

**Fecha del informe:** 12 de julio de 2026
**Método:** revisión estática del código fuente de ambos repositorios. No incluye pentest dinámico, escaneo de infraestructura desplegada ni auditoría de dependencias transitivas.

---

## 1. Resumen ejecutivo

| Severidad | Backend | Cliente | Total |
|-----------|---------|---------|-------|
| Crítica | 0 | 0 | **0** |
| Alta | 3 | 2 | **5** |
| Media | ~12 | ~5 | **~17** |
| Baja | ~10 | ~10 | **~20** |

**Veredicto:** el MVP tiene una base de seguridad sólida y verificable en código, por encima del estándar de un MVP sin cuentas de usuario. No hay secretos de producción hardcodeados, la superficie financiera y de IA está acotada por diseño, y existen controles reales (Helmet, throttling, guards con comparación en tiempo constante, Zod, SecureStore, allowlist de URLs). Sin embargo, **no se cumple "todo lo posible"**: quedan cinco hallazgos de severidad alta —principalmente mitigación parcial de prompt injection, discrepancia entre el SSL pinning declarado y el implementado, y ausencia de auditoría de dependencias en CI— y un conjunto de hallazgos medios accionables antes del lanzamiento público.

---

## 2. Controles ya implementados

### 2.1 Backend (`inversora-api`)

| Control | Evidencia |
|---------|-----------|
| Helmet con HSTS (entornos no locales) y `referrerPolicy: no-referrer` | `src/main.ts`, `src/shared/http/security-headers.config.ts` |
| Rate limiting global por IP (`@nestjs/throttler`, 120 req/min) + límite dedicado para SORA (30 req/min) | `src/app.module.ts`, `src/shared/http/throttler.config.ts`, `ip-throttler.guard.ts` |
| Redis opcional para throttling distribuido en múltiples réplicas | `THROTTLE_REDIS_URL` en `env.schema.ts` |
| CORS condicional, sin `credentials`, deshabilitado en producción si no hay orígenes configurados | `src/shared/http/cors.config.ts` |
| Endpoints admin protegidos por API key con comparación timing-safe; devuelven 404 si la feature está deshabilitada (no revelan existencia) | `src/modules/admin/admin-api-key.guard.ts`, `api-key.utils.ts` |
| Admin y Swagger deshabilitados por defecto en `pro` | `src/shared/config/app-environment.ts`, `env/pro.env` |
| Validación de entorno con Zod al arranque; exige secretos cuando la feature correspondiente está activa | `src/shared/config/env.schema.ts` (`superRefine`) |
| Filtro global de excepciones: sin stack traces ni detalles internos en respuestas 5xx en `pro` | `src/shared/errors/http-exception.filter.ts` |
| Prisma ORM exclusivo; sin `$queryRaw` / `$executeRaw` en `src/` | Búsqueda sin coincidencias |
| Validación Zod de entrada en módulos críticos (assistant, admin) e ISIN validado (12 chars, uppercase) | `assistant-context.schema.ts`, `admin-sync-request.schema.ts` |
| API keys de LLM solo en servidor; límite de tokens (500) y temperatura baja (0.3) | `llm-chat-completion.service.ts` |
| Defensa en capas para SORA: filtro de intents prohibidos, system prompt con reglas inmutables, contexto factual desde BD, RAG con chunks curados, guardrails de salida con fallback seguro | `intent-classifier.service.ts`, `assistant-system-prompt.ts`, `assistant-output.guardrails.ts` |
| Agente Python autenticado con `hmac.compare_digest` y no expuesto públicamente por diseño | `agent-service/app/auth.py`, `docs/security-hardening.md` |
| Device tokens opacos (32 bytes aleatorios) almacenados como hash SHA-256 | `device-token.utils.ts`, `anonymous-devices.repository.ts` |
| Analytics sin PII: lista cerrada de eventos, propiedades solo escalares | `analytics-event.schema.ts`, `analytics-event-names.ts` |
| URLs con `apikey` redactadas en logs | `sanitize-url-for-log.ts` |
| `.env` y variantes en `.gitignore`; docker-compose exige `POSTGRES_PASSWORD` explícito | `.gitignore`, `docker-compose.yml` |

### 2.2 Cliente (`invesora`)

| Control | Evidencia |
|---------|-----------|
| Sin API keys de FMP/OpenAI en el bundle; la IA se consume solo vía backend | Búsqueda en `src/`: 0 coincidencias; `src/core/api/assistant-client.ts` |
| Variables `EXPO_PUBLIC_*` limitadas a valores públicos por diseño (URL de API, flags, DSN de Sentry) | `src/core/config/app-environment.ts` |
| HTTPS en perfiles `qa` y `pro`; `usesCleartextTraffic: false` en Android | `env/pro.env`, `app.json` |
| Allowlist de URLs externas: solo `https:`, sin IP literal, sin credenciales embebidas, hosts en lista cerrada | `src/core/security/safe-external-url.ts` + specs |
| `Linking.openURL` siempre precedido por validación (`openSafeExternalUrl` / `isSafeExternalUrl`) | `legal-screen.tsx`, `home-news-section.tsx` |
| SecureStore en nativo para favoritos, perfil educativo, progreso de aprendizaje y token de dispositivo, con migración desde AsyncStorage | `src/core/storage/secure-storage.ts` |
| Validación de rutas: ISIN con Zod + regex ISO 6166 en `/funds/[isin]`, `/compare`, `/calculator`; parámetros inválidos → not found sin crash | `fund-isin.ts`, `fund-detail-screen.tsx` |
| Sin WebView, `dangerouslySetInnerHTML`, `eval` ni `Function()` | Búsqueda: 0 resultados |
| Perfil educativo sincronizado sin respuestas literales del cuestionario | `derived-educational-profile-payload.ts` |
| Guardrails del asistente también en cliente (defensa en profundidad) | `assistant-output-guardrails.ts` |
| Sin `expo-updates`/OTA (elimina el vector de actualización remota) y sin permisos peligrosos en `app.json` | `package.json`, `app.json` |
| Quality gate con `security:verify-plugins` en pre-push y CI | `package.json` (`test:ci`), `.husky/pre-push` |
| Política de privacidad completa y pantalla legal in-app | `public/privacidad.html`, `legal-screen.tsx` |

---

## 3. Hallazgos de severidad alta

### A1 — Prompt injection mitigado solo parcialmente (backend)

- **Evidencia:** `src/modules/assistant/entities/assistant-system-prompt.ts` interpola el mensaje del usuario directamente en el prompt (`Pregunta del usuario: ${message}`). Los filtros de entrada (`intent-classifier.service.ts`) y de salida (`assistant-output.guardrails.ts`) son regex en español, bypasseables con parafraseo, typos o inglés.
- **Riesgo:** un usuario puede inducir a SORA a emitir recomendaciones de compra/venta o contenido fuera de política, dañando la posición legal del producto ("no es asesoramiento financiero").
- **Remediación:** delimitar el input del usuario con marcadores estructurados y una instrucción explícita de tratarlo como datos; considerar clasificación de intent con el propio LLM o moderación adicional; ampliar guardrails de salida más allá de regex.

### A2 — SSL pinning declarado pero no implementado (cliente)

- **Evidencia:** `plugins/with-ssl-pinning.js` solo configura ATS (iOS) y deshabilita cleartext (Android); no hay hashes SPKI ni TrustKit. El comentario en `src/core/api/ssl-pinning.ts` y la política de privacidad (`public/privacidad.html`, sección de seguridad) afirman certificate pinning en producción.
- **Riesgo:** además del gap técnico (MITM con CA comprometida), existe **riesgo legal**: la política de privacidad afirma un control que no existe.
- **Remediación:** implementar pinning real (SPKI hashes vía módulo nativo o librería) **o** corregir `privacidad.html` y los comentarios de código para describir exactamente lo que hay (HTTPS + ATS + no-cleartext). La corrección documental es inmediata; el pinning real requiere gestionar rotación de certificados de Railway (ver `security-hardening.md`).

### A3 — Sin auditoría de dependencias en CI (ambos repos)

- **Evidencia:** `.github/workflows/ci.yml` en ambos repos ejecuta lint/build/tests pero ningún `npm audit` / `pnpm audit`, Dependabot ni Snyk.
- **Riesgo:** vulnerabilidades conocidas en dependencias (directas o transitivas) pasan desapercibidas; es el vector de supply chain más común.
- **Remediación:** añadir `npm audit --audit-level=high` (API) y `pnpm audit --audit-level high` (app) como paso de CI, y habilitar Dependabot/Renovate en GitHub.

### A4 — `env/local.env` commiteado con placeholders reutilizables (backend)

- **Evidencia:** `env/local.env` contiene `POSTGRES_PASSWORD`, `ADMIN_API_KEY` y `ASSISTANT_*_API_KEY` con valores `change-me-local-*`; el directorio `env/` no está en `.gitignore`.
- **Riesgo:** que un despliegue de qa/pro reutilice por descuido credenciales conocidas públicamente en el repo. Nota: el diseño es intencional para Docker local (ver `security-hardening.md`), y `env/pro.env` no contiene secretos.
- **Remediación:** mantener el guard `security:verify-local`, añadir verificación en arranque que rechace valores `change-me-*` cuando `APP_ENV !== 'local'`, y documentar la prohibición en el checklist de despliegue (ya recogido en el plan de contingencia).

### A5 — `expo-dev-client` presente en el perfil de producción (cliente)

- **Evidencia:** `app.json` incluye `expo-dev-client` en `plugins` globales, que aplican también al perfil `production` de `eas.json`.
- **Riesgo:** un build de tienda con dev client embebido expone menús de desarrollo y superficie de depuración.
- **Remediación:** condicionar el plugin al perfil de build (app.config dinámico o exclusión en EAS) y verificar el binario de producción antes de subirlo a stores.

---

## 4. Hallazgos de severidad media

### 4.1 Backend

| # | Hallazgo | Evidencia | Remediación recomendada |
|---|----------|-----------|-------------------------|
| M1 | Sin límite explícito de tamaño de body (DoS ligero en `/assistant/chat`, `/analytics/events`) | `src/main.ts` | `app.use(json({ limit: '100kb' }))` |
| M2 | Sin `ValidationPipe` global; DTOs Swagger son schemas vacíos sin `class-validator` | `src/main.ts`, `assistant-explain.dto.ts` | La validación real es Zod; unificar criterio y documentarlo, o añadir pipe global |
| M3 | `ZodError` sin capturar en analytics y anonymous-devices → 500 en lugar de 400 | `analytics.controller.ts`, `anonymous-devices.controller.ts` | Filtro global que mapee `ZodError` a `BadRequestException` |
| M4 | `POST /analytics/events` y `POST /anonymous-devices/register` abiertos sin throttle dedicado (spam / llenado de BD) | Controllers respectivos | Throttle específico más estricto + validación de volumen |
| M5 | `sessionId` del asistente controlado por el cliente sin binding al device token (contaminación de contexto conversacional) | `assistant.service.ts`, `assistant-context.schema.ts` | Vincular `sessionId` a `deviceId` o emitirlo desde servidor |
| M6 | Sin límite de costo diario/mensual de LLM (solo rate limit por IP) | `env.schema.ts` | Límite de gasto en la cuenta OpenAI + contador de uso en BD |
| M7 | Logs de analytics incluyen el payload completo del evento (`deviceId`, `sessionId`) | `analytics.service.ts` | Loguear solo `event` + `surface` en `pro` |
| M8 | IP spoofing del rate limit si `trust proxy` está activo sin red de proxies confiable | `main.ts`, `ip-throttler.guard.ts` | Configurar `trust proxy` con el número de saltos real del hosting |
| M9 | Conversaciones y mensajes de usuario persistidos sin política de retención | `prisma/schema.prisma` (assistant) | Job de purga según `ASSISTANT_CACHE_TTL_DAYS` y declaración en la política de privacidad |
| M10 | Si `NODE_ENV=development` en un deploy, CORS abre orígenes Expo por defecto | `cors.config.ts` | Verificar `NODE_ENV=production` en el checklist de despliegue |
| M11 | PostgreSQL de Docker expuesto en `localhost:5432` por defecto | `docker-compose.yml` | Aceptable en local; no replicar el compose en servidores |
| M12 | Validación inconsistente: `GET /funds/:identifier` acepta UUID sin schema en el controller | `fund-detail.controller.ts` | Validar con Zod antes de delegar al servicio |

### 4.2 Cliente

| # | Hallazgo | Evidencia | Remediación recomendada |
|---|----------|-----------|-------------------------|
| M13 | Mensajes de error del backend retransmitidos a la UI sin sanitizar | `src/core/api/client.ts`, `use-assistant-chat.ts` | Mostrar mensajes genéricos; detalle solo a Sentry/dev |
| M14 | `logoUrl` de la API cargado en `<Image source={{ uri }}>` sin validar host/protocolo | `fund-card-icon.tsx` | Validar con `isSafeExternalUrl` o allowlist de CDN |
| M15 | En web todo el almacenamiento va a AsyncStorage sin cifrado (SecureStore no disponible) | `secure-storage.ts` | Limitación de plataforma; ya declarado en `privacidad.html` — mantener solo datos no sensibles |
| M16 | Política de privacidad afirma certificate pinning inexistente (ver A2) | `privacidad.html` | Corregir el texto junto con A2 |
| M17 | `apiGet<T>` castea `as T` sin validar; la validación depende de parsers por servicio | `client.ts` | Exigir parser en la firma o Zod uniforme por endpoint |

---

## 5. Hallazgos de severidad baja (resumen)

| Área | Hallazgos |
|------|-----------|
| Backend — API | Sin versionado de rutas (`/v1`); CSP y COEP desactivados en Helmet; sin redirect HTTPS a nivel app (delegado al proxy); `FMP_API_KEY` viaja en query string (mitigado en logs) |
| Backend — assistant | `ASSISTANT_ENABLED=false` por defecto en pro/qa (positivo como default, revisar al activar); agente Python expone puerto 8001 en Docker local |
| Backend — datos | Device tokens sin expiración/rotación; `timestamp` de analytics sin validación ISO estricta; perfil educativo derivado podría considerarse dato personal indirecto bajo RGPD |
| Cliente — config | `EXPO_PUBLIC_BRANDFETCH_CLIENT_ID` y `EXPO_PUBLIC_SENTRY_DSN` van al bundle si se configuran (públicos por diseño, pero visibles) |
| Cliente — rutas | `benchmarkKey` en `/rankings/[benchmarkKey]` solo con `trim()`, sin whitelist; analytics extrae ISIN del pathname sin re-validar |
| Cliente — almacenamiento | `sessionId` de analytics en AsyncStorage plano; `compare-selection-store` no valida formato ISIN al escribir |
| Cliente — privacidad | Registro de dispositivo automático al abrir la app (declarado en política); email de contacto personal expuesto en `privacidad.html` |

---

## 6. Checklist de cumplimiento pre-lanzamiento

Verificación operativa antes de cada despliegue a producción (complementa el checklist de [security-hardening.md](./security-hardening.md)):

- [ ] `APP_ENV=pro` y `NODE_ENV=production` en el hosting
- [ ] `SWAGGER_ENABLED=false` (default de pro; confirmar sin override)
- [ ] `ADMIN_SYNC_ENABLED=false` y `ADMIN_CATALOG_ENABLED=false` salvo operación puntual
- [ ] Ninguna variable con valor `change-me-*` en qa/pro
- [ ] `ADMIN_API_KEY`, `ASSISTANT_INTERNAL_API_KEY`, `ASSISTANT_AGENT_API_KEY` únicas, fuertes y solo en el secret store del hosting
- [ ] `CORS_ORIGINS` con la lista exacta de orígenes web (o vacío para solo nativo)
- [ ] Agente Python sin dominio público; alcanzable solo desde la red interna
- [ ] `THROTTLE_REDIS_URL` configurado si hay más de una réplica
- [ ] Límite de gasto configurado en la cuenta OpenAI
- [ ] Build EAS de producción sin `expo-dev-client` (hasta resolver A5, verificar manualmente)
- [ ] `EXPO_PUBLIC_API_URL` apuntando a HTTPS de producción
- [ ] `privacidad.html` alineada con los controles realmente implementados
- [ ] `npm audit` / `pnpm audit` ejecutado manualmente (hasta automatizar A3)

---

## 7. Priorización de remediaciones

| Prioridad | Hallazgos | Esfuerzo estimado | Criterio |
|-----------|-----------|-------------------|----------|
| **P0 — antes del lanzamiento público** | A2 (corrección documental de `privacidad.html` + M16), A5, A3 (paso de CI), M1, M3, M13 | 1–2 días | Riesgo legal, superficie de release y errores triviales de endurecer |
| **P1 — primeras semanas post-lanzamiento** | A1, A4 (guard de arranque), M4, M5, M6, M7, M14 | 3–5 días | Abuso, costo LLM y robustez del asistente |
| **P2 — mejora continua** | A2 (pinning nativo real), M2, M8–M12, M15, M17 y hallazgos bajos | Incremental | Endurecimiento progresivo sin bloquear el MVP |

---

## 8. Conclusión

El MVP puede lanzarse con un nivel de riesgo aceptable para su naturaleza (educativo, sin cuentas, sin operaciones financieras), **siempre que se ejecute el bloque P0 y se respete el checklist operativo**. Los dos frentes que más atención requieren a corto plazo son la **coherencia legal** (afirmaciones de la política de privacidad frente a los controles reales) y la **robustez del asistente SORA** frente a prompt injection y abuso de costo. El plan de respuesta ante incidentes asociado a este informe está en [security-contingency-plan.md](./security-contingency-plan.md).
