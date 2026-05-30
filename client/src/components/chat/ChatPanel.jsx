import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import ChatMessage from './ChatMessage';

/**
 * Chat panel — sidebar for room messaging.
 */
const ChatPanel = ({ messages, onSendMessage, currentUserId, isVisible, onClose }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSendMessage(text.trim());
    setText('');
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-surface-900/60 w-full animate-slide-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-hive-400" />
          <h3 className="text-sm font-semibold text-surface-200">Chat</h3>
          {messages.length > 0 && (
            <span className="badge bg-surface-700 text-surface-400 text-[10px]">
              {messages.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-surface-500 hover:text-surface-300">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-surface-600 text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={msg._id || index}
              message={msg}
              isOwn={msg.userId === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-surface-800/50">
        <div className="flex items-center gap-2">
          <input
            id="chat-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-lg bg-surface-800/80 border border-surface-700 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-hive-500 transition-colors"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2 rounded-lg bg-hive-600 hover:bg-hive-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-200"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
