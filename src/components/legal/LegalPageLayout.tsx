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
    <div className="min-h-screen flex flex-col bg-background">
      <AwsHeader />

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#FF9900] mb-8 transition-colors"
          >
            <span className="text-base leading-none">←</span>
            <span>Volver al inicio</span>
          </Link>

          <article className="rounded-xl border border-[#e5e7eb] dark:border-[#374151] shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="h-1 w-full bg-[#FF9900]" />
            <div className="bg-white dark:bg-[#1a2332] px-6 sm:px-10 py-8 sm:py-10">
              <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#f9fafb] mb-2">
                {title}
              </h1>
              <p className="text-xs text-[#9ca3af] mb-8">
                Última actualización: {lastUpdated}
              </p>

              <div className="space-y-6 text-sm text-[#374151] dark:text-[#d1d5db] leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#111827] dark:[&_h2]:text-[#f9fafb] [&_h2]:mt-2 [&_strong]:text-[#111827] dark:[&_strong]:text-[#f9fafb] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#FF9900] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#EC7211]">
                {children}
              </div>
            </div>
          </article>

          <p className="mt-6 text-xs text-[#9ca3af] text-center">
            <Link href="/terminos-de-uso" className="underline underline-offset-2 hover:text-[#FF9900] transition-colors">
              Términos de uso
            </Link>
            {" · "}
            <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-[#FF9900] transition-colors">
              Política de privacidad
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
