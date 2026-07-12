# Plan de contingencia de seguridad

Plan de respuesta ante incidentes de seguridad del MVP Inversora (backend `inversora-api` + app `invesora`). Complementa el informe [security-report.md](./security-report.md) y la guía operativa [security-hardening.md](./security-hardening.md).

**Objetivo:** que ante cualquier incidente exista un procedimiento escrito de detección → contención → erradicación → recuperación, ejecutable por una sola persona en minutos.

---

## 1. Roles y contacto

| Rol | Responsable | Notas |
|-----|-------------|-------|
| Incident commander | Mantenedor del proyecto (rol único) | Proyecto personal: la misma persona detecta, contiene y comunica |
| Canal de aviso a usuarios | `privacidad.html` (sección de avisos) + notas de versión en stores | El MVP no tiene cuentas ni emails de usuarios; la comunicación es pública |
| Proveedores implicados | Railway (API), Neon (PostgreSQL), Expo/EAS (builds), OpenAI (LLM), FMP (datos), Sentry (observabilidad) | Tener a mano el acceso a cada consola |

---

## 2. Clasificación de incidentes

| ID | Escenario | Severidad | Impacto principal |
|----|-----------|-----------|-------------------|
| INC-1 | Fuga de API key (FMP, OpenAI/LLM, `ADMIN_API_KEY`, `ASSISTANT_*`) | Alta | Costo económico, acceso admin no autorizado |
| INC-2 | Compromiso o corrupción de PostgreSQL (Neon) | Alta | Integridad del catálogo y del scoring |
| INC-3 | Abuso / DoS de endpoints públicos (`/assistant/chat`, `/analytics/events`, `/anonymous-devices/register`) | Media–Alta | Costo LLM, llenado de BD, degradación del servicio |
| INC-4 | Prompt injection explotado en SORA (respuestas fuera de política publicadas) | Alta | Riesgo legal y reputacional ("asesoramiento" indebido) |
| INC-5 | Dependencia comprometida (supply chain, npm/pnpm) | Alta | Ejecución de código en servidor o en la app |
| INC-6 | Compromiso del pipeline de build (EAS / GitHub Actions) | Alta | Binario malicioso en stores |
| INC-7 | Desalineación legal (la política de privacidad afirma controles inexistentes o se detecta recolección indebida) | Media | Riesgo regulatorio (RGPD) y de confianza |
| INC-8 | Datos servidos incorrectos o manipulados desde FMP | Media | Rankings/score engañosos para usuarios principiantes |

---

## 3. Kill switches disponibles

Todos son variables de entorno validadas en `src/shared/config/env.schema.ts`; cambiarlas en el secret store del hosting y redesplegar (o reiniciar) aplica el corte. Defaults por entorno en `src/shared/config/app-environment.ts`.

| Switch | Efecto | Uso típico |
|--------|--------|-----------|
| `ASSISTANT_ENABLED=false` | Apaga SORA por completo (default en pro/qa) | INC-1 (key LLM), INC-3, INC-4 |
| `ASSISTANT_RUNTIME=nestjs` | Desconecta el agente Python sin apagar SORA | Compromiso del agente |
| `ASSISTANT_OPENAI_FALLBACK_ENABLED=false` | Corta el fallback a OpenAI (frena gasto) | INC-1, INC-3 |
| `ADMIN_SYNC_ENABLED=false` + `ADMIN_CATALOG_ENABLED=false` | Elimina la superficie admin (guards devuelven 404) | INC-1 (admin key) |
| `SYNC_SCHEDULER_ENABLED=false` | Detiene el sync automático con FMP | INC-8, INC-1 (key FMP) |
| `SWAGGER_ENABLED=false` | Oculta el contrato HTTP | Reconocimiento activo |
| `THROTTLE_LIMIT` / `THROTTLE_ASSISTANT_LIMIT` (bajar valores) | Endurece el rate limit sin tocar código | INC-3 |
| `CORS_ORIGINS=` (vacío) | Deshabilita CORS: corta el acceso desde web | Abuso desde origen web |
| En la app: `EXPO_PUBLIC_API_URL` (EAS) | Repuntar la app a otra instancia del API | INC-2, INC-6 |
| Consola OpenAI: límite de gasto / revocar key | Corte duro del costo LLM | INC-1, INC-3 |
| Railway: pausar el servicio | Apagado total del API como último recurso | Cualquier compromiso activo |

---

## 4. Runbooks por escenario

### INC-1 — Fuga de API key

**Detección:** gasto anómalo en la consola OpenAI/FMP, syncs no programados en logs de Railway, accesos admin inesperados, key visible en un commit/log.

