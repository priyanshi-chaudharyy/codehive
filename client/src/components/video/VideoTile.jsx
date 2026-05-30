import { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';

/**
 * Single video tile for a participant.
 */
const VideoTile = ({ stream, userName, isMuted, isVideoOff }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream && !isVideoOff) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOff]);

  return (
    <div className="relative flex-shrink-0 w-40 h-28 rounded-lg overflow-hidden bg-surface-800 border border-surface-700/50">
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-800">
          <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
            <VideoOff size={16} className="text-surface-500" />
          </div>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
        <span className="text-[10px] font-medium text-white truncate block">
          {userName}
        </span>
      </div>
    </div>
  );
};

export default VideoTile;
