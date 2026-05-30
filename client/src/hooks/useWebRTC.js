import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import { useSocketContext } from '../context/SocketContext';
import showToast from '../components/shared/Toast';

/**
 * Hook for managing WebRTC peer connections for video/audio calls.
 *
 * @param {string} roomId - Current room ID
 * @param {string} userId - Current user's ID
 * @returns {{ myStream, peers, startCall, endCall, toggleAudio, toggleVideo, isInCall, isAudioOn, isVideoOn }}
 */
const useWebRTC = (roomId, userId) => {
  const { socket, isConnected } = useSocketContext();
  const [peers, setPeers] = useState({}); // { socketId: { peer, stream, userName, isAudioOn, isVideoOn } }
  const [myStream, setMyStream] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const peersRef = useRef({});
  const myStreamRef = useRef(null);

  /**
   * Helper to create a new peer
   */
  const createPeer = useCallback((userToSignal, callerId, stream, initiator) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('webrtc-signal', {
        to: userToSignal,
        signal,
      });
    });

    return peer;
  }, [socket]);

  /**
   * Start a video/audio call — get user media and notify peers.
   */
  const startCall = useCallback(async (userName) => {
    if (!socket || !isConnected) {
      showToast.error('Not connected to server');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      myStreamRef.current = stream;
      setMyStream(stream);
      setIsInCall(true);
      setIsAudioOn(true);
      setIsVideoOn(true);

      socket.emit('join-call', { roomId, userId, userName });
      console.log('📹 Call started');
    } catch (error) {
      console.error('Failed to get media devices:', error);
      showToast.error('Could not access camera/microphone');
    }
  }, [socket, isConnected, roomId, userId]);

  /**
   * End the call — close all peer connections and stop media tracks.
   */
  const endCall = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((track) => track.stop());
      myStreamRef.current = null;
      setMyStream(null);
    }

    Object.values(peersRef.current).forEach(({ peer }) => {
      if (peer) peer.destroy();
    });
    
    peersRef.current = {};
    setPeers({});
    setIsInCall(false);

    if (socket && isConnected) {
      socket.emit('leave-call', { roomId, userId });
    }

    console.log('📹 Call ended');
  }, [socket, isConnected, roomId, userId]);

  /**
   * Toggle audio on/off.
   */
  const toggleAudio = useCallback(() => {
    if (myStreamRef.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);

        socket?.emit('toggle-audio', {
          roomId,
          userId,
          isOn: audioTrack.enabled,
        });
      }
    }
  }, [socket, roomId, userId]);

  /**
   * Toggle video on/off.
   */
  const toggleVideo = useCallback(() => {
    if (myStreamRef.current) {
      const videoTrack = myStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);

        socket?.emit('toggle-video', {
          roomId,
          userId,
          isOn: videoTrack.enabled,
        });
      }
    }
  }, [socket, roomId, userId]);

  // Setup WebRTC socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserJoinedCall = ({ userId: remoteUserId, userName, socketId }) => {
      if (!isInCall || !myStreamRef.current) return; // Ignore if we aren't in the call

      // As the existing participant, we initiate the connection to the new user
      const peer = createPeer(socketId, socket.id, myStreamRef.current, true);

      peer.on('stream', (stream) => {
        setPeers((prev) => ({
          ...prev,
          [socketId]: { ...prev[socketId], stream },
        }));
      });

      peersRef.current[socketId] = { peer, stream: null, userName, isAudioOn: true, isVideoOn: true };
      
      setPeers((prev) => ({
        ...prev,
        [socketId]: peersRef.current[socketId],
      }));
    };

    const handleWebRTCSignal = ({ signal, from }) => {
      if (!isInCall || !myStreamRef.current) return;

      let peerObj = peersRef.current[from];

      if (!peerObj) {
        // We are receiving a signal from a new peer (we are not the initiator)
        const peer = createPeer(from, socket.id, myStreamRef.current, false);

        peer.on('stream', (stream) => {
          setPeers((prev) => ({
            ...prev,
            [from]: { ...prev[from], stream },
          }));
        });

        // We might not know their username yet, so we just use 'Remote User'
        // In a full implementation, we'd look it up from the room state
        peerObj = { peer, stream: null, userName: 'Remote User', isAudioOn: true, isVideoOn: true };
        peersRef.current[from] = peerObj;
        
        setPeers((prev) => ({
          ...prev,
          [from]: peerObj,
        }));
      }

      peerObj.peer.signal(signal);
    };

    const handleUserLeftCall = ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].peer.destroy();
        delete peersRef.current[socketId];
        
        setPeers((prev) => {
          const newPeers = { ...prev };
          delete newPeers[socketId];
          return newPeers;
        });
      }
    };

    const handleUserToggledVideo = ({ socketId, isOn }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].isVideoOn = isOn;
        setPeers((prev) => ({
          ...prev,
          [socketId]: { ...prev[socketId], isVideoOn: isOn },
        }));
      }
    };

    const handleUserToggledAudio = ({ socketId, isOn }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].isAudioOn = isOn;
        setPeers((prev) => ({
          ...prev,
          [socketId]: { ...prev[socketId], isAudioOn: isOn },
        }));
      }
    };

    // User left the entire room (not just the call)
    const handleUserLeftRoom = ({ socketId }) => {
      handleUserLeftCall({ socketId });
    };

    socket.on('user-joined-call', handleUserJoinedCall);
    socket.on('webrtc-signal', handleWebRTCSignal);
    socket.on('user-left-call', handleUserLeftCall);
    socket.on('user-left', handleUserLeftRoom);
    socket.on('user-toggled-video', handleUserToggledVideo);
    socket.on('user-toggled-audio', handleUserToggledAudio);

    return () => {
      socket.off('user-joined-call', handleUserJoinedCall);
      socket.off('webrtc-signal', handleWebRTCSignal);
      socket.off('user-left-call', handleUserLeftCall);
      socket.off('user-left', handleUserLeftRoom);
      socket.off('user-toggled-video', handleUserToggledVideo);
      socket.off('user-toggled-audio', handleUserToggledAudio);
    };
  }, [socket, isConnected, isInCall, createPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInCall) {
        endCall();
      }
    };
  }, [endCall, isInCall]);

  return {
    myStream,
    peers,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    isInCall,
    isAudioOn,
    isVideoOn,
  };
};

export default useWebRTC;
