import { useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';

/**
 * Hook for managing Socket.io room connection and events.
 *
 * @param {string} roomId - The room to join
 * @param {Object} handlers - Event handler callbacks
 * @returns {{ emit, isConnected }}
 */
const useSocket = (roomId, handlers = {}) => {
  const { socket, isConnected } = useSocketContext();
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    const eventMap = {
      'room-state': handlersRef.current.onRoomState,
      'user-joined': handlersRef.current.onUserJoined,
      'user-left': handlersRef.current.onUserLeft,
      'code-update': handlersRef.current.onCodeUpdate,
      'code-ack': handlersRef.current.onCodeAck,
      'code-full-sync': handlersRef.current.onCodeFullSync,
      'cursor-update': handlersRef.current.onCursorUpdate,
      'language-updated': handlersRef.current.onLanguageUpdated,
      'new-message': handlersRef.current.onNewMessage,
      'message-history': handlersRef.current.onMessageHistory,
      'execution-start': handlersRef.current.onExecutionStart,
      'execution-result': handlersRef.current.onExecutionResult,
      'execution-error': handlersRef.current.onExecutionError,
      'video-offer': handlersRef.current.onVideoOffer,
      'video-answer': handlersRef.current.onVideoAnswer,
      'ice-candidate': handlersRef.current.onIceCandidate,
      'user-toggled-video': handlersRef.current.onUserToggledVideo,
      'user-toggled-audio': handlersRef.current.onUserToggledAudio,
      'user-typing': handlersRef.current.onUserTyping,
      'user-stop-typing': handlersRef.current.onUserStopTyping,
      'user-status-change': handlersRef.current.onUserStatusChange,
      'file-created': handlersRef.current.onFileCreated,
      'file-deleted': handlersRef.current.onFileDeleted,
      'file-renamed': handlersRef.current.onFileRenamed,
      'file-moved': handlersRef.current.onFileMoved,
      'user-active-file-changed': handlersRef.current.onUserActiveFileChanged,
      'terminal-output': handlersRef.current.onTerminalOutput,
      'terminal-closed': handlersRef.current.onTerminalClosed,
      'error': handlersRef.current.onError,
    };

    // Register all handlers
    Object.entries(eventMap).forEach(([event, handler]) => {
      if (handler) {
        socket.on(event, (...args) => handlersRef.current[
          Object.keys(handlersRef.current).find(
            (key) => handlersRef.current[key] === eventMap[event]
          ) || ''
        ]?.(...args));
      }
    });

    // Simplified: register each handler directly
    const cleanups = [];
    Object.entries(eventMap).forEach(([event, handler]) => {
      if (handler) {
        const wrappedHandler = (...args) => {
          const currentHandlers = handlersRef.current;
          const handlerKey = Object.entries({
            'room-state': 'onRoomState',
            'user-joined': 'onUserJoined',
            'user-left': 'onUserLeft',
            'code-update': 'onCodeUpdate',
            'code-ack': 'onCodeAck',
            'code-full-sync': 'onCodeFullSync',
            'cursor-update': 'onCursorUpdate',
            'language-updated': 'onLanguageUpdated',
            'new-message': 'onNewMessage',
            'message-history': 'onMessageHistory',
            'execution-start': 'onExecutionStart',
            'execution-result': 'onExecutionResult',
            'execution-error': 'onExecutionError',
            'video-offer': 'onVideoOffer',
            'video-answer': 'onVideoAnswer',
            'ice-candidate': 'onIceCandidate',
            'user-toggled-video': 'onUserToggledVideo',
            'user-toggled-audio': 'onUserToggledAudio',
            'user-typing': 'onUserTyping',
            'user-stop-typing': 'onUserStopTyping',
            'user-status-change': 'onUserStatusChange',
            'file-created': 'onFileCreated',
            'file-deleted': 'onFileDeleted',
            'file-renamed': 'onFileRenamed',
            'file-moved': 'onFileMoved',
            'user-active-file-changed': 'onUserActiveFileChanged',
            'terminal-output': 'onTerminalOutput',
            'terminal-closed': 'onTerminalClosed',
            'error': 'onError',
          }).find(([e]) => e === event)?.[1];

          if (handlerKey && currentHandlers[handlerKey]) {
            currentHandlers[handlerKey](...args);
          }
        };
        socket.on(event, wrappedHandler);
        cleanups.push(() => socket.off(event, wrappedHandler));
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [socket, roomId]);

  /**
   * Emit a socket event.
   */
  const emit = useCallback(
    (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, { roomId, ...data });
      }
    },
    [socket, isConnected, roomId]
  );

  return { emit, isConnected };
};

export default useSocket;
