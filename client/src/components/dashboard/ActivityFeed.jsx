import { formatDistanceToNow } from 'date-fns';
import { Activity as ActivityIcon, UserPlus, GitCommit, FileText } from 'lucide-react';

const getActivityIcon = (type) => {
  switch (type) {
    case 'room_created': return <FileText size={14} className="text-blue-400" />;
    case 'room_joined': return <UserPlus size={14} className="text-green-400" />;
    case 'snapshot_saved': return <GitCommit size={14} className="text-hive-400" />;
    default: return <ActivityIcon size={14} className="text-surface-400" />;
  }
};

const ActivityFeed = ({ activities = [] }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center">
        <ActivityIcon size={32} className="text-surface-600 mb-3" />
        <p className="text-surface-400 text-sm">No recent team activity.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 h-full">
      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <ActivityIcon size={18} className="text-hive-400" />
        Team Activity
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity._id || index} className="flex gap-3 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-surface-700 shrink-0 bg-surface-800 flex items-center justify-center">
                {activity.user?.avatarUrl ? (
                  <img src={activity.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full text-xs flex items-center justify-center font-bold text-surface-900"
                    style={{ backgroundColor: activity.user?.avatar || '#6366f1' }}
                  >
                    {activity.user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {index !== activities.length - 1 && (
                <div className="absolute top-8 bottom-[-16px] left-1/2 -translate-x-1/2 w-px bg-surface-700/50" />
              )}
            </div>
            
            <div className="pb-2">
              <p className="text-sm text-surface-300">
                <span className="font-medium text-white">{activity.user?.name}</span>{' '}
                {activity.description}{' '}
                <span className="font-medium text-hive-300">{(activity.room?.name || 'a room')}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {getActivityIcon(activity.type)}
                <span className="text-xs text-surface-500">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
