/**
 * CodeHive Honeycomb Logo — SVG Component
 * Exact match for Concept 5: Geometric bee integrated into a 5-hexagon honeycomb grid.
 * Gradient from violet (left) through amber (center) to gold (right).
 */
const Logo = ({ size = 32, withText = false, className = '' }) => {
  const id = `logo-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={`${id}-main`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8052ff" />
            <stop offset="40%" stopColor="#C084FC" />
            <stop offset="70%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FFD54F" />
          </linearGradient>
        </defs>

        {/* The Honeycomb grid - 3 open tops (Left, Center, Right), 2 closed (Bottom-Left, Bottom-Right) */}
        <path
          d="M 60.39,61.00 L 60.39,49.00 M 50.00,67.00 L 60.39,61.00 M 39.61,61.00 L 50.00,67.00 M 39.61,49.00 L 39.61,61.00 M 29.22,67.00 L 39.61,61.00 M 29.22,67.00 L 18.82,61.00 M 18.82,61.00 L 18.82,49.00 M 81.18,49.00 L 81.18,61.00 M 81.18,61.00 L 70.78,67.00 M 60.39,61.00 L 70.78,67.00 M 50.00,79.00 L 50.00,67.00 M 50.00,79.00 L 39.61,85.00 M 39.61,85.00 L 29.22,79.00 M 29.22,79.00 L 29.22,67.00 M 70.78,67.00 L 70.78,79.00 M 70.78,79.00 L 60.39,85.00 M 60.39,85.00 L 50.00,79.00"
          stroke={`url(#${id}-main)`}
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bee body (shield shape integrated exactly into the Center open comb) */}
        <path d="M 42 38 C 42 25, 58 25, 58 38 C 58 52, 50 61, 50 61 C 50 61, 42 52, 42 38 Z" fill={`url(#${id}-main)`} />

        {/* Bee head */}
        <circle cx="50" cy="22" r="5" fill={`url(#${id}-main)`} />

        {/* Bee wings (integrated into the Left and Right open combs) */}
        <path d="M 40 38 C 25 25, 10 35, 15 50 C 25 50, 35 45, 40 38 Z" fill={`url(#${id}-main)`} opacity="0.9" />
        <path d="M 60 38 C 75 25, 90 35, 85 50 C 75 50, 65 45, 60 38 Z" fill={`url(#${id}-main)`} opacity="0.9" />

        {/* Antennae */}
        <path d="M 46 18 Q 40 10 37 12 M 54 18 Q 60 10 63 12" stroke={`url(#${id}-main)`} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        
        {/* Stripes on body to make it look like a bee (transparent cutouts) */}
        <line x1="41" y1="36" x2="59" y2="36" stroke="#050506" strokeWidth="2.5" />
        <line x1="42.5" y1="42" x2="57.5" y2="42" stroke="#050506" strokeWidth="2.5" />
        <line x1="45" y1="48" x2="55" y2="48" stroke="#050506" strokeWidth="2.5" />
      </svg>

      {withText && (
        <span className="text-xl font-bold tracking-tight">
          <span className="text-gradient">Code</span>
          <span className="text-white">Hive</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
