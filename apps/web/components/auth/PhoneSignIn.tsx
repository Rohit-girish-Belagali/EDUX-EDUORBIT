"use client";

import { useRef, useState } from "react";
import { Phone } from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { useTranslation } from "react-i18next";
import { firebaseAuth } from "@/lib/firebase";
import { exchangeFirebaseToken } from "@/lib/auth";

/**
 * Phone sign-in via Firebase. Needs an invisible reCAPTCHA bound to a real DOM
 * node (the `recaptchaHost` div below) before `signInWithPhoneNumber` can send
 * an SMS. Two steps: send code, then confirm it — the confirmed credential's
 * ID token is exchanged with the backend exactly like Google/email sign-in.
 */
export default function PhoneSignIn({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const recaptchaHostRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  function firebaseErrorMessage(err: unknown): string {
    const code = (err as { code?: string } | null)?.code ?? "";
    if (code === "auth/invalid-phone-number") return t("Enter a valid phone number, including country code");
    if (code === "auth/code-expired") return t("That code expired — request a new one");
    if (code === "auth/invalid-verification-code") return t("Incorrect code");
    if (code === "auth/too-many-requests") return t("Too many attempts — try again later");
    return t("Could not send code");
  }

  async function sendCode() {
    onError("");
    setLoading(true);
    try {
      if (!recaptchaVerifierRef.current && recaptchaHostRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, recaptchaHostRef.current, {
          size: "invisible",
        });
      }
      const result = await signInWithPhoneNumber(firebaseAuth, phone, recaptchaVerifierRef.current!);
      setConfirmation(result);
    } catch (err) {
      onError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!confirmation) return;
    onError("");
    setLoading(true);
    try {
      const cred = await confirmation.confirm(code);
      const idToken = await cred.user.getIdToken();
      const result = await exchangeFirebaseToken(idToken);
      if (result.ok) {
        onSuccess();
      } else {
        onError(result.error ?? t("Login failed"));
      }
    } catch (err) {
      onError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Invisible reCAPTCHA anchor — required by signInWithPhoneNumber, renders nothing visible */}
      <div ref={recaptchaHostRef} />

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-medium text-sm
                     bg-neutral-900/80 border border-neutral-700 text-neutral-100
                     hover:bg-neutral-800 hover:border-neutral-500
                     transition-all duration-200"
        >
          <Phone className="w-4 h-4" />
          {t("Continue with phone")}
        </button>
      )}

      {open && !confirmation && (
        <div className="space-y-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 555 5555"
            className="w-full px-4 py-3 rounded-xl border border-neutral-800
                       bg-black/80 text-white placeholder-neutral-500
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500
                       transition-all text-sm shadow-inner"
          />
          <button
            type="button"
            disabled={loading || !phone}
            onClick={sendCode}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-neutral-800 text-white
                       hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t("Sending…") : t("Send code")}
          </button>
        </div>
      )}

      {confirmation && (
        <div className="space-y-2">
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("6-digit code")}
            className="w-full px-4 py-3 rounded-xl border border-neutral-800
                       bg-black/80 text-white placeholder-neutral-500
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500
                       transition-all text-sm shadow-inner"
          />
          <button
            type="button"
            disabled={loading || !code}
            onClick={verifyCode}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-white text-black
                       hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t("Verifying…") : t("Verify & continue")}
          </button>
        </div>
      )}
    </div>
  );
}
