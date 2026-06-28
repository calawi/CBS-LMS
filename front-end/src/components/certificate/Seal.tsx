export function Seal({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bright red outer circle */}
      <circle
        cx="60"
        cy="60"
        r="56"
        stroke="#FF4444"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r="58"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
        className="text-navy/30"
      />
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-navy"
      />
      <circle cx="60" cy="60" r="46" fill="currentColor" className="text-navy/5" />
      <path
        d="M60 22L62.5 28L69 28.5L64 33L65.5 39.5L60 36L54.5 39.5L56 33L51 28.5L57.5 28L60 22Z"
        fill="currentColor"
        className="text-navy"
      />
      <text
        x="60"
        y="68"
        fontFamily="Playfair Display, serif"
        fontSize="28"
        fontWeight="600"
        textAnchor="middle"
        fill="currentColor"
        className="text-navy"
        letterSpacing="2"
      >
        CBS
      </text>
      <path id="curve" d="M 30 75 A 35 35 0 0 0 90 75" fill="transparent" />
      <text
        fontSize="7"
        fill="currentColor"
        className="text-navy/70"
        fontWeight="500"
        letterSpacing="1.5"
      >
        <textPath href="#curve" startOffset="50%" textAnchor="middle">
          AUTHORIZED
        </textPath>
      </text>
    </svg>
  );
}
