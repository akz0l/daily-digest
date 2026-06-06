import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AwsHeader } from "@/components/auth/AwsHeader";
import { UnsubscribeContent } from "@/components/unsubscribe/UnsubscribeContent";

export const metadata: Metadata = {
  title: "Cancelar suscripción — Daily Tech News",
  description:
    "Cancela tu suscripción al resumen diario de noticias tecnológicas de Daily Tech News.",
};

function UnsubscribeFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AwsHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        <AuthCard>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#FFF3E0] flex items-center justify-center mx-auto mb-6">
              <svg
                className="animate-spin w-8 h-8 text-[#FF9900]"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </div>
            <p className="text-sm text-[#6b7280]">Cargando…</p>
          </div>
        </AuthCard>
      </main>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeFallback />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
