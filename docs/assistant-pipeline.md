# SORA assistant pipeline (layered)

Pipeline de generación del Asistente Inversora en `inversora-api`. Objetivo: **minimizar coste** (capas sin tokens) y **maximizar trazabilidad** (source en cada respuesta).

## Flujo

```text
Pregunta
  → reglas / intent classifier (forbidden, intent)
  → glosario
  → cache PostgreSQL
  → respuesta determinista (template)
  → RAG (docs + JSON factual del fondo)
  → Qwen (LLM principal, API compatible OpenAI)
  → OpenAI fallback (solo baja confianza o error)
```

## Capas

| Capa | Servicio | `source` | Coste tokens |
|------|----------|----------|--------------|
| Reglas | `IntentClassifierService` | — | 0 |
| Glosario | `GlossaryService` | `glossary` | 0 |
| Cache | `AssistantCacheRepository` | `cache` | 0 |
| Plantilla | `DeterministicAssistantService` | `template` | 0 |
| RAG | `AssistantRagService` | — (contexto) | 0 en MVP (keyword) |
| LLM principal | `AssistantLlmOrchestratorService` + Qwen | `qwen` | Bajo |
| Fallback | mismo orchestrator + OpenAI | `openai-fallback` | Alto, acotado |

## Configuración

Variables en `.env`:

```bash
ASSISTANT_ENABLED=true
ASSISTANT_RUNTIME=nestjs

# Qwen (primary) — DashScope, OpenRouter, etc.
ASSISTANT_LLM_PRIMARY_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ASSISTANT_LLM_PRIMARY_MODEL=qwen-2.5-7b-instruct
ASSISTANT_LLM_PRIMARY_API_KEY=...

# OpenAI fallback (opcional pero recomendado)
ASSISTANT_OPENAI_FALLBACK_ENABLED=true
ASSISTANT_FALLBACK_CONFIDENCE_THRESHOLD=0.6
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Legacy: si solo existe `OPENAI_API_KEY`, se usa como primary key (compatibilidad tests/dev).

## RAG (MVP)

Corpus curado en `src/modules/assistant/entities/assistant-rag.data.ts` (chunks de docs de producto, scoring, legal). Recuperación por **keyword scoring**; evolución futura: `pgvector` + ingest automático.

Datos del fondo siempre via `AssistantContextBuilderService` (no vectorizados).

## Confianza y fallback

`AssistantConfidenceService` calcula score heurístico [0, 1]:

- Guardrails HU-40 pasan
- Referencias factuales cuando el intent lo requiere
- Longitud mínima de respuesta

Si `confidence < ASSISTANT_FALLBACK_CONFIDENCE_THRESHOLD` → reintento con OpenAI usando el mismo prompt RAG.

## Respuesta HTTP

Campos opcionales nuevos: `model`, `confidence`, `fallbackReason`.

Ver Swagger `POST /assistant/explain` y `POST /assistant/chat`.

## Evaluación

Set de preguntas frecuentes: [assistant-eval-set.md](./assistant-eval-set.md).

## Runtime Python

`ASSISTANT_RUNTIME=python-agent` sigue disponible pero **fuera del camino crítico** del pipeline Qwen+RAG. Ver [openai-agent-python-backend.md](./openai-agent-python-backend.md).
