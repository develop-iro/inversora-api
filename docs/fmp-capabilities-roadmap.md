# Financial Modeling Prep: capacidades y roadmap de datos

Este documento resume que puede aportar [Financial Modeling Prep (FMP)](https://site.financialmodelingprep.com/developer/docs) a Inversora, que capacidades son mas valiosas para el MVP y que tendria que implementar `inversora-api` para explotar mejor el dataset.

> Estado de referencia: junio de 2026. FMP cambia nombres de endpoints, cobertura y planes; antes de convertir una capacidad en requisito cerrado hay que verificarla con nuestra `FMP_API_KEY` real y registrar el resultado en fixtures.

## Objetivo para Inversora

FMP debe ser un proveedor de datos, no una fuente de decisiones. El backend debe:

- descubrir fondos indexados y ETFs candidatos;
- normalizar metadata, historicos, composicion y exposiciones;
- persistir snapshots auditables en PostgreSQL;
- calcular score, rankings y advertencias de calidad de datos en servidor;
- servir a la app un contrato estable, educativo y con fecha de actualizacion visible.

La app nunca debe llamar a FMP directamente.

## Capacidades FMP utiles para el MVP

| Capacidad FMP | Endpoints/documentacion | Valor para Inversora | Estado backend |
|---------------|-------------------------|----------------------|----------------|
| Busqueda por simbolo | [`/stable/search-symbol`](https://site.financialmodelingprep.com/developer/docs/stable/search-symbol) | Descubrir tickers, nombre, exchange y divisa. Base para alta manual o sync por simbolos. | Implementado |
| Busqueda por nombre | [`/stable/search-name`](https://site.financialmodelingprep.com/developer/docs/stable/search-name) | Busqueda asistida por nombre de gestora/fondo cuando no se conoce ticker. | Implementado |
| Lista de ETFs | [`/stable/etf-list`](https://site.financialmodelingprep.com/developer/docs/stable/etfs-list) | Poblar universo US (~6k). Modo `all` ingiere el catalogo completo; modo `indexed` aplica heuristica (~1k). | Implementado (`listEtfCatalogSymbols`) |
| Perfil ETF/fondo | [`/stable/etf/info`](https://site.financialmodelingprep.com/developer/docs/stable/information) | ISIN, descripcion, expense ratio, AUM, NAV, inception date, issuer, asset class, domicilio. Nutre ficha y scoring. | Parcial; fallback si el endpoint no esta disponible |
| Historico EOD completo | [`/stable/historical-price-eod/full`](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-full) | Graficos, rentabilidades por periodo, volatilidad, drawdown y comparador. | Implementado; **solo US en Starter** |
| Historico EOD ligero | [`/stable/historical-price-eod/light`](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-light) | Alternativa de menor payload para catalogo, freshness o sincronizaciones grandes. | Pendiente |
| Historico ajustado por dividendos | [`/stable/historical-price-eod/dividend-adjusted`](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-dividend-adjusted) | Mejor aproximacion a retorno total cuando aplique; evita comparar solo precio. | Pendiente |
| Holdings ETF/fondo | [`/stable/etf/holdings`](https://site.financialmodelingprep.com/developer/docs/stable/holdings) | Top posiciones, concentracion, diversificacion, explicaciones SORA sobre "en que invierte". | Implementado; **402 en Starter** — usar `--no-composition` |
| Peso sectorial | [`/stable/etf/sector-weightings`](https://site.financialmodelingprep.com/developer/docs/stable/sector-weighting) | Exposicion por sector para ficha, filtros educativos y warnings de concentracion. | Implementado |
| Peso por pais | [`/stable/etf/country-weightings`](https://site.financialmodelingprep.com/developer/docs/stable/country-weighting) | Exposicion geografica y explicacion de sesgos USA/global/europa. | Implementado |
| Asset exposure inversa | [`/stable/etf-asset-exposure`](https://site.financialmodelingprep.com/developer/docs/stable/etf-asset-exposure) | Saber que ETFs/fondos tienen una accion concreta. Util para explicar solapamientos y concentracion indirecta. | Pendiente |
| Disclosures actuales | [`/stable/latest-disclosures`](https://site.financialmodelingprep.com/developer/docs/stable/latest-disclosures) | Validar cambios recientes de cartera y frescura de composicion. | Pendiente |
| Disclosures por fecha | [`/stable/disclosures-dates`](https://site.financialmodelingprep.com/developer/docs/stable/disclosures-dates) | Auditoria historica de cartera y deteccion de cambios entre trimestres. | Pendiente |
| Busqueda de disclosures | [`/stable/disclosures-name-search`](https://site.financialmodelingprep.com/developer/docs/stable/disclosures-name-search) | Localizar disclosures por nombre cuando el simbolo/CIK no basta. | Pendiente |
| Bulk de holdings | [`/stable/etf-holder-bulk`](https://site.financialmodelingprep.com/developer/docs/stable/etf-holder-bulk) | Sincronizacion masiva eficiente si pasamos a cientos de fondos. | Pendiente |
| Bulk EOD | [`/stable/eod-bulk`](https://site.financialmodelingprep.com/developer/docs/stable/eod-bulk) | Carga diaria masiva de precios sin N llamadas por simbolo. | Pendiente |
| Quote/price corto | [`/stable/quote-short`](https://site.financialmodelingprep.com/developer/docs/stable/quote-short) | Precio reciente y estado de mercado para ETFs cotizados. Menos relevante para fondos no cotizados. | Pendiente |
| Cambios de simbolo | [`/stable/symbol-changes-list`](https://site.financialmodelingprep.com/developer/docs/stable/symbol-changes-list) | Evitar registros rotos si cambia un ticker. | Pendiente |
| Noticias | [`/stable/search-stock-news`](https://site.financialmodelingprep.com/developer/docs/stable/search-stock-news) | Bajo valor MVP; riesgo de ruido y sesgo de actualidad. Mejor no priorizar. | No planificado |

## Capacidades que mas nutren el MVP

### 1. Catalogo y descubrimiento

Para dejar de depender de una lista manual de simbolos, el backend deberia combinar:

- ETF list para universo base;
- search by symbol/name para alta manual y QA;
- filtros internos para estrategia indexada, vehiculo, divisa, exchange, ISIN y benchmark;
- estados `visible`, `quarantined`, `blocked` para controlar que llega a la app.

El resultado esperado es un pipeline:

```text
FMP ETF/list/search
  -> raw schema
  -> normalizer
  -> candidate_funds o fund_import_candidates
  -> reglas DQ
  -> funds visibles o cuarentena
```

### 2. Ficha de fondo completa

Los campos mas utiles para `GET /funds/:isin` son:

- nombre, ticker, ISIN, exchange, divisa;
- gestora/issuer, domicilio, asset class;
- TER/expense ratio;
- AUM;
- NAV;
- fecha de inicio;
- descripcion;
- holdings count;
- fecha de ultima actualizacion por bloque.

Hoy `Fund` ya persiste simbolo, ISIN, nombre, divisa, TER, AUM, score, benchmark y vehiculo. Falta persistir de forma explicita varios campos de perfil (`issuer`, `description`, `domicile`, `assetClass`, `nav`, `holdingsCount`, `inceptionDate` si no queremos inferir edad en memoria).

### 3. Scoring y rankings

RN-04 usa TER, tracking error, AUM y edad. FMP aporta directamente parte de esto:

| Factor RN-04 | FMP puede aportar | Brecha |
|--------------|-------------------|--------|
| TER | `expenseRatio` en ETF/fund information | Confirmar formato y plan; normalizar porcentaje vs decimal |
| AUM | `assetsUnderManagement` | Persistir moneda/fuente y detectar outliers |
| Edad | `inceptionDate` | Persistir fecha original |
| Tracking error | No aparece como dato directo en la integracion actual | Calcular en backend contra benchmark con historicos del fondo y del indice |

Para explotar el scoring al maximo falta implementar un `BenchmarkPriceSyncService`:

1. mapa `benchmark -> symbol/indexSymbol`;
2. descarga de historicos del benchmark;
3. calculo de tracking error y tracking difference;
4. persistencia versionada de metricas derivadas;
5. recalc de score con peer group homogeneo.

### 4. Exposicion, diversificacion y explicabilidad

Holdings, sectores y paises son claves para que la app no sea solo una tabla de scores. Permiten:

- top 10 posiciones;
- peso acumulado del top 10;
- concentracion sectorial;
- concentracion geografica;
- solapamiento entre fondos en comparador;
- mensajes SORA como "este fondo esta muy expuesto a tecnologia/USA";
- advertencias educativas cuando una cartera parece global pero esta concentrada.

Falta explotar estos datos en metricas persistidas:

- `top10Weight`;
- `holdingsCount`;
- `largestHoldingWeight`;
- `largestSectorWeight`;
- `largestCountryWeight`;
- `overlapScore` para comparador;
- `dataFreshnessDays` por composicion.

### 5. Calidad de datos y auditoria

FMP es proveedor externo; el backend debe tratar cada respuesta como dato no confiable hasta validarla.

Reglas DQ recomendadas:

- ISIN valido y unico cuando exista.
- TER presente para ranking.
- Benchmark presente para ranking.
- AUM no negativo y con rangos razonables.
- Inception date parseable y no futura.
- Historico suficiente para calcular volatilidad/drawdown.
- Composicion con pesos positivos y suma razonable.
- Holdings con `asOf` reciente.
- Divisa ISO 4217.
- Endpoint de pago/no disponible registrado como degradacion, no como error fatal.

Falta una tabla de observabilidad de proveedor, por ejemplo `provider_sync_runs` y `provider_sync_events`, para auditar:

- endpoint llamado;
- simbolo;
- status HTTP;
- payload size;
- plan/capability error (`402`, `403`, quota);
- registros normalizados;
- registros descartados;
- fixture generado.

## Plan activo: FMP Starter (~29 USD/mes)

Características incluidas en el plan (según ficha de producto FMP, junio 2026):

| Límite / capacidad | Valor |
|--------------------|-------|
| Llamadas API | 300 / minuto |
| Histórico EOD | Hasta 5 años |
| Cobertura | **US Coverage** (mercados USA) |
| Fundamentals | Annual Fundamentals and Ratios |
| Precios | Historical Stock Price Data |
| Referencia | Profile and Reference Data |
| Otros | Financial Market News, Crypto and Forex |

### Verificado con nuestra API key (junio 2026)

| Endpoint / flujo | Starter | Notas para Inversora |
|------------------|---------|----------------------|
| `search-symbol` / `search-name` | Sí | Descubrimiento de tickers US y UCITS listados (p. ej. `IWDA.L`, `CSPX.L`, `VWCE.DE`). |
| `etf/info` | Sí | Perfil completo para US y UCITS probados. |
| `historical-price-eod/full` | Solo **US** | Símbolos `.L` / `.DE` devuelven **402**; alinear con "US Coverage". |
| `etf/holdings` | **No** (402) | Requiere plan superior (Ultimate en pricing público). Sync manual: `--no-composition`. |
| `etf/sector-weightings` | Parcial | OK en US; en algunos símbolos el payload no pasa validación Zod. |
| `etf/country-weightings` | Parcial | Mismo comportamiento que sectoriales. |

### Implicaciones operativas

```text
Sync US (Starter)
  metadata  -> getFundProfile (sin exigir EOD en metadata)
  prices    -> historical-price-eod/full
  composition -> omitir (--no-composition) hasta plan con holdings

Sync UCITS (Starter)
  metadata  -> getFundProfile + etf/info (ISIN, TER, AUM)
  prices    -> no disponible (402); fondo entra sin gráficos ni volatilidad
  composition -> no disponible
  scoring   -> puede quedar incompleto; mostrar advertencias de calidad de datos
```

Comandos de referencia contra Neon/Railway DB:

```bash
node --env-file=.env -r ts-node/register -r tsconfig-paths/register src/cli/run-fund-sync.ts \
  --symbols SPY,IVV,VOO --no-composition

node --env-file=.env -r ts-node/register -r tsconfig-paths/register src/cli/run-fund-sync.ts \
  --symbols IWDA.L,CSPX.L,VWCE.DE --no-prices --no-composition
```

## Plan gratuito vs plan de pago

Actualmente no contamos con modelo de pago, asi que hay que diseñar la integracion como "capability-aware":

- cada endpoint debe tener una prueba de disponibilidad con nuestra key;
- los errores `402`, `403`, quota o payload vacio deben degradar el sync sin romper el resto;
- la app debe recibir `dataQuality` y `sourceFreshness`, no errores crudos de FMP;
- los endpoints de pago deben vivir detras de flags o capability checks;
- CI y tests deben usar siempre fixtures (`FMP_DATA_SOURCE=mock`).

Segun la pagina de pricing de FMP, los planes superiores incluyen capacidades como ETF & Mutual Fund Holdings, Full Historical Access, Bulk and Batch Delivery y mas llamadas por minuto. Tambien indican limites de ancho de banda por plan. La disponibilidad real de cada endpoint debe verificarse con nuestra key porque la pagina publica no sustituye una prueba de contrato.

## MCP Server de FMP

FMP tambien ofrece un servidor MCP remoto en:

```text
https://financialmodelingprep.com/mcp?apikey=YOUR_FMP_API_KEY
```

Segun la documentacion oficial, el MCP server envuelve los endpoints REST tradicionales como herramientas listas para clientes compatibles con MCP. Esta pensado para agentes y entornos de analisis como Claude, Cursor, Cloudflare Workers AI o scripts propios con librerias MCP. Cada llamada realizada por el agente cuenta contra los limites de la misma API key de FMP.

### Donde encaja en Inversora

| Uso | Recomendacion |
|-----|---------------|
| Investigacion de producto | Si. Un agente puede explorar rapidamente que endpoints existen, comparar respuestas y proponer nuevas metricas. |
| QA manual de datos | Si. Puede ayudar a comprobar un ticker, un holding o una exposicion sin escribir un script temporal. |
| Captura de fixtures | Posible, pero secundario. El flujo principal debe seguir siendo `scripts/capture-fmp-fixtures.mjs` para dejar trazabilidad. |
| Backend NestJS productivo | No como dependencia principal. Para sync diario, scoring y BFF conviene mantener REST tipado, Zod, fixtures y tests deterministas. |
| SORA de usuario final | No en el MVP. SORA debe explicar datos ya normalizados por nuestro backend; no deberia consultar FMP libremente ni inventar rutas. |
| Agente interno futuro | Si. Podria existir un "data analyst agent" interno, separado del runtime publico, con permisos controlados. |

### Configuracion local recomendada

No commitear nunca la URL MCP completa porque contiene `FMP_API_KEY`.

Ejemplo conceptual para un cliente MCP local:

```json
{
  "mcpServers": {
    "financial-modeling-prep": {
      "url": "https://financialmodelingprep.com/mcp?apikey=<FMP_API_KEY>"
    }
  }
}
```

El repo ignora `.mcp.json` y `mcp.json` para reducir el riesgo de filtrar claves. Si un cliente permite variables de entorno, preferir `FMP_API_KEY` sobre pegar la clave literal.

### Que haria falta para integrarlo en el backend

Solo tendria sentido si construimos un agente interno server-side. En ese caso haria falta:

1. Crear un modulo separado, por ejemplo `src/modules/data-agent/`, no mezclarlo con `providers`.
2. Añadir un cliente MCP compatible con Node.js o ejecutar un worker aislado.
3. Usar `FMP_API_KEY` desde secrets de entorno, nunca desde configuracion commiteada.
4. Limitar herramientas permitidas a endpoints de solo lectura.
5. Registrar llamadas, coste/cuota, simbolo y motivo de uso en auditoria.
6. Convertir toda salida MCP a schemas Zod propios antes de persistir o servir a la app.
7. Mantener `FMP_DATA_SOURCE=mock` y fixtures para CI.

La conclusion practica: MCP es muy util como interfaz de agente para analisis y descubrimiento, pero no reemplaza nuestra capa REST tipada. Para el producto, `FinancialModelingPrepClient` debe seguir siendo la fuente de integracion estable.

## Backlog backend recomendado

### Prioridad 1 - Completar el MVP real

1. Persistir campos ricos de `etf/info`: `issuer`, `description`, `assetClass`, `domicile`, `nav`, `holdingsCount`, `inceptionDate`.
2. Separar `expenseRatio` raw de `ter` normalizado y documentar unidad.
3. Crear `provider_sync_runs` / `provider_sync_events`.
4. Exponer `sourceFreshness` por bloque en el BFF (`profile`, `market`, `holdings`, `exposure`, `score`).
5. Calcular metricas de concentracion desde holdings/allocation.
6. Añadir tests de degradacion para `402/403/quota` por endpoint.

### Prioridad 2 - Dataset mas amplio

1. Implementar `fetchEtfList` para descubrir universo inicial.
2. Crear una tabla `fund_import_candidates`.
3. Implementar reglas DQ antes de promover candidatos a `funds`.
4. Soportar bulk EOD o estrategia incremental diaria por fecha.
5. Añadir job administrativo: "descubrir nuevos fondos" separado del sync diario.

### Prioridad 3 - Scoring avanzado y comparador

1. Crear `Benchmark` y `BenchmarkPrice` en Prisma.
2. Sincronizar historicos de indices.
3. Calcular tracking error y tracking difference.
4. Persistir metricas derivadas versionadas.
5. Implementar overlap entre fondos para comparador.
6. Añadir warnings de comparabilidad entre fondos de distintos benchmarks.

### Prioridad 4 - Disclosures y auditoria avanzada

1. Consumir latest disclosures y disclosures por fecha.
2. Persistir fecha de disclosure y filing metadata.
3. Detectar cambios relevantes de cartera entre snapshots.
4. Mostrar "composicion actualizada a..." con origen y antiguedad.
5. Usar disclosures para validar holdings y reducir confianza cuando esten desactualizados.

## Modelo de datos sugerido

Tablas o ampliaciones candidatas:

| Tabla/campo | Proposito |
|-------------|-----------|
| `funds.issuer` | Gestora/proveedor del fondo |
| `funds.description` | Texto fuente para ficha y SORA, sanitizado |
| `funds.assetClass` | Renta variable, renta fija, mixto, etc. |
| `funds.domicile` | Domicilio legal/fiscal del producto |
| `funds.nav` / `funds.navCurrency` | NAV y divisa |
| `funds.holdingsCount` | Numero de posiciones segun FMP |
| `funds.inceptionDate` | Fecha de inicio para scoring |
| `fund_metric_snapshots` | Metricas derivadas versionadas |
| `provider_sync_runs` | Cabecera de cada sync |
| `provider_sync_events` | Evento por endpoint/simbolo |
| `fund_import_candidates` | Universo descubierto antes de publicar |
| `benchmarks` | Benchmark canonico y symbol mapping |
| `benchmark_prices` | Historico de indices |
| `fund_disclosures` | Filing/disclosure metadata |

## Contrato hacia la app

La app necesita datos listos para UI, no respuestas FMP. El backend deberia exponer:

- `sourceLabel`: "Financial Modeling Prep";
- `asOf`: fecha del dato;
- `freshnessDays`;
- `dataQuality.status`;
- `dataQuality.warnings[]`;
- `missingCapabilities[]` cuando el plan actual no permita cierta informacion;
- copy educativo estable para que SORA explique, no invente.

Ejemplo de degradacion esperada:

```json
{
  "sourceLabel": "Financial Modeling Prep",
  "asOf": "2026-06-21",
  "dataQuality": {
    "status": "warning",
    "warnings": [
      "No hay tracking error calculado porque falta historico del benchmark.",
      "La composicion procede del ultimo snapshot disponible."
    ]
  },
  "missingCapabilities": ["benchmark-history", "disclosures"]
}
```

## Recomendacion de producto

Para el MVP no conviene ampliar indiscriminadamente el dataset. La secuencia mas rentable es:

1. Catalogo fiable y pequeño.
2. Ficha rica y explicable.
3. Ranking trazable con RN-04.
4. Exposicion/holdings para entender "que hay dentro".
5. Comparador con solapamiento y advertencias.
6. Expansion masiva solo cuando tengamos DQ, cuotas y bulk bajo control.

FMP puede alimentar casi todo el MVP, pero Inversora debe diferenciarse por la capa de normalizacion, calidad de datos, explicabilidad y prudencia legal. El valor no esta en replicar FMP; esta en convertir datos financieros crudos en una experiencia segura para principiantes.

## Fuentes oficiales

- [FMP API Documentation](https://site.financialmodelingprep.com/developer/docs)
- [Stock Symbol Search API](https://site.financialmodelingprep.com/developer/docs/stable/search-symbol)
- [Company Name Search API](https://site.financialmodelingprep.com/developer/docs/stable/search-name)
- [ETF Symbol Search API](https://site.financialmodelingprep.com/developer/docs/stable/etfs-list)
- [ETF & Mutual Fund Information API](https://site.financialmodelingprep.com/developer/docs/stable/information)
- [Historical Price EOD Full API](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-full)
- [Historical Price EOD Light API](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-light)
- [Dividend Adjusted Price Chart API](https://site.financialmodelingprep.com/developer/docs/stable/historical-price-eod-dividend-adjusted)
- [ETF & Fund Holdings API](https://site.financialmodelingprep.com/developer/docs/stable/holdings)
- [ETF Sector Weighting API](https://site.financialmodelingprep.com/developer/docs/stable/sector-weighting)
- [ETF & Fund Country Allocation API](https://site.financialmodelingprep.com/developer/docs/stable/country-weighting)
- [ETF Asset Exposure API](https://site.financialmodelingprep.com/developer/docs/stable/etf-asset-exposure)
- [Mutual Fund & ETF Disclosure API](https://site.financialmodelingprep.com/developer/docs/stable/latest-disclosures)
- [Fund & ETF Disclosures by Date API](https://site.financialmodelingprep.com/developer/docs/stable/disclosures-dates)
- [ETF Holder Bulk API](https://site.financialmodelingprep.com/developer/docs/stable/etf-holder-bulk)
- [EOD Bulk API](https://site.financialmodelingprep.com/developer/docs/stable/eod-bulk)
- [FMP Pricing](https://site.financialmodelingprep.com/developer/docs/pricing)
