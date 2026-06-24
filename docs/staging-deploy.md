# Despliegue de staging — Neon + Railway

Guía paso a paso para publicar **inversora-api** en un entorno staging compartido (Fase 1).

| Componente | Servicio |
|------------|----------|
| PostgreSQL | [Neon](https://neon.tech) |
| API NestJS | [Railway](https://railway.app) |

---

## Paso 1 — Crear la base de datos en Neon

1. En **Welcome to Neon**, configura:
   - **Project name:** `inversora` (o el nombre que prefieras)
   - **Postgres version:** `18` (válido para Prisma)
   - **Region:** si la app se probará desde Europa, elige una región EU (p. ej. `AWS Europe Frankfurt`). Para staging US también vale `US East`.
   - **Neon Auth:** déjalo **desactivado** (no lo necesitamos; la API no usa auth de Neon)

2. Pulsa **Create project**.

3. En el dashboard de Neon, abre **Connection details** y copia la cadena **Connection string** (modo `URI`).

   Debe verse similar a:

   ```text
   postgresql://neondb_owner:xxxxxxxx@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

4. Guárdala en un gestor de secretos (no la commitees). La usarás como `DATABASE_URL` en Railway.

5. Deriva también estos valores para las variables `POSTGRES_*` (el schema de la API las exige):

   | Variable | Ejemplo (ajusta al tuyo) |
   |----------|--------------------------|
   | `POSTGRES_USER` | `neondb_owner` |
   | `POSTGRES_PASSWORD` | la contraseña del URI |
   | `POSTGRES_DB` | `neondb` |
   | `POSTGRES_HOST` | `ep-xxxx.us-east-1.aws.neon.tech` |
   | `POSTGRES_PORT` | `5432` |

---

## Paso 2 — Aplicar migraciones en Neon (desde tu PC)

Antes del primer deploy, aplica el esquema contra Neon:

```bash
cd inversora-api

# Crea .env.staging.local (no lo commitees) con DATABASE_URL de Neon
# y POSTGRES_* derivados del paso 1.

npm run prisma:migrate:deploy
```

Comprueba conexión:

```bash
npm run prisma:validate
```

---

## Paso 3 — Desplegar la API en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión con GitHub.

2. **New project** → **Deploy from GitHub repo** → selecciona `inversora-api`.

3. Railway detectará el `Dockerfile` en la raíz. Si no, en **Settings → Build** elige **Dockerfile**.

4. En **Variables**, añade:

   ```env
   NODE_ENV=production
   PORT=3000

   DATABASE_URL=postgresql://...tu-uri-neon...?sslmode=require
   POSTGRES_USER=neondb_owner
   POSTGRES_PASSWORD=...
   POSTGRES_DB=neondb
   POSTGRES_HOST=ep-xxxx.us-east-1.aws.neon.tech
   POSTGRES_PORT=5432

   FMP_API_KEY=tu-clave-starter
   FMP_DATA_SOURCE=live
   FMP_SAVE_FIXTURES=false

   SYNC_SCHEDULER_ENABLED=true
   SYNC_CRON_EXPRESSION=0 6 * * *
   SYNC_FUND_SYMBOLS=SPY

   ADMIN_SYNC_ENABLED=true
   ADMIN_CATALOG_ENABLED=false
   ADMIN_API_KEY=genera-un-secreto-largo-min-8-chars

   CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
   ```

   Notas:
   - Con **FMP Starter**, usa `FMP_DATA_SOURCE=live` y la API key real. El histórico EOD es **solo US**; UCITS entran con metadata (`--no-prices`) y sync sin composición (`--no-composition`). Ver [fmp-capabilities-roadmap.md](./fmp-capabilities-roadmap.md).
   - Para CI y entornos sin cuota FMP, mantén `FMP_DATA_SOURCE=mock`.
   - `CORS_ORIGINS` es obligatorio en `NODE_ENV=production` para Expo web.
   - React Native en dispositivo **no** depende de CORS.
   - Detalle: [cors-and-expo-client.md](./cors-and-expo-client.md).

5. En **Settings → Networking**, genera un **Public domain** (HTTPS).

6. Espera al deploy. Comprueba:

   ```bash
   curl https://TU-DOMINIO.railway.app/health
   ```

   Respuesta esperada: `{"status":"ok"}`

---

## Paso 4 — Poblar datos en staging

Con la API en marcha, ejecuta el sync **desde tu máquina** apuntando al admin de staging:

```bash
curl -X POST "https://TU-DOMINIO.railway.app/admin/sync" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY" \
  -d '{"symbols":["SPY"]}'
```

O desde local contra la misma BD Neon:

```bash
# .env con DATABASE_URL de Neon
node --env-file=.env -r ts-node/register -r tsconfig-paths/register src/cli/run-fund-sync.ts --symbols SPY
```

Verifica:

```bash
curl "https://TU-DOMINIO.railway.app/rankings"
curl "https://TU-DOMINIO.railway.app/funds?page=1&limit=5"
```

---

## Paso 5 — Conectar la app Expo

En `inversora/.env`:

```env
EXPO_PUBLIC_API_URL=https://TU-DOMINIO.railway.app
```

| Entorno | URL |
|---------|-----|
| Expo web (mismo PC) | URL pública de Railway |
| Simulador iOS | URL pública de Railway |
| Android emulator | URL pública de Railway |
| Dispositivo físico | URL pública de Railway |

Reinicia Metro (`npm start`) tras cambiar `.env`.

---

## Checklist Fase 1

- [ ] Neon: proyecto creado y `DATABASE_URL` guardada
- [ ] Migraciones aplicadas (`prisma migrate deploy`)
- [ ] Railway: deploy verde y `/health` OK
- [ ] Sync ejecutado (al menos SPY con score)
- [ ] `/rankings` devuelve datos
- [ ] App con `EXPO_PUBLIC_API_URL` apunta a staging

---

## Problemas frecuentes

| Síntoma | Causa | Acción |
|---------|-------|--------|
| Build falla en Railway | Falta `package-lock.json` o error de TypeScript | Revisa logs; `npm run build` en local |
| API no arranca | Env inválida | Revisa logs; todas las `POSTGRES_*` + `DATABASE_URL` |
| `Environment validation failed` | Falta `ADMIN_API_KEY` con admin activo | Añade clave ≥ 8 caracteres |
| CORS en Expo web | `CORS_ORIGINS` vacío en production | Añade `http://localhost:8081` |
| Ranking vacío | Sin sync en staging | Paso 4 |

---

## Ver también

- [infrastructure-phases.md](./infrastructure-phases.md)
- [development-api.md](../../invesora/docs/development-api.md) (app local)
