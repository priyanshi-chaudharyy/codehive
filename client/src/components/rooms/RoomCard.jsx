import { Users, Lock, Trash2, LogOut, ArrowRight, Star } from 'lucide-react';
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
const RoomCard = ({ room, currentUserId, onClick, onDelete, onLeave, onToggleStar }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const ownerId = typeof room.owner === 'object' ? room.owner._id : room.owner;
  const isOwner = currentUserId === ownerId;
  const langColor = LANG_COLORS[room.language] || 'bg-surface-700 text-surface-300';
  const onlineCount = room.onlineCount || 0;

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

  const handleStar = (e) => {
    e.stopPropagation();
    if (onToggleStar) onToggleStar(room.roomId);
  };

  return (
    <div 
      className="group relative rounded-2xl border border-surface-800 bg-surface-900/40 hover:bg-surface-800 p-5 flex flex-col cursor-pointer transition-colors duration-300 h-full" 
      onClick={onClick}
    >
      {/* Top right actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleStar}
          className="p-1.5 rounded-lg flex items-center justify-center transition-colors bg-surface-950/50 hover:bg-surface-700 text-surface-400 hover:text-honey-400"
          title={room.isStarred ? "Unstar Room" : "Star Room"}
        >
          <Star size={14} className={room.isStarred ? "fill-honey-400 text-honey-400" : ""} />
        </button>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-lg text-white mb-2 pr-12 group-hover:text-hive-400 transition-colors line-clamp-1" title={room.name}>
          {room.name}
        </h3>
        <div className="flex items-center gap-3 text-xs text-surface-400 font-mono mb-4">
          <span className="flex items-center gap-1.5">
            ID: {room.roomId}
            {!room.isPublic && <Lock size={12} className="text-honey-500" />}
          </span>
        </div>
        
        {/* Language Pill moved here to avoid overlap */}
        <div className="mb-5">
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-surface-700/50 ${langColor}`}>
            {room.language}
          </span>
        </div>
      </div>
      
      <div className="pt-4 border-t border-surface-800 flex items-center justify-between text-surface-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-medium" title="Members">
            <Users size={14} />
            <span>{room.participants?.length || 1}</span>
          </div>
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} online
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium">
            {new Date(room.createdAt).toLocaleDateString()}
          </span>
          <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-hive-400" />
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
