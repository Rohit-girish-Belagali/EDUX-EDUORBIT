import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "../locales/en/app.json";

const deviceLocale = Localization.getLocales()?.[0]?.languageCode ?? "en";

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { app: en } },
    ns: ["app"],
    defaultNS: "app",
    lng: deviceLocale,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
