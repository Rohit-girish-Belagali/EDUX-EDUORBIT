"use client";

import { useTranslation } from "react-i18next";

export default function GoogleSignInButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-medium text-sm
                 bg-neutral-900/80 border border-neutral-700 text-neutral-100
                 hover:bg-neutral-800 hover:border-neutral-500
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-all duration-200"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20.5H24v7h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5c-7.7 0-14.3 4.4-17.7 10.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.4-4.6 2.3-7.5 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 40.5 16.3 45 24 45z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5C41.4 35.4 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"
        />
      </svg>
      {t("Continue with Google")}
    </button>
  );
}
