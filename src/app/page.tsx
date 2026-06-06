"use client";

import Link from "next/link";
import { useState } from "react";
import { AwsHeader } from "@/components/auth/AwsHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailStep } from "@/components/auth/EmailStep";
import { OTPStep } from "@/components/auth/OTPStep";
import { SuccessStep } from "@/components/auth/SuccessStep";
import type { Topic } from "@/lib/topics";

const OTP_ENDPOINT = process.env.NEXT_PUBLIC_OTP_ENDPOINT ?? "";

interface OTPApiBody {
  id: string;
  message: string;
}

async function requestOTP(email: string, topics: Topic[]): Promise<OTPApiBody> {
  const res = await fetch(OTP_ENDPOINT + "/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, topics }),
  });

  // API Gateway wraps the Lambda response: { statusCode, headers, body (JSON string) }
  const outer = await res.json();
  const body: OTPApiBody =
    typeof outer.body === "string" ? JSON.parse(outer.body) : outer.body;

  if (outer.statusCode !== 200) {
    throw new Error(
      (body as { message?: string }).message ??
      "No se pudo enviar el código. Intenta de nuevo."
    );
  }

  return body;
}

async function verifyOTP(uuid: string, otp: string, email: string): Promise<OTPApiBody> {
  const res = await fetch(OTP_ENDPOINT + "/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: uuid, otp, email }),
  });
  // API Gateway wraps the Lambda response: { statusCode, headers, body (JSON string) }
  const outer = await res.json();
  const body: OTPApiBody =
    typeof outer.body === "string" ? JSON.parse(outer.body) : outer.body;

  if (outer.statusCode !== 200) {
    throw new Error(
      (body as { message?: string }).message ??
      "No se pudo verificar el código. Intenta de nuevo."
    );
  }

  return body;
}


type Step = "email" | "otp" | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [uuid, setUuid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleEmailSubmit = async (submittedEmail: string, selectedTopics: Topic[]) => {
    setIsLoading(true);
    setApiError("");
    try {
      const response = await requestOTP(submittedEmail, selectedTopics);
      setUuid(response.id);
      setEmail(submittedEmail);
      setTopics(selectedTopics);
      setStep("otp");
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el código. Intenta de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (otp: string) => {
    setIsLoading(true);
    setApiError("");
    try {
      await verifyOTP(uuid, otp, email);
      setStep("success");
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Código incorrecto o expirado. Intenta de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setUuid("");
    setApiError("");
  };

  const handleResend = async () => {
    setIsLoading(true);
    setApiError("");
    try {
      const response = await requestOTP(email, topics);
      setUuid(response.id);
      setStep("otp");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AwsHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        {/* Pill-style step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <span
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200",
              step === "email"
                ? "bg-[#FF9900] text-white"
                : step === "success"
                ? "bg-[#10B981] text-white"
                : "text-[#9ca3af]",
            ].join(" ")}
          >
            1. Correo
          </span>
          <span className="text-[#d1d5db] text-sm select-none">→</span>
          <span
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200",
              step === "otp"
                ? "bg-[#FF9900] text-white"
                : step === "success"
                ? "bg-[#10B981] text-white"
                : "text-[#9ca3af]",
            ].join(" ")}
          >
            2. Verificar
          </span>
          <span className="text-[#d1d5db] text-sm select-none">→</span>
          <span
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200",
              step === "success"
                ? "bg-[#10B981] text-white"
                : "text-[#9ca3af]",
            ].join(" ")}
          >
            3. Listo
          </span>
        </div>

        {/* Card */}
        <AuthCard>
          {step === "email" && (
            <EmailStep
              onSubmit={handleEmailSubmit}
              isLoading={isLoading}
              apiError={apiError}
              initialEmail={email}
              initialTopics={topics}
            />
          )}
          {step === "otp" && (
            <OTPStep
              email={email}
              onVerify={handleVerify}
              onBack={handleBack}
              onResend={handleResend}
              isLoading={isLoading}
              apiError={apiError}
              onClearError={() => setApiError("")}
            />
          )}
          {step === "success" && <SuccessStep email={email} topics={topics} />}
        </AuthCard>

        {/* Footer */}
        <p className="mt-6 text-xs text-[#9ca3af] text-center max-w-[380px] leading-relaxed">
          Al continuar, aceptas nuestros{" "}
          <Link href="/terminos-de-uso" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
            Términos de uso
          </Link>{" "}
          y{" "}
          <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
            Política de privacidad
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

