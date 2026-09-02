export function Signature({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 45C15 35 20 20 25 15C30 10 35 25 40 35C45 45 50 40 55 30C60 20 65 15 70 25C75 35 80 45 85 40C90 35 95 25 100 20C105 15 110 30 115 40C120 50 125 45 130 35C135 25 140 20 145 30C150 40 155 45 160 40C165 35 170 25 175 20C180 15 185 30 190 35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-800"
      />
    </svg>
  );
}
