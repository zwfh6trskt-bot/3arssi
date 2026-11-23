// Landing line-art: two overlapping arches (one for each side, neither
// gendered) beneath a small eight-point star. Static — no animation.
export function ArchesIllustration({ size = 180 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 200 156" fill="none" aria-hidden="true">
      <path d="M38 150V78a34 34 0 0 1 68 0v72" fill="#DCEAF1" />
      <path d="M94 150V78a34 34 0 0 1 68 0v72" fill="#E2EDE3" />
      <path d="M94 150V82a28.5 28.5 0 0 1 12-23.3A34 34 0 0 1 106 78v72Z" fill="#D6E3E6" />
      <g stroke="#4C4843" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 150V78a34 34 0 0 1 68 0v72" />
        <path d="M94 150V78a34 34 0 0 1 68 0v72" />
        <path d="M50 150V82a22 22 0 0 1 44 0v68" opacity=".35" />
        <path d="M106 150V82a22 22 0 0 1 44 0v68" opacity=".35" />
        <path d="M24 150h152" />
        <path d="M100 14l3.2 7.8L111 25l-7.8 3.2L100 36l-3.2-7.8L89 25l7.8-3.2L100 14Z" />
        <path d="M100 18.5v13M93.5 25h13" opacity=".45" />
      </g>
      <circle cx="100" cy="25" r="17" stroke="#F3E2E5" strokeWidth="1.2" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div>
      <div className="wordmark" aria-label="3ARSSI">3ARSSI</div>
      <div className="wordmark-ar" lang="ar">عرسي</div>
    </div>
  );
}
