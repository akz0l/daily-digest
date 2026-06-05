import { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[440px] rounded-xl border border-[#e5e7eb] shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      {/* Orange accent line */}
      <div className="h-1 w-full bg-[#FF9900]" />
      <div className="bg-white px-8 py-8">
        {children}
      </div>
    </div>
  );
}
