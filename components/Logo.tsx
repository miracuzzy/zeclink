export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#f4b728" />
        <path d="M20 18h24v6L28 40h16v6H20v-6l16-16H20z" fill="#0b0b0f" />
      </svg>
      <span>
        Zec<span className="text-zec">Link</span>
      </span>
    </span>
  );
}
