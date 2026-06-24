# CORS y cliente Expo

Configuración de **Cross-Origin Resource Sharing (CORS)** en `inversora-api` para que **Expo web** pueda consumir la API desde el navegador. Las apps nativas (iOS/Android) **no** usan CORS.

## Cuándo importa CORS

| Cliente | ¿CORS? | Variable relevante |
|---------|--------|-------------------|
| Expo web (`npm run web`) | Sí | `CORS_ORIGINS` en la API |
| iOS Simulator / Android Emulator | No | `EXPO_PUBLIC_API_URL` en la app |
| Dispositivo físico en LAN | No | `EXPO_PUBLIC_API_URL` con IP del PC |
| App contra API staging (Railway) | Solo en web | `CORS_ORIGINS` + `EXPO_PUBLIC_API_URL` |

El navegador envía un `Origin` (p. ej. `http://localhost:8081`). La API debe responder con `Access-Control-Allow-Origin` si ese origen está permitido.

## Variables de entorno (API)

| Variable | Descripción |
|----------|-------------|
| `CORS_ORIGINS` | Lista separada por comas de orígenes permitidos (`scheme://host:port`). |

### Comportamiento por entorno

| `NODE_ENV` | `CORS_ORIGINS` vacío | Resultado |
|------------|----------------------|-----------|
| `development` | Sí | Orígenes por defecto de Expo web (puertos `8081` y `19006`) |
| `production` / `test` | Sí | CORS desactivado |
| Cualquiera | Con valores | Solo los orígenes configurados |

### Orígenes por defecto en desarrollo

```text
http://localhost:8081
http://127.0.0.1:8081
http://localhost:19006
http://127.0.0.1:19006
```

### Ejemplo `.env` local

```env
NODE_ENV=development
# Opcional: añade un túnel o puerto extra
# CORS_ORIGINS=http://localhost:8081,https://abc123.ngrok-free.app
```

### Ejemplo staging (Railway + Expo web en tu PC)

```env
NODE_ENV=production
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

Sin `CORS_ORIGINS` en producción, Expo web verá errores del tipo *blocked by CORS policy*.

## Métodos y cabeceras permitidos

Implementación en `src/shared/http/cors.config.ts`:

| Opción | Valor |
|--------|-------|
| Métodos | `GET`, `HEAD`, `OPTIONS`, `POST` |
| Cabeceras | `Content-Type`, `Accept` |
| Credenciales | `false` (el MVP no usa cookies ni sesión en navegador) |
| `maxAge` preflight | 86400 s (24 h) |

Si en el futuro la app envía cookies o cabeceras de autorización desde el navegador, habrá que ampliar `allowedHeaders` y valorar `credentials: true`.

## Verificación rápida

Con la API en marcha (`npm run start:dev`):

```bash
# Preflight (debe devolver 204 y Access-Control-Allow-Origin)
curl -i -X OPTIONS http://localhost:3000/health \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: GET"

# GET con origen permitido
curl -i http://localhost:3000/health \
  -H "Origin: http://localhost:8081"
```

Tests automatizados: `npm run test:e2e -- cors.e2e-spec.ts`

## Cliente móvil (`EXPO_PUBLIC_API_URL`)

La app resuelve la URL base en `inversora/src/core/api/config.ts`. Guía detallada y scripts de ayuda: [invesora/docs/development-api.md](../../invesora/docs/development-api.md).

## Referencias

- [staging-deploy.md](./staging-deploy.md) — variables en Railway
- [infrastructure-phases.md](./infrastructure-phases.md) — criterio de fase 1
