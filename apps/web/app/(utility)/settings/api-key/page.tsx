"use client";

import { useTranslation } from "react-i18next";

import { ApiKeyOverrideSettings } from "@/components/settings/ApiKeyOverrideSettings";
import { SettingsPageHeader } from "@/components/settings/shared";

export default function ApiKeySettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <SettingsPageHeader
        title={t("My API Key")}
        description={t(
          "Used automatically if the shared account key runs out of quota or stops working. Applies to your account only — nobody else's requests are affected.",
        )}
      />
      <ApiKeyOverrideSettings />
    </div>
  );
}
