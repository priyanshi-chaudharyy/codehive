/**
 * Single chat message bubble.
 */
const ChatMessage = ({ message, isOwn }) => {
  const { text, userName, type, createdAt } = message;

  // System message (user joined/left)
  if (type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-surface-500 italic">
          {text}
        </span>
      </div>
    );
  }

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} py-0.5`}>
      {/* Name (only for others' messages) */}
      {!isOwn && (
        <span className="text-[10px] font-medium text-surface-500 mb-0.5 px-1">
          {userName}
        </span>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-3 py-1.5 rounded-xl text-sm ${
          isOwn
            ? 'bg-hive-600/40 text-hive-100 rounded-br-sm'
            : 'bg-surface-800/80 text-surface-200 rounded-bl-sm'
        }`}
      >
        {type === 'code' ? (
          <pre className="font-mono text-xs whitespace-pre-wrap">{text}</pre>
        ) : (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-surface-600 mt-0.5 px-1">
        {time}
      </span>
    </div>
  );
};

export default ChatMessage;
