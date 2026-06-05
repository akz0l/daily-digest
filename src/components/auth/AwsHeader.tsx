export function AwsHeader() {
  return (
    <header className="w-full bg-transparent">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
        <div className="flex items-center justify-between w-full gap-2.5">
          {/* AWS badge — square orange pill */}
          <div className="flex items-center gap-2.5">
          <span className="bg-[#FF9900] text-[#0f1923] text-[11px] font-black px-2 py-[3px] rounded-md leading-none tracking-wider select-none">
            AWS
          </span>
          <span className="text-[#0f1923] text-sm font-medium tracking-[-0.01em]">
            Cloud Tech News
          </span>

          </div>
   

          <div className="flex items-center gap-2.5">
            <span>github</span>
            <span>linkedin</span>
            <span>theme toggle</span>
          </div>
        </div>
      </div>
    </header>
  );
}
