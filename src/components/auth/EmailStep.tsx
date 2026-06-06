"use client";

import { useState, FormEvent } from "react";
import { TOPICS, type Topic } from "@/lib/topics";

interface EmailStepProps {
  onSubmit: (email: string, topics: Topic[]) => void;
  isLoading?: boolean;
  apiError?: string;
  initialEmail?: string;
  initialTopics?: Topic[];
}

export function EmailStep({
  onSubmit,
  isLoading = false,
  apiError,
  initialEmail = "",
  initialTopics = [],
}: EmailStepProps) {
  const [email, setEmail] = useState(initialEmail);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>(initialTopics);
  const [error, setError] = useState("");
  const [topicsError, setTopicsError] = useState("");

  const toggleTopic = (topic: Topic) => {
    setTopicsError("");
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setTopicsError("");

    if (!email.trim()) {
      setError("El correo electrónico es obligatorio.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Introduce un correo válido (p. ej. tu@ejemplo.com).");
      return;
    }

    if (selectedTopics.length === 0) {
      setTopicsError("Selecciona al menos un tema.");
      return;
    }

    onSubmit(email.trim().toLowerCase(), selectedTopics);
  };

  return (
    <div>
      {/* Cloud icon */}
      <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] flex items-center justify-center mb-5">
        <CloudOutlineIcon />
      </div>

      <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#f9fafb] leading-tight mb-2">
        Inicia sesión en Digest Tech News
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
        Elige los temas que te interesan e introduce tu correo para recibir un código de verificación
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-1.5"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="you@example.com"
            className={[
              "w-full h-11 px-3.5 text-sm text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af]",
              "bg-white dark:bg-[#0f1923] rounded-lg border outline-none transition-colors",
              "focus:ring-2 focus:ring-[#FF9900]/25 focus:border-[#FF9900]",
              error
                ? "border-red-400 bg-red-50/40 dark:bg-red-950/30"
                : "border-[#e5e7eb] dark:border-[#374151] hover:border-[#d1d5db] dark:hover:border-[#4b5563]",
            ].join(" ")}
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <ErrorDotIcon />
              {error}
            </p>
          )}
        </div>

        <div className="mb-5">
          <p className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
            Temas de interés
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={[
                    "text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-[#FF9900] text-white"
                      : "bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#e5e7eb] dark:hover:bg-[#4b5563] hover:text-[#374151] dark:hover:text-[#f9fafb]",
                    topicsError && !isSelected ? "ring-1 ring-red-300" : "",
                  ].join(" ")}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {topic}
                </button>
              );
            })}
          </div>
          {topicsError && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <ErrorDotIcon />
              {topicsError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={[
            "w-full h-11 rounded-lg text-sm font-semibold",
            "flex items-center justify-center gap-2 transition-colors",
            isLoading
              ? "bg-[#FFD08A] text-white cursor-not-allowed"
              : "bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D08B00] text-white cursor-pointer",
          ].join(" ")}
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              Enviando código…
            </>
          ) : (
            "Continuar →"
          )}
        </button>

        {/* API-level error (network / server) */}
        {apiError && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z" />
            </svg>
            <p className="text-xs text-red-600 leading-relaxed">{apiError}</p>
          </div>
        )}
      </form>
    </div>
  );
}

function CloudOutlineIcon() {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      stroke="#FF9900"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.5 6a4 4 0 00-7.7-1.5A3 3 0 104.5 10.5h11a2.5 2.5 0 000-5h-.5l.5.5z" />
    </svg>
  );
}

function ErrorDotIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="#ef4444">
      <circle cx="6" cy="6" r="5" />
      <path d="M6 3.5v3M6 8.5v.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
