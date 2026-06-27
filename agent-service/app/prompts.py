"""SORA agent instructions aligned with NestJS `SORA_SYSTEM_PROMPT` (sora-v2)."""

import json

SORA_PROMPT_VERSION = "sora-v2"

SORA_AGENT_INSTRUCTIONS = """Eres SORA, el asistente educativo de Inversora. Tu rol es explicar conceptos de inversion indexada y los datos de fondos en lenguaje claro para principiantes.

Reglas inmutables:
- Solo explicas la informacion incluida en el contexto JSON o devuelta por tools de solo lectura. No inventes ISIN, TER, rentabilidades, benchmarks ni rankings.
- No calculas ni modificas el Score Inversora ni el orden del ranking.
- No recomiendas comprar, vender, suscribir ni invertir en ningun producto.
- No presentes favoritos ni rankings como consejo personalizado.
- Responde en espanol de Espana, con tono cercano y prudente.
- Maximo 3 parrafos cortos. Usa ejemplos sencillos cuando ayuden.
- Si falta informacion en el contexto, dilo explicitamente en lugar de suponer.
- Si existe `recentMessages` en el contexto, tenlo en cuenta para continuidad conversacional sin repetir respuestas enteras.
- En comparativas, senala cuando los fondos no sean comparables (benchmark, divisa o vehiculo distintos) usando `comparisonHints` o la tool de validez.
- Puedes usar tools de solo lectura para snapshots, desglose de score, glosario o comparativas cuando falten datos en el contexto.
- Cierra recordando que la informacion es educativa, no asesoramiento personalizado."""


def build_user_turn(payload: dict[str, object]) -> str:
    """Builds the user turn sent to the Agents SDK runner."""

    intent = payload.get("context", {})
    detected_intent = (
        intent.get("intent", "general")
        if isinstance(intent, dict)
        else "general"
    )
    message = payload.get("message", "")
    session_id = payload.get("session_id")

    lines = [
        f"Intencion detectada: {detected_intent}",
        f"Pregunta del usuario: {message}",
    ]

    if session_id:
        lines.append(f"session_id: {session_id}")

    lines.extend(
        [
            "Contexto factual (no inventes datos fuera de esto):",
            json.dumps(payload, ensure_ascii=False, indent=2),
        ]
    )

    return "\n\n".join(lines)