1. **Contener:** revocar la key comprometida en la consola del proveedor (OpenAI/FMP) o rotarla en el secret store de Railway (`ADMIN_API_KEY`, `ASSISTANT_INTERNAL_API_KEY`, `ASSISTANT_AGENT_API_KEY`). Si la key es de LLM y no se puede rotar de inmediato: `ASSISTANT_ENABLED=false`.
2. **Erradicar:** generar la key nueva, actualizarla en el secret store y redesplegar. Si es `ASSISTANT_AGENT_API_KEY`, actualizar NestJS y el agente Python juntos (orden de rotación en [security-hardening.md](./security-hardening.md#api-key-rotation)). Si la key apareció en el repo, purgarla del historial y considerarla quemada aunque se purgue.
3. **Recuperar:** reactivar features apagadas; revisar en logs qué se hizo con la key (syncs admin, cambios de visibilidad de catálogo) y revertir cambios de datos si los hubo.
4. **Verificar:** llamada de prueba con la key vieja debe fallar (401/404).

### INC-2 — Compromiso o corrupción de PostgreSQL

**Detección:** datos del catálogo alterados, errores de integridad, alertas de Neon, queries anómalas en `list_slow_queries`.

1. **Contener:** rotar la contraseña/connection string en Neon y actualizar `DATABASE_URL` en Railway. Si hay manipulación activa, pausar el servicio API.
2. **Erradicar:** identificar el vector (¿credencial filtrada?, ¿endpoint abierto? — ver INC-3). Aplicar el fix correspondiente.
3. **Recuperar:** restaurar mediante point-in-time recovery de Neon o branch desde un punto sano; alternativamente re-poblar con `npm run sync:run` + recálculo de scoring (los datos maestros provienen de FMP y son reconstruibles). Los datos anónimos (dispositivos, analytics, conversaciones) son prescindibles: ante duda de integridad, truncar es aceptable.
4. **Verificar:** `npm run db:validate` / `prisma:validate`, smoke test de `GET /funds/:isin` y del scoring.

### INC-3 — Abuso / DoS de endpoints públicos

**Detección:** picos de tráfico en Railway, gasto LLM creciente, crecimiento anómalo de filas en `analytics_events` / `anonymous_devices`.

1. **Contener:** bajar `THROTTLE_LIMIT` y `THROTTLE_ASSISTANT_LIMIT`; si el vector es SORA, `ASSISTANT_ENABLED=false`; fijar límite de gasto duro en la consola OpenAI.
2. **Erradicar:** identificar IPs/patrones en logs; si hay Cloudflare delante (recomendado en `security-hardening.md`), bloquear en el edge; en su defecto, evaluar reglas en Railway.
3. **Recuperar:** purgar filas basura de analytics/dispositivos con SQL dirigido; restaurar límites normales gradualmente.
4. **Prevenir:** implementar M4 del informe (throttle dedicado a analytics/registro) y M6 (contador de costo LLM).

### INC-4 — Prompt injection explotado en SORA

**Detección:** reporte de usuario o captura pública de SORA recomendando comprar/vender, inventando datos o rompiendo el rol; revisión de la tabla de conversaciones.

1. **Contener:** `ASSISTANT_ENABLED=false` (kill switch inmediato; la app degrada con mensaje de no disponibilidad).
2. **Erradicar:** reproducir el bypass; reforzar `intent-classifier.service.ts`, `assistant-system-prompt.ts` y `assistant-output.guardrails.ts` (hallazgo A1 del informe); añadir el caso al eval set (`docs/assistant-eval-set.md`).
3. **Recuperar:** reactivar SORA tras pasar los evals; considerar subir `ASSISTANT_PROMPT_VERSION` para trazabilidad.
4. **Comunicar:** si la respuesta indebida tuvo difusión, publicar aclaración recordando que Inversora no da asesoramiento financiero.

### INC-5 — Dependencia comprometida (supply chain)

**Detección:** aviso de GitHub/npm advisory, `npm audit`/`pnpm audit` manual, comportamiento anómalo tras un install.

1. **Contener:** congelar despliegues y publicación de builds; si el paquete afecta al servidor en runtime, pausar el servicio API.
2. **Erradicar:** fijar la versión segura (o eliminar el paquete) en `package.json` + lockfile; reinstalar desde lockfile limpio; rotar todos los secretos que el proceso comprometido pudo leer (todas las keys del secret store).
3. **Recuperar:** redesplegar API; para la app, generar build EAS nuevo si el paquete llegó a un binario publicado.
4. **Prevenir:** implementar A3 del informe (auditoría en CI + Dependabot).

### INC-6 — Compromiso del pipeline de build (EAS / GitHub Actions)

**Detección:** builds no iniciados por el mantenedor en el historial de EAS/Actions, cambios en workflows no reconocidos, secrets de repo accedidos.

1. **Contener:** revocar `EXPO_TOKEN` y demás secrets de GitHub Actions; rotar credenciales de la cuenta Expo y GitHub (y reforzar 2FA).
2. **Erradicar:** auditar commits y workflows recientes; revertir cambios no reconocidos; revisar qué builds se generaron con el pipeline comprometido.
3. **Recuperar:** generar un build limpio desde un checkout verificado y publicarlo; si un binario malicioso llegó a stores, retirarlo y subir versión nueva con nota.
4. **Comunicar:** aviso en stores/nota de versión si hubo binario afectado.

### INC-7 — Desalineación legal / recolección indebida

**Detección:** revisión periódica de `privacidad.html` contra el código (el informe ya detectó el caso del SSL pinning, hallazgo A2/M16), reclamación de un usuario, cambio normativo.

1. **Contener:** si se detecta recolección de datos no declarada, apagar la feature (kill switch correspondiente) antes de corregir textos.
2. **Erradicar:** corregir `public/privacidad.html` (y `dist/` regenerado) para reflejar exactamente los controles y datos reales; o implementar el control declarado.
3. **Recuperar:** si se recolectaron datos indebidos, purgarlos de PostgreSQL y documentar la purga.
4. **Prevenir:** añadir "política alineada con el código" al checklist pre-deploy (sección 6 del informe).

### INC-8 — Datos incorrectos o manipulados desde FMP

**Detección:** validaciones de calidad de datos del pipeline de sync, fondos con métricas absurdas, reporte de usuario.

1. **Contener:** `SYNC_SCHEDULER_ENABLED=false` para congelar la ingesta; usar la visibilidad de catálogo admin para ocultar fondos afectados (cuarentena, según reglas de calidad del producto).
2. **Erradicar:** identificar el lote defectuoso; contrastar con la fuente; rotar `FMP_API_KEY` si se sospecha manipulación de la cuenta.
3. **Recuperar:** re-sync dirigido (`npm run sync:run`) y recálculo del scoring; re-publicar fondos ocultados.
4. **Principio de producto:** ante datos dudosos, preferir ocultar/cuarentena antes que mostrar conclusiones débiles a principiantes.

---

## 5. Detección y monitoreo

| Fuente | Qué vigilar | Estado |
|--------|-------------|--------|
| Sentry (backend `@sentry/nestjs`, app `@sentry/react-native`) | Picos de errores 5xx, excepciones nuevas tras deploy | Opcional; activar con `SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` |
| Logs de Railway | Tráfico anómalo, syncs no programados, 401/404 en rutas admin | Disponible; no loguear URLs completas con `apikey` |
| Consola OpenAI | Gasto diario, límite duro de facturación | Configurar límite (P0 del informe) |
| Consola FMP | Consumo de cuota de la key | Revisar tras cada incidente |
| Neon | Tamaño de BD, queries lentas, branches | Revisar semanalmente el crecimiento de `analytics_events` / `anonymous_devices` |
| `GET /health` | Disponibilidad básica del API | Existente; opcionalmente conectar a un uptime monitor externo |

---

## 6. Comunicación y post-mortem

Tras cerrar cualquier incidente de severidad alta, registrar un post-mortem breve (nuevo archivo en `docs/incidents/AAAA-MM-DD-titulo.md`) con esta plantilla:

```markdown
# Incidente: <título>

- **Fecha de detección / cierre:**
- **Clasificación:** INC-N, severidad
- **Impacto:** (usuarios, datos, costo, duración)
- **Cronología:** detección → contención → erradicación → recuperación
- **Causa raíz:**
- **Qué funcionó / qué faltó:**
- **Acciones preventivas:** (con referencia a hallazgos de security-report.md si aplica)
```

Comunicación externa: solo necesaria si el incidente afectó datos de dispositivos/conversaciones o si un binario/respuesta indebida llegó a usuarios. Canal: aviso en `privacidad.html` y nota de versión en stores. El MVP no maneja datos personales identificados, lo que reduce las obligaciones de notificación RGPD, pero los identificadores pseudónimos (device token, sessionId) deben tratarse con la misma disciplina.

---

## 7. Mantenimiento de este plan

- Revisar este documento cuando se añada un módulo, una variable de entorno de seguridad o un proveedor nuevo.
- Re-ejecutar la auditoría (informe [security-report.md](./security-report.md)) antes de cada hito público mayor.
- Simulacro mínimo recomendado: una vez por trimestre, ejecutar en un entorno local/qa el runbook INC-1 (rotación de una key) y cronometrar el proceso.
