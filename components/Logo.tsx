/** Header logo: the Interlock mark (small, pixel-tuned, for dark backgrounds) next to the wordmark. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-heading inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/zeclink-mark.svg" alt="" width={28} height={28} className="h-7 w-7" />
      <span>
        Zec<span className="text-zec">Link</span>
      </span>
    </span>
  );
}
