import Link from "next/link";
import { ReactNode } from "react";
import { AwsHeader } from "@/components/auth/AwsHeader";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AwsHeader />

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#374151] mb-8 transition-colors"
          >
            <span className="text-base leading-none">←</span>
            <span>Volver al inicio</span>
          </Link>

          <article className="rounded-xl border border-[#e5e7eb] shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="h-1 w-full bg-[#FF9900]" />
            <div className="bg-white px-6 sm:px-10 py-8 sm:py-10">
              <h1 className="text-2xl font-semibold text-[#111827] mb-2">
                {title}
              </h1>
              <p className="text-xs text-[#9ca3af] mb-8">
                Última actualización: {lastUpdated}
              </p>

              <div className="space-y-6 text-sm text-[#374151] leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#111827] [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#FF9900] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#EC7211]">
                {children}
              </div>
            </div>
          </article>

          <p className="mt-6 text-xs text-[#9ca3af] text-center">
            <Link href="/terminos-de-uso" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
              Términos de uso
            </Link>
            {" · "}
            <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-[#6b7280] transition-colors">
              Política de privacidad
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
