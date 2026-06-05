export function AwsHeader() {
  return (
    <header className="w-full bg-transparent">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
        <div className="flex items-center justify-between w-full gap-2.5">
          {/* AWS badge — square orange pill */}
          <div className="flex items-center gap-2.5">
          
          <span className="text-[#0f1923] text-sm font-medium tracking-[-0.01em]">
            Daily Tech News
          </span>

          </div>
   

          <div className="flex items-center gap-2.5">
            <span>github</span>
            <span>linkedin</span>
            <span>Cambiar tema</span>
          </div>
        </div>
      </div>
    </header>
  );
}
