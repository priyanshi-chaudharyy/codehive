import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import VideoTile from './VideoTile';

/**
 * Video panel — displays video call grid with controls.
 */
const VideoPanel = ({
  myStream,
  peers,
  isInCall,
  isAudioOn,
  isVideoOn,
  onStartCall,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  userName,
}) => {
  if (!isInCall) {
    return (
      <div className="flex items-center justify-center p-4 bg-surface-900/50 border-b border-surface-800/50">
        <button
          id="btn-start-call"
          onClick={onStartCall}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                     bg-hive-600 hover:bg-hive-500 text-white transition-all duration-200"
        >
          <Phone size={16} />
          Start Video Call
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-900/50 border-b border-surface-800/50">
      {/* Video Grid */}
      <div className="flex gap-2 p-2 overflow-x-auto">
        {/* My video */}
        <VideoTile
          stream={myStream}
          userName={userName + ' (You)'}
          isMuted={true} // Mute own audio to prevent echo
          isVideoOff={!isVideoOn}
        />

        {/* Peer videos */}
        {Object.entries(peers).map(([peerId, peer]) => (
          <VideoTile
            key={peerId}
            stream={peer.stream}
            userName={peer.userName}
            isMuted={false}
            isVideoOff={!peer.isVideoOn}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-surface-800/30">
        <button
          id="btn-toggle-audio"
          onClick={onToggleAudio}
          className={`p-2 rounded-full transition-all duration-200 ${
            isAudioOn
              ? 'bg-surface-700 hover:bg-surface-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          }`}
          title={isAudioOn ? 'Mute' : 'Unmute'}
        >
          {isAudioOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        <button
          id="btn-toggle-video"
          onClick={onToggleVideo}
          className={`p-2 rounded-full transition-all duration-200 ${
            isVideoOn
              ? 'bg-surface-700 hover:bg-surface-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          }`}
          title={isVideoOn ? 'Hide Video' : 'Show Video'}
        >
          {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        <button
          id="btn-end-call"
          onClick={onEndCall}
          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-200"
          title="End Call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
};

export default VideoPanel;
