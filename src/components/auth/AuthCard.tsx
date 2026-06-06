import { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[440px] rounded-xl border border-[#e5e7eb] dark:border-[#374151] shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Orange accent line */}
      <div className="h-1 w-full bg-[#FF9900]" />
      <div className="bg-white dark:bg-[#1a2332] px-8 py-8">
        {children}
      </div>
    </div>
  );
}
