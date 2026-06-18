import { LayoutGrid, Users, GitCommit, Clock } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, delay }) => (
  <div 
    className="bg-surface-900/60 border border-surface-800 rounded-2xl p-6 flex items-center gap-5 animate-slide-up hover:bg-surface-800/60 transition-colors"
    style={{ animationDelay: delay }}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-surface-950 border border-surface-800 ${colorClass.split(' ')[1]}`}>
      <Icon size={22} className={colorClass.split(' ')[1]} />
    </div>
    <div className="flex flex-col justify-center">
      <p className="text-surface-400 text-[13px] font-semibold mb-0.5 tracking-wide">{title}</p>
      <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

const DashboardStats = ({ stats }) => {
  if (!stats) return null;

  const hours = Math.floor(stats.totalTimeCoded / 3600);
  const minutes = Math.floor((stats.totalTimeCoded % 3600) / 60);
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title="Total Projects" 
        value={stats.totalProjects} 
        icon={LayoutGrid} 
        colorClass="bg-hive-500/10 text-hive-400"
        delay="0ms" 
      />
      <StatCard 
        title="Collaborators" 
        value={stats.totalCollaborators} 
        icon={Users} 
        colorClass="bg-blue-500/10 text-blue-400"
        delay="50ms" 
      />
      <StatCard 
        title="Commits (Month)" 
        value={stats.commitsThisMonth} 
        icon={GitCommit} 
        colorClass="bg-green-500/10 text-green-400"
        delay="100ms" 
      />
      <StatCard 
        title="Time Coded" 
        value={timeString} 
        icon={Clock} 
        colorClass="bg-violet-500/10 text-violet-400"
        delay="150ms" 
      />
    </div>
  );
};

export default DashboardStats;
