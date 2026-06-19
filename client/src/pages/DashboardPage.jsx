import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Lock, Search, LayoutGrid, Sparkles, LayoutDashboard, Folder, Users, Star, Globe, Unlock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';
import Logo from '../components/shared/Logo';
import { LANGUAGES } from '../components/editor/EditorToolbar';
import Loader from '../components/shared/Loader';
import RoomCard from '../components/rooms/RoomCard';
import DashboardStats from '../components/dashboard/DashboardStats';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { roomService } from '../services/roomService';
import api from '../services/api';
import showToast from '../components/shared/Toast';

// Service to fetch user stats and activity
const userService = {
  getStats: async () => {
    return await api.get('/users/stats');
  },
  getActivity: async () => {
    return await api.get('/users/activity');
  },
  toggleStar: async (roomId) => {
    return await api.put(`/rooms/${roomId}/star`);
  }
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, owned, shared, starred
  const [activeFilter, setActiveFilter] = useState('all'); // all, public, private
  
  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    language: 'javascript',
    isPublic: true,
    password: ''
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [roomsData, statsData, activityData] = await Promise.all([
        roomService.getRooms(),
        userService.getStats(),
        userService.getActivity(),
      ]);
      setRooms(roomsData.rooms);
      setStats(statsData.stats);
      setActivities(activityData.activities);
    } catch (error) {
      showToast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createData.name.trim()) return;

    setIsCreating(true);
    try {
      const data = await roomService.createRoom(createData);
      showToast.success('Room created successfully');
      navigate(`/room/${data.room.roomId}`);
    } catch (error) {
      showToast.error(error.message || 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;

    try {
      await roomService.joinRoom(joinRoomId, { password: joinPassword });
      navigate(`/room/${joinRoomId}`);
    } catch (error) {
      showToast.error(error.message || 'Failed to join room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await roomService.deleteRoom(roomId);
      showToast.success('Room deleted');
      setRooms(rooms.filter(r => r.roomId !== roomId));
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      showToast.error('Failed to delete room');
    }
  };

  const handleLeaveRoom = async (roomId) => {
    showToast.info('Leaving rooms is coming in a future update!');
  };

  const handleToggleStar = async (roomId) => {
    try {
      const res = await userService.toggleStar(roomId);
      setRooms(rooms.map(r => r.roomId === roomId ? { ...r, isStarred: res.isStarred } : r));
    } catch (error) {
      showToast.error('Failed to update room');
    }
  };

  // Filtering Logic
  let filteredRooms = rooms;

  if (activeTab === 'owned') {
    filteredRooms = filteredRooms.filter(r => (typeof r.owner === 'object' ? r.owner._id : r.owner) === user?._id);
  } else if (activeTab === 'shared') {
    filteredRooms = filteredRooms.filter(r => (typeof r.owner === 'object' ? r.owner._id : r.owner) !== user?._id);
  } else if (activeTab === 'starred') {
    filteredRooms = filteredRooms.filter(r => r.isStarred);
  }

  if (activeFilter === 'public') {
    filteredRooms = filteredRooms.filter(r => r.isPublic);
  } else if (activeFilter === 'private') {
    filteredRooms = filteredRooms.filter(r => !r.isPublic);
  }

  if (searchQuery) {
    filteredRooms = filteredRooms.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'owned', label: 'My Rooms', icon: Folder },
    { id: 'shared', label: 'Shared with me', icon: Users },
    { id: 'starred', label: 'Starred', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-24 relative flex gap-8">
        {/* Background effects */}
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-hive-600/4 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-honey-500/3 rounded-full blur-[120px] pointer-events-none" />

        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="sticky top-24 glass-card p-4">
            <div className="flex flex-col gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                    activeTab === tab.id 
                      ? 'bg-hive-500/10 text-hive-400 border border-hive-500/20' 
                      : 'text-surface-400 hover:text-white hover:bg-surface-900 border border-transparent'
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-hive-400' : 'text-surface-500'} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-surface-800">
              <div className="flex flex-col gap-3">
                <button onClick={() => setIsJoinModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-surface-700 bg-surface-900 text-surface-200 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium">
                  <LogIn size={16} /> Join Room
                </button>
                <button onClick={() => {
                  setCreateData({ name: `${user.name}'s Room`, language: 'javascript', isPublic: true, password: '' });
                  setIsCreateModalOpen(true);
                }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-hive-600 hover:bg-hive-500 text-white transition-colors text-sm font-semibold shadow-lg shadow-hive-500/20">
                  <Plus size={18} /> New Room
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 animate-slide-up">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
                  Welcome back, {user?.username || 'Developer'}
                </h1>
              </div>
              <p className="text-surface-400">Manage your collaborative coding sessions.</p>
            </div>
          </div>

          <DashboardStats stats={stats} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              {/* Toolbar: Search and Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up">
                <div className="relative max-w-sm w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rooms..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/40 border border-surface-700/30 text-sm text-white placeholder-surface-400 focus:outline-none focus:border-hive-500/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] transition-all duration-300"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 p-1.5 bg-surface-900/60 border border-surface-800 rounded-xl">
                  {['all', 'public', 'private'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                        activeFilter === filter 
                          ? 'bg-surface-800 text-white shadow-sm border border-surface-700' 
                          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 border border-transparent'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rooms Grid */}
              {isLoading ? (
                <div className="py-20"><Loader text="Loading your dashboard..." /></div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-dashed animate-slide-up">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-hive-600/20 to-honey-500/20 flex items-center justify-center mb-6 border border-surface-700/50">
                    <Sparkles size={32} className="text-hive-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">No rooms found</h3>
                  <p className="text-surface-400 max-w-md mb-8">You don't have any rooms matching these filters yet.</p>
                  <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    Create a Room
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredRooms.map((room, i) => (
                    <div key={room._id} className="animate-slide-up" style={{ animationDelay: `${(i % 6) * 50}ms` }}>
                      <RoomCard 
                        room={room} 
                        currentUserId={user?._id}
                        onClick={() => navigate(`/room/${room.roomId}`)}
                        onDelete={handleDeleteRoom}
                        onLeave={handleLeaveRoom}
                        onToggleStar={handleToggleStar}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Activity Feed Sidebar */}
            <div className="xl:col-span-1 hidden xl:block animate-slide-up">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </div>
      </main>

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-1">Join a Room</h2>
            <p className="text-sm text-surface-500 mb-5">Enter the room ID shared by your teammate.</p>
            <form onSubmit={handleJoinRoom}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Room ID</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="input-field !py-2.5"
                  placeholder="e.g. abc-1x3z"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Password (if private)</label>
                <div className="relative">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="input-field !py-2.5 pr-10"
                    placeholder="Optional"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors focus:outline-none"
                  >
                    {showJoinPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsJoinModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={!joinRoomId.trim()} className="btn-primary !py-2.5">
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-1">Create New Room</h2>
            <p className="text-sm text-surface-500 mb-5">Set up a new collaborative coding session.</p>
            <form onSubmit={handleCreateRoom}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Room Name</label>
                  <input
                    type="text"
                    value={createData.name}
                    onChange={(e) => setCreateData({...createData, name: e.target.value})}
                    className="input-field !py-2.5"
                    placeholder="My Awesome Project"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">Initial Language</label>
                  <select
                    value={createData.language}
                    onChange={(e) => setCreateData({...createData, language: e.target.value})}
                    className="input-field !py-2.5 cursor-pointer appearance-none"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-between cursor-pointer hover:bg-surface-800 transition-colors"
                     onClick={() => setCreateData({...createData, isPublic: !createData.isPublic})}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${createData.isPublic ? 'bg-emerald-500/20 text-emerald-400' : 'bg-honey-500/20 text-honey-400'}`}>
                      {createData.isPublic ? <Unlock size={18} /> : <Lock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{createData.isPublic ? 'Public Room' : 'Private Room'}</p>
                      <p className="text-xs text-surface-400">{createData.isPublic ? 'Anyone with the link can join' : 'Requires a password to join'}</p>
                    </div>
                  </div>
                  {/* Toggle Switch UI */}
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${createData.isPublic ? 'bg-surface-700' : 'bg-honey-500'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${createData.isPublic ? 'translate-x-0' : 'translate-x-4'}`} />
                  </div>
                </div>

                {!createData.isPublic && (
                  <div className="animate-slide-down">
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">Room Password</label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={createData.password}
                        onChange={(e) => setCreateData({...createData, password: e.target.value})}
                        className="input-field !py-2.5 pr-10"
                        placeholder="••••••••"
                        required={!createData.isPublic}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors focus:outline-none"
                      >
                        {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={!createData.name.trim() || isCreating} className="btn-primary !py-2.5">
                  {isCreating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="border-t border-surface-700/30 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-sm text-surface-500">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="hidden sm:inline">© {new Date().getFullYear()} CodeHive. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
