import { Users, Lock, Trash2, LogOut, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const LANG_COLORS = {
  javascript: 'bg-yellow-500/20 text-yellow-300',
  typescript: 'bg-blue-500/20 text-blue-300',
  python: 'bg-green-500/20 text-green-300',
  java: 'bg-orange-500/20 text-orange-300',
  cpp: 'bg-cyan-500/20 text-cyan-300',
  c: 'bg-slate-500/20 text-slate-300',
  csharp: 'bg-violet-500/20 text-violet-300',
  go: 'bg-sky-500/20 text-sky-300',
  rust: 'bg-orange-600/20 text-orange-300',
  ruby: 'bg-red-500/20 text-red-300',
  php: 'bg-indigo-500/20 text-indigo-300',
  swift: 'bg-orange-500/20 text-orange-300',
  kotlin: 'bg-purple-500/20 text-purple-300',
};

/**
 * Card component to display a room on the dashboard.
 */
const RoomCard = ({ room, currentUserId, onClick, onDelete, onLeave }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const ownerId = typeof room.owner === 'object' ? room.owner._id : room.owner;
  const isOwner = currentUserId === ownerId;
  const langColor = LANG_COLORS[room.language] || 'bg-surface-700 text-surface-300';

  const handleAction = (e) => {
    e.stopPropagation();
    if (showConfirm) {
      if (isOwner && onDelete) onDelete(room.roomId);
      else if (!isOwner && onLeave) onLeave(room.roomId);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div 
      className="group relative rounded-xl border border-surface-800/60 bg-surface-900/40 hover:bg-surface-800/40 hover:border-surface-700/60 p-5 flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/20 overflow-hidden" 
      onClick={onClick}
    >
      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-hive-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />

      {/* Delete/Leave Action */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleAction}
          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors
            ${showConfirm 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
              : 'bg-surface-800/80 text-surface-400 hover:text-red-400 hover:bg-surface-700'
            }`}
          title={isOwner ? "Delete Room" : "Leave Room"}
        >
          {isOwner ? <Trash2 size={13} /> : <LogOut size={13} />}
          {showConfirm && <span>Confirm</span>}
        </button>
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="pr-10">
            <h3 className="font-semibold text-base text-white mb-1 truncate group-hover:text-hive-300 transition-colors" title={room.name}>
              {room.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-surface-500 font-mono">
              <span>ID: {room.roomId}</span>
              {!room.isPublic && <Lock size={11} className="text-honey-400" />}
            </div>
          </div>
          <span className={`badge ${langColor} capitalize shrink-0 text-[11px] font-medium`}>
            {room.language}
          </span>
        </div>
        
        <div className="mt-auto pt-4 border-t border-surface-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-surface-400">
            <Users size={13} />
            <span className="text-xs">{room.participants?.length || 0} members</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-surface-600">
              {new Date(room.updatedAt).toLocaleDateString()}
            </span>
            <ArrowRight size={14} className="text-surface-600 group-hover:text-hive-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
