"use client";

import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  ClipboardEvent,
} from "react";

const LEN = 6;
const RESEND_SECONDS = 30;

interface OTPStepProps {
  email: string;
  onVerify: (otp: string) => void;
  onBack: () => void;
  onResend: () => Promise<void>;
  isLoading?: boolean;
}

export function OTPStep({
  email,
  onVerify,
  onBack,
  onResend,
  isLoading = false,
}: OTPStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otp = digits.join("");
  const isFilled = otp.length === LEN;

  const startCountdown = (seconds = RESEND_SECONDS) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    setCanResend(false);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCountdown();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = () => {
    if (error) setError("");
  };

  const handleChange = (index: number, value: string) => {
    clearError();
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < LEN - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LEN - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    clearError();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!raw) return;
    const next = Array(LEN).fill("");
    for (let i = 0; i < raw.length; i++) next[i] = raw[i];
    setDigits(next);
    inputRefs.current[Math.min(raw.length, LEN - 1)]?.focus();
  };

  const triggerShake = () => {
    setIsShaking(false);
    // Force reflow so the animation restarts
    requestAnimationFrame(() => setIsShaking(true));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFilled || isLoading) return;

    // Demo: entering "000000" simulates a wrong-code error
    if (otp === "000000") {
      setError("Incorrect code. Please try again.");
      triggerShake();
      setDigits(Array(LEN).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 20);
      return;
    }

    onVerify(otp);
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    await onResend();
    setIsResending(false);
    setDigits(Array(LEN).fill(""));
    setError("");
    startCountdown();
    setTimeout(() => inputRefs.current[0]?.focus(), 20);
  };

  return (
    <div>
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#374151] mb-6 cursor-pointer transition-colors -ml-0.5"
      >
        <span className="text-base leading-none">←</span>
        <span>Back</span>
      </button>

      <h1 className="text-[22px] font-semibold text-[#111827] leading-tight mb-2">
        Check your inbox
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-7">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-[#374151]">{email}</span>
        . It expires in 10&nbsp;minutes.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* OTP digit boxes */}
        <div
          className={`flex gap-2 justify-center ${isShaking ? "animate-shake" : ""}`}
          onAnimationEnd={() => setIsShaking(false)}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus={i === 0}
              maxLength={2}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={[
                "w-12 h-14 text-center text-[22px] font-semibold rounded-lg outline-none",
                "border-[1.5px] bg-white text-[#111827] transition-colors",
                "focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20",
                error
                  ? "border-red-400 bg-red-50/50"
                  : digit
                  ? "border-[#FF9900]/50 bg-[#FFFCF5]"
                  : "border-[#e5e7eb] hover:border-[#d1d5db]",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2.5 text-xs text-red-500 text-center">
            {error}
          </p>
        )}

        {/* Resend */}
        <div className="flex justify-end mt-3 mb-5">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-[13px] text-[#FF9900] hover:text-[#EC7211] font-medium cursor-pointer transition-colors disabled:opacity-60"
            >
              {isResending ? "Sending…" : "Resend code"}
            </button>
          ) : (
            <span className="text-[13px] text-[#9ca3af] tabular-nums">
              Resend in {countdown}s
            </span>
          )}
        </div>

        {/* Verify button */}
        <button
          type="submit"
          disabled={!isFilled || isLoading}
          className={[
            "w-full h-11 rounded-lg text-sm font-semibold",
            "flex items-center justify-center gap-2 transition-colors",
            !isFilled || isLoading
              ? "bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed"
              : "bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D08B00] text-white cursor-pointer",
          ].join(" ")}
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              Verifying…
            </>
          ) : (
            "Verify →"
          )}
        </button>
      </form>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
