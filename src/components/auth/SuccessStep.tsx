"use client";

import type { Topic } from "@/lib/topics";

interface SuccessStepProps {
  email: string;
  topics: Topic[];
}

export function SuccessStep({ email, topics }: SuccessStepProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
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
        ¡Todo listo!
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-1">
        Tu cuenta está configurada correctamente.
      </p>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-3">
        Recibirás tu resumen diario en{" "}
        <span className="font-medium text-[#374151] dark:text-[#d1d5db]">{email}</span>.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-7">
        {topics.map((topic) => (
          <span
            key={topic}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#059669]"
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-[#FFF8F0] border border-[#FF9900]/20 text-left">
        <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#FF9900"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2v4l2.5 2.5" />
            <circle cx="8" cy="8" r="6" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-0.5">
            Próximo resumen
          </p>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Te enviaremos las noticias de tecnología en la nube cada mañana a tu correo.
          </p>
        </div>
      </div>
    </div>
  );
}
