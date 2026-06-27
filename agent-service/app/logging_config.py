"""Structured logging helpers for the SORA agent service."""

import logging
import sys


def configure_logging() -> None:
    """Configures application-wide logging once at startup."""

    level_name = "INFO"
    logging.basicConfig(
        level=getattr(logging, level_name, logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
    )


def get_logger(name: str) -> logging.Logger:
    """Returns a module logger."""

    return logging.getLogger(name)
