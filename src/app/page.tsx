"use client";

import { useState } from "react";
import { AwsHeader } from "@/components/auth/AwsHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailStep } from "@/components/auth/EmailStep";
import { OTPStep } from "@/components/auth/OTPStep";

const OTP_ENDPOINT = process.env.NEXT_PUBLIC_OTP_ENDPOINT ?? "";  

interface OTPApiBody {
  id: string;
  message: string;
}

async function requestOTP(email: string): Promise<OTPApiBody> {
  const res = await fetch(OTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
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

type Step = "email" | "otp";

export default function Home() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleEmailSubmit = async (submittedEmail: string) => {
    setIsLoading(true);
    setApiError("");
    try {
      await requestOTP(submittedEmail);
      setEmail(submittedEmail);
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
    // TODO: call verify endpoint
    await delay(1400);
    setIsLoading(false);
    console.log("Verified OTP:", otp, "for", email);
  };

  const handleBack = () => {
    setStep("email");
    setApiError("");
  };

  const handleResend = async () => {
    await requestOTP(email);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AwsHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        {/* Pill-style step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <span
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200",
              step === "email"
                ? "bg-[#FF9900] text-white"
                : "text-[#9ca3af]",
            ].join(" ")}
          >
            1. Email
          </span>
          <span className="text-[#d1d5db] text-sm select-none">→</span>
          <span
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200",
              step === "otp"
                ? "bg-[#FF9900] text-white"
                : "text-[#9ca3af]",
            ].join(" ")}
          >
            2. Verify
          </span>
        </div>

        {/* Card */}
        <AuthCard>
          {step === "email" ? (
            <EmailStep
              onSubmit={handleEmailSubmit}
              isLoading={isLoading}
              apiError={apiError}
            />
          ) : (
            <OTPStep
              email={email}
              onVerify={handleVerify}
              onBack={handleBack}
              onResend={handleResend}
              isLoading={isLoading}
            />
          )}
        </AuthCard>

        {/* Footer */}
        <p className="mt-6 text-xs text-[#9ca3af] text-center max-w-[380px] leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      </main>
    </div>
  );
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
