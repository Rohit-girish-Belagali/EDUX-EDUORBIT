"""Per-user LLM API key override.

Lets a user supply their own API key so their requests keep working when the
admin-owned shared key (``model_catalog.json``) expires, runs out of quota, or
gets rate-limited. Stored per-user (scoped via ``get_path_service()``), unlike
the model catalog which is deliberately forced onto the admin's path.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
import json
from typing import TYPE_CHECKING, Any

from edux.services.path_service import get_path_service

if TYPE_CHECKING:
    from edux.services.llm.config import LLMConfig


def _override_file():
    return get_path_service().get_settings_file("llm_key_override")


def _mask(api_key: str) -> str:
    tail = api_key[-4:] if len(api_key) >= 4 else api_key
    return f"sk-...{tail}"


def load_user_llm_override() -> dict[str, Any] | None:
    """Return the current user's stored override, or None if unset."""
    override_file = _override_file()
    if not override_file.exists():
        return None
    try:
        with open(override_file, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def save_user_llm_override(api_key: str, provider_name: str) -> dict[str, Any]:
    """Persist the current user's own API key for ``provider_name``."""
    override = {
        "enabled": True,
        "provider_name": provider_name,
        "api_key": api_key,
        "masked_hint": _mask(api_key),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    override_file = _override_file()
    override_file.parent.mkdir(parents=True, exist_ok=True)
    with open(override_file, "w", encoding="utf-8") as handle:
        json.dump(override, handle, ensure_ascii=False, indent=2)
    return override


def clear_user_llm_override() -> None:
    """Remove the current user's stored override, if any."""
    override_file = _override_file()
    if override_file.exists():
        override_file.unlink()


def apply_user_key_override(config: "LLMConfig") -> "LLMConfig":
    """Swap in the current user's own API key when it applies to this config.

    Fails open to ``config`` unchanged if there's no override, it's disabled,
    the key is empty, or it was saved for a different provider than the one
    currently active (e.g. the admin switched providers after the user saved
    their key).
    """
    override = load_user_llm_override()
    if not override or not override.get("enabled"):
        return config
    api_key = override.get("api_key")
    if not api_key or override.get("provider_name") != config.provider_name:
        return config
    return replace(config, api_key=api_key)


__all__ = [
    "apply_user_key_override",
    "clear_user_llm_override",
    "load_user_llm_override",
    "save_user_llm_override",
]
