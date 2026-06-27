# SORA Agent Service

Servicio interno en Python para evolucionar SORA desde respuestas explicativas simples hacia un agente educativo con tools, sesiones y comparacion guiada de fondos.

NestJS sigue siendo la API publica de Inversora. Este servicio debe tratarse como runtime privado: recibe contexto factual ya filtrado desde el backend, ejecuta el agente y devuelve una respuesta estructurada.

## Arranque local

```powershell
cd agent-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
$env:OPENAI_API_KEY = "sk-..."
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
  -Body '{"message":"Explicame que significa el TER","surface":"fund-detail","locale":"es","context":{"fund":{"name":"Vanguard S&P 500 UCITS ETF","ter":0.07}}}'
```

## Variables

| Variable             | Uso                                                                               |
| -------------------- | --------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`     | API key usada por el Agents SDK.                                                  |
| `OPENAI_AGENT_MODEL` | Modelo para el agente. Por defecto `gpt-4o-mini` para mantener coste bajo en MVP. |
| `SORA_AGENT_PORT`    | Puerto sugerido si se arranca con Docker/uvicorn. Por defecto `8001`.             |

## Principios

- No llamar a FMP ni a Postgres directamente desde el agente en MVP.
- No aceptar herramientas de escritura.
- No devolver recomendaciones de compra, venta o suscripcion.
- No inventar datos fuera del `context` enviado por NestJS.
- Mantener respuestas en espanol, educativas y breves.
