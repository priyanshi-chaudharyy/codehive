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

        {/* The 5 Honeycomb cells */}
        <path
          d="M 50,50 L 58.66,55 L 58.66,65 L 50,70 L 41.34,65 L 41.34,55 Z M 32.68,50 L 41.34,55 L 41.34,65 L 32.68,70 L 24.02,65 L 24.02,55 Z M 67.32,50 L 75.98,55 L 75.98,65 L 67.32,70 L 58.66,65 L 58.66,55 Z M 41.34,65 L 50,70 L 50,80 L 41.34,85 L 32.68,80 L 32.68,70 Z M 58.66,65 L 67.32,70 L 67.32,80 L 58.66,85 L 50,80 L 50,70 Z"
          stroke={`url(#${id}-main)`}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Bee body & head */}
        <ellipse cx="50" cy="35" rx="7" ry="12" fill={`url(#${id}-main)`} />
        <circle cx="50" cy="20" r="4.5" fill={`url(#${id}-main)`} />

        {/* Bee wings */}
        <path d="M 45 35 C 30 25, 18 28, 22 45 C 25 50, 40 45, 45 35 Z" fill={`url(#${id}-main)`} opacity="0.8" />
        <path d="M 55 35 C 70 25, 82 28, 78 45 C 75 50, 60 45, 55 35 Z" fill={`url(#${id}-main)`} opacity="0.8" />

        {/* Antennae */}
        <path d="M 47 17 Q 40 10 38 12 M 53 17 Q 60 10 62 12" stroke={`url(#${id}-main)`} strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Stripes on body to make it look like a bee */}
        <line x1="44" y1="32" x2="56" y2="32" stroke="#050506" strokeWidth="2" />
        <line x1="43.5" y1="36" x2="56.5" y2="36" stroke="#050506" strokeWidth="2" />
        <line x1="44.5" y1="40" x2="55.5" y2="40" stroke="#050506" strokeWidth="2" />
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
