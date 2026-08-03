from __future__ import annotations

import pytest

from edux.services.config import user_llm_override as user_llm_override_module
from edux.services.llm.config import LLMConfig


def _config(provider_name: str = "openai", api_key: str = "admin-key") -> LLMConfig:
    return LLMConfig(
        model="gpt-4o-mini",
        api_key=api_key,
        base_url="https://api.openai.com/v1",
        provider_name=provider_name,
    )


def test_apply_user_key_override_swaps_key_when_provider_matches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        user_llm_override_module,
        "load_user_llm_override",
        lambda: {"enabled": True, "provider_name": "openai", "api_key": "user-key"},
    )
    result = user_llm_override_module.apply_user_key_override(_config(provider_name="openai"))
    assert result.api_key == "user-key"


def test_apply_user_key_override_leaves_config_untouched_when_provider_differs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        user_llm_override_module,
        "load_user_llm_override",
        lambda: {"enabled": True, "provider_name": "anthropic", "api_key": "user-key"},
    )
    config = _config(provider_name="openai")
    result = user_llm_override_module.apply_user_key_override(config)
    assert result.api_key == "admin-key"


def test_apply_user_key_override_leaves_config_untouched_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        user_llm_override_module,
        "load_user_llm_override",
        lambda: {"enabled": False, "provider_name": "openai", "api_key": "user-key"},
    )
    config = _config()
    assert user_llm_override_module.apply_user_key_override(config).api_key == "admin-key"


def test_apply_user_key_override_leaves_config_untouched_when_key_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        user_llm_override_module,
        "load_user_llm_override",
        lambda: {"enabled": True, "provider_name": "openai", "api_key": ""},
    )
    config = _config()
    assert user_llm_override_module.apply_user_key_override(config).api_key == "admin-key"


def test_apply_user_key_override_leaves_config_untouched_when_no_override_saved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(user_llm_override_module, "load_user_llm_override", lambda: None)
    config = _config()
    assert user_llm_override_module.apply_user_key_override(config).api_key == "admin-key"


def test_save_load_clear_roundtrip(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    override_file = tmp_path / "llm_key_override.json"
    monkeypatch.setattr(user_llm_override_module, "_override_file", lambda: override_file)

    assert user_llm_override_module.load_user_llm_override() is None

    saved = user_llm_override_module.save_user_llm_override("sk-abcdEFGH1234", "openai")
    assert saved["masked_hint"] == "sk-...1234"
    assert saved["provider_name"] == "openai"

    loaded = user_llm_override_module.load_user_llm_override()
    assert loaded == saved

    user_llm_override_module.clear_user_llm_override()
    assert user_llm_override_module.load_user_llm_override() is None
