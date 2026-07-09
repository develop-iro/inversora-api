# SORA Agent Service

Servicio interno en Python para el runtime agentico de SORA: tools de solo lectura, sesiones conversacionales y comparativas educativas de fondos indexados.

NestJS sigue siendo la API publica de Inversora. Este servicio es un runtime privado: recibe contexto factual ya filtrado desde el backend, ejecuta el agente y devuelve una respuesta estructurada.

## Arranque local

```powershell
cd agent-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
$env:OPENAI_API_KEY = "sk-..."
$env:SORA_BACKEND_BASE_URL = "http://localhost:3000"
$env:SORA_INTERNAL_API_KEY = "change-me-local-sora-internal"
$env:ASSISTANT_AGENT_API_KEY = "change-me-local-agent-key-16"
uvicorn app.main:app --reload --port 8001
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

Ejemplo de respuesta:

```powershell
Invoke-RestMethod http://localhost:8001/agent/respond `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ "X-Sora-Agent-Api-Key" = "change-me-local-agent-key-16" } `
  -Body '{"message":"Explicame que significa el TER","surface":"fund-detail","locale":"es","context":{"intent":"explain_term","fund":{"name":"Vanguard S&P 500 UCITS ETF","ter":0.07}}}'
```

## Variables

| Variable                     | Uso                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`             | API key usada por el Agents SDK.                                                  |
| `OPENAI_AGENT_MODEL`         | Modelo para el agente. Por defecto `gpt-4o-mini`.                                 |
| `OPENAI_AGENT_TEMPERATURE`   | Temperatura del modelo. Por defecto `0.3`.                                        |
| `OPENAI_AGENT_MAX_TOKENS`    | Limite de tokens de salida. Por defecto `500`.                                    |
| `SORA_BACKEND_BASE_URL`      | Base URL de NestJS para tools internas.                                           |
| `SORA_INTERNAL_API_KEY`      | Debe coincidir con `ASSISTANT_INTERNAL_API_KEY`.                                  |
| `ASSISTANT_AGENT_API_KEY`    | Debe coincidir con `ASSISTANT_AGENT_API_KEY` en NestJS. Requerida en `/agent/respond`. |
| `SORA_AGENT_API_KEY`         | Alias aceptado de `ASSISTANT_AGENT_API_KEY` en Docker.                            |
| `SORA_BACKEND_TIMEOUT_SECONDS` | Timeout HTTP de tools. Por defecto `5`.                                       |
| `SORA_AGENT_PORT`            | Puerto sugerido con Docker/uvicorn. Por defecto `8001`.                           |

## Tools internas (NestJS)

| Tool Python                      | Endpoint NestJS                                           |
| -------------------------------- | --------------------------------------------------------- |
| `get_fund_snapshot`              | `GET /internal/assistant/tools/funds/:isin/snapshot`      |
| `get_score_breakdown`            | `GET /internal/assistant/tools/funds/:isin/score-breakdown` |
| `compare_funds`                  | `POST /internal/assistant/tools/funds/compare`            |
| `validate_comparison_fairness`   | `POST /internal/assistant/tools/funds/validate-comparison` |
| `get_glossary_term`              | `GET /internal/assistant/tools/glossary/:term`            |

## Tests

```powershell
cd agent-service
python -m pip install -e ".[dev]"
pytest
```

## Principios

- No llamar a FMP ni a Postgres directamente desde el agente.
- No aceptar herramientas de escritura.
- No devolver recomendaciones de compra, venta o suscripcion.
- No inventar datos fuera del `context` o de las tools read-only.
- Mantener respuestas en espanol, educativas y breves.
- Prompt versionado alineado con NestJS: `sora-v2`.
