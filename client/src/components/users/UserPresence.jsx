import { Users } from 'lucide-react';

/**
 * User presence panel — shows who's online in the room with live status.
 *
 * @param {Array} users - List of user objects from the room
 * @param {string} currentUserId - Current user's ID to mark "(you)"
 * @param {Object} userStatuses - Map of userId → 'typing' | 'idle' | 'active'
 */
const UserPresence = ({ users = [], currentUserId, userStatuses = {} }) => {
  const getStatusIndicator = (userId) => {
    const status = userStatuses[userId];
    if (status === 'typing') {
      return (
        <span className="flex items-center gap-1 text-[10px] text-hive-400 animate-pulse">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-hive-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-hive-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-hive-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          typing
        </span>
      );
    }
    if (status === 'idle') {
      return (
        <span className="text-[10px] text-surface-500">idle</span>
      );
    }
    return null;
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-2">
        <Users size={14} className="text-surface-400" />
        <span className="text-xs font-medium text-surface-400">
          Online ({users.length})
        </span>
      </div>

      <div className="space-y-1">
        {users.map((user) => {
          const status = userStatuses[user.userId];
          return (
            <div
              key={user.socketId || user.userId}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-800/40 transition-colors"
            >
              {/* Colored status dot */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-2 h-2 rounded-full ring-2 ring-surface-900"
                  style={{ backgroundColor: user.color || '#4ECDC4' }}
                />
                {status === 'idle' && (
                  <div className="absolute inset-0 rounded-full bg-surface-700/60" />
                )}
              </div>

              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 transition-opacity ${status === 'idle' ? 'opacity-50' : 'opacity-100'}`}
                style={{ backgroundColor: user.color || '#4ECDC4' }}
              >
                {user.userName?.charAt(0).toUpperCase()}
              </div>

              {/* Name + status */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-surface-300 truncate">
                  {user.userName}
                  {user.userId === currentUserId && (
                    <span className="text-surface-600 ml-1">(you)</span>
                  )}
                </span>
                {getStatusIndicator(user.userId)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserPresence;
