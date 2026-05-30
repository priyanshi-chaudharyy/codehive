const Loader = ({ size = 'lg', text = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full border-surface-700 border-t-hive-500 animate-spin`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs">🐝</span>
        </div>
      </div>
      {text && (
        <p className="text-sm text-surface-400 animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default Loader;
