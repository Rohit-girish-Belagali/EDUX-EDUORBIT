"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { inputClass } from "@/components/settings/shared";
import { apiFetch, apiUrl } from "@/lib/api";

type OverrideState = {
  has_key: boolean;
  provider_name: string | null;
  masked_hint: string | null;
  updated_at: string | null;
};

const ENDPOINT = "/api/v1/settings/llm-key-override";

export function ApiKeyOverrideSettings() {
  const { t } = useTranslation();
  const [state, setState] = useState<OverrideState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(apiUrl(ENDPOINT));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as OverrideState;
        if (!cancelled) {
          setState(payload);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiKeyDraft.trim() || saving) return;
    setSaving(true);
    setActionError(null);
    setSavedMessage(null);
    try {
      const res = await apiFetch(apiUrl(ENDPOINT), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKeyDraft.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((await res.json()) as OverrideState);
      setApiKeyDraft("");
      setSavedMessage(t("Key saved."));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [apiKeyDraft, saving, t]);

  const handleRemove = useCallback(async () => {
    if (removing) return;
    setRemoving(true);
    setActionError(null);
    setSavedMessage(null);
    try {
      const res = await apiFetch(apiUrl(ENDPOINT), { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((await res.json()) as OverrideState);
      setSavedMessage(t("Key removed."));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemoving(false);
    }
  }, [removing, t]);

  return (
    <div>
      <div className="mb-4 rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/40 px-5 py-4">
        {loadError ? (
          <p className="text-[12px] text-red-500">
            {t("Failed to load")}: {loadError}
          </p>
        ) : state === null ? (
          <div className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("Loading...")}
          </div>
        ) : (
          <p className="text-[12.5px] text-[var(--foreground)]">
            {state.has_key ? (
              <>
                {t("Your key is active for")}{" "}
                <span className="font-mono">{state.provider_name}</span>
                {" · "}
                <span className="font-mono text-[var(--muted-foreground)]">
                  {state.masked_hint}
                </span>
              </>
            ) : (
              t(
                "No key saved yet. The shared account key is used for your requests.",
              )
            )}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/40 px-5 py-4">
        <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
          {t("API Key")}
        </div>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            className={`${inputClass} pr-10 font-mono`}
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            placeholder={state?.has_key ? t("Type to replace") : "sk-..."}
          />
          <button
            type="button"
            onClick={() => setShowApiKey((prev) => !prev)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={showApiKey ? t("Hide API key") : t("Show API key")}
            title={showApiKey ? t("Hide API key") : t("Show API key")}
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {actionError && (
          <p className="mt-2 text-[12px] text-red-500">
            {t("Failed to save")}: {actionError}
          </p>
        )}
        {savedMessage && !actionError && (
          <p className="mt-2 text-[12px] text-emerald-600 dark:text-emerald-400">
            {savedMessage}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!apiKeyDraft.trim() || saving}
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t("Saving...") : t("Save")}
          </button>
          {state?.has_key && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removing ? t("Removing...") : t("Remove key")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
