/**
 * CodeHive Honeycomb Logo — SVG Component
 * A geometric bee integrated into a honeycomb grid.
 * Gradient from violet (left) through amber (center) to gold (right).
 */
const Logo = ({ size = 32, withText = false, className = '' }) => {
  const id = `logo-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
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
          <linearGradient id={`${id}-wing`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Left honeycomb cell */}
        <path
          d="M12 28l6-10h12l6 10-6 10H18l-6-10z"
          fill="none"
          stroke={`url(#${id}-main)`}
          strokeWidth="2"
          opacity="0.7"
        />

        {/* Center honeycomb cell */}
        <path
          d="M26 28l6-10h12l6 10-6 10H32l-6-10z"
          fill="none"
          stroke={`url(#${id}-main)`}
          strokeWidth="2"
        />

        {/* Right honeycomb cell */}
        <path
          d="M40 28l6-10h12l6 10-6 10H46l-6-10z"
          fill="none"
          stroke={`url(#${id}-main)`}
          strokeWidth="2"
          opacity="0.7"
        />

        {/* Bottom-left cell */}
        <path
          d="M19 42l6-10h12l6 10-6 10H25l-6-10z"
          fill="none"
          stroke={`url(#${id}-main)`}
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Bottom-right cell */}
        <path
          d="M33 42l6-10h12l6 10-6 10H39l-6-10z"
          fill="none"
          stroke={`url(#${id}-main)`}
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Bee body — center */}
        <ellipse cx="32" cy="20" rx="5" ry="7" fill={`url(#${id}-main)`} opacity="0.9" />

        {/* Bee stripes */}
        <line x1="28" y1="18" x2="36" y2="18" stroke="#050506" strokeWidth="1.2" />
        <line x1="28.5" y1="21" x2="35.5" y2="21" stroke="#050506" strokeWidth="1.2" />

        {/* Bee head */}
        <circle cx="32" cy="12" r="3" fill={`url(#${id}-main)`} />

        {/* Antennae */}
        <line x1="30" y1="10" x2="27" y2="5" stroke={`url(#${id}-wing)`} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="34" y1="10" x2="37" y2="5" stroke={`url(#${id}-wing)`} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="27" cy="4.5" r="1" fill="#818CF8" />
        <circle cx="37" cy="4.5" r="1" fill="#10b981" />

        {/* Left wing */}
        <path
          d="M27 16c-4-2-8-1-10 2 2 4 7 4 10 2z"
          fill={`url(#${id}-wing)`}
          opacity="0.5"
        />

        {/* Right wing */}
        <path
          d="M37 16c4-2 8-1 10 2-2 4-7 4-10 2z"
          fill={`url(#${id}-wing)`}
          opacity="0.5"
        />
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
