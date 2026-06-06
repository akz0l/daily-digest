"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AwsHeader } from "@/components/auth/AwsHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { unsubscribe } from "@/lib/api";

type Status = "confirm" | "loading" | "success" | "error" | "invalid";

export function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";
  const email = (searchParams.get("email") ?? searchParams.get("mail") ?? "")
    .trim()
    .toLowerCase();

  const [status, setStatus] = useState<Status>(
    id && email ? "confirm" : "invalid"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleUnsubscribe = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      await unsubscribe(id, email);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No se pudo cancelar la suscripción. Intenta de nuevo."
      );
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AwsHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        <AuthCard>
          {status === "invalid" && <InvalidState />}
          {status === "confirm" && (
            <ConfirmState email={email} onConfirm={handleUnsubscribe} />
          )}
          {status === "loading" && <LoadingState email={email} />}
          {status === "success" && <SuccessState email={email} />}
          {status === "error" && (
            <ErrorState
              email={email}
              message={errorMessage}
              onRetry={handleUnsubscribe}
            />
          )}
        </AuthCard>

        <p className="mt-6 text-xs text-[#9ca3af] text-center max-w-[380px] leading-relaxed">
          ¿Te arrepentiste?{" "}
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-[#FF9900] transition-colors"
          >
            Volver a suscribirte
          </Link>
        </p>
      </main>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
        <AlertIcon className="text-red-500" />
      </div>
      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        Enlace no válido
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
        Este enlace de cancelación no es válido o ha expirado. Usa el enlace del
        último correo que recibiste o contacta con soporte.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center w-full h-11 rounded-lg text-sm font-semibold bg-[#FF9900] hover:bg-[#EC7211] text-white transition-colors"
      >
        Ir al inicio
      </Link>
    </div>
  );
}

function ConfirmState({
  email,
  onConfirm,
}: {
  email: string;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] flex items-center justify-center mb-5">
        <MailIcon />
      </div>

      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        Cancelar suscripción
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
        ¿Confirmas que deseas dejar de recibir el resumen diario en{" "}
        <span className="font-medium text-[#374151] dark:text-[#d1d5db]">
          {email}
        </span>
        ? Dejarás de recibir correos de Daily Tech News.
      </p>

      <button
        type="button"
        onClick={onConfirm}
        className="w-full h-11 rounded-lg text-sm font-semibold bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D08B00] text-white cursor-pointer transition-colors mb-3"
      >
        Confirmar baja
      </button>

      <Link
        href="/"
        className="block w-full h-11 rounded-lg text-sm font-semibold border border-[#e5e7eb] dark:border-[#374151] text-[#374151] dark:text-[#d1d5db] hover:border-[#d1d5db] dark:hover:border-[#4b5563] flex items-center justify-center transition-colors"
      >
        Mantener suscripción
      </Link>
    </div>
  );
}

function LoadingState({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF3E0] flex items-center justify-center mx-auto mb-6">
        <SpinnerIcon />
      </div>
      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        Procesando baja…
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed">
        Cancelando la suscripción de{" "}
        <span className="font-medium text-[#374151] dark:text-[#d1d5db]">
          {email}
        </span>
        .
      </p>
    </div>
  );
}

function SuccessState({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-[#10B981]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        Suscripción cancelada
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-1">
        Ya no recibirás más correos de Daily Tech News.
      </p>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
        Hemos dado de baja{" "}
        <span className="font-medium text-[#374151] dark:text-[#d1d5db]">
          {email}
        </span>
        .
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center w-full h-11 rounded-lg text-sm font-semibold bg-[#FF9900] hover:bg-[#EC7211] text-white transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

function ErrorState({
  email,
  message,
  onRetry,
}: {
  email: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-5">
        <AlertIcon className="text-red-500" />
      </div>

      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        No se pudo cancelar
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
        Hubo un problema al cancelar la suscripción de{" "}
        <span className="font-medium text-[#374151] dark:text-[#d1d5db]">
          {email}
        </span>
        .
      </p>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 mb-5">
        <AlertIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-full h-11 rounded-lg text-sm font-semibold bg-[#FF9900] hover:bg-[#EC7211] text-white cursor-pointer transition-colors mb-3"
      >
        Intentar de nuevo
      </button>

      <Link
        href="/"
        className="block w-full h-11 rounded-lg text-sm font-semibold border border-[#e5e7eb] dark:border-[#374151] text-[#374151] dark:text-[#d1d5db] hover:border-[#d1d5db] dark:hover:border-[#4b5563] flex items-center justify-center transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="16"
      viewBox="0 0 20 16"
      fill="none"
      stroke="#FF9900"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="2" width="18" height="12" rx="2" />
      <path d="M1 4l9 6 9-6" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`w-8 h-8 ${className ?? ""}`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-8 h-8 text-[#FF9900]" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
