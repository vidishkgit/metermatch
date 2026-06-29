// Signature brand mark: a flow-meter gauge with a detected "leak" point.
export function MeterMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mm-g" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#6366F1" />
          <stop offset="0.6" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#mm-g)" strokeWidth="2.5" opacity="0.9" />
      {/* gauge needle */}
      <path d="M20 20 L29 13" stroke="url(#mm-g)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.6" fill="#fff" />
      {/* tick marks */}
      <path d="M20 5 V8 M35 20 H32 M20 35 V32 M5 20 H8" stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      {/* leak droplet */}
      <circle cx="11" cy="29" r="2.2" fill="#2DD4BF" />
    </svg>
  );
}
