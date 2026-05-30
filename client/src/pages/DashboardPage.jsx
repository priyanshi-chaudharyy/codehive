import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Code, LogIn, Lock, Unlock, Search, LayoutGrid, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';
import Loader from '../components/shared/Loader';
import RoomCard from '../components/rooms/RoomCard';
import { roomService } from '../services/roomService';
import showToast from '../components/shared/Toast';
import { LANGUAGES } from '../components/editor/EditorToolbar';

const DashboardPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    language: 'javascript',
    isPublic: true,
    password: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const data = await roomService.getRooms();
      setRooms(data.rooms);
    } catch (error) {
      showToast.error('Failed to load rooms');
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
    } catch (error) {
      showToast.error('Failed to delete room');
    }
  };

  const handleLeaveRoom = async (roomId) => {
    showToast.info('Leaving rooms is coming in a future update!');
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 animate-slide-up">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">👋</span>
              <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
            </div>
            <p className="text-surface-400">Manage your collaborative coding sessions.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="btn-secondary flex items-center gap-2 !py-2.5"
            >
              <LogIn size={16} />
              Join Room
            </button>
            <button 
              onClick={() => {
                setCreateData({ name: `${user.name}'s Room`, language: 'javascript', isPublic: true, password: '' });
                setIsCreateModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2 !py-2.5"
            >
              <Plus size={16} />
              New Room
            </button>
          </div>
        </div>

        {/* Search bar */}
        {rooms.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/50 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-hive-500/50 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Stats bar */}
        {rooms.length > 0 && (
          <div className="flex items-center gap-6 mb-6 text-sm animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-2 text-surface-400">
              <LayoutGrid size={14} />
              <span>{filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'}</span>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        {isLoading ? (
          <Loader text="Loading your rooms..." />
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-dashed animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-hive-600/20 to-honey-500/20 flex items-center justify-center mb-6 border border-surface-700/50">
              <Sparkles size={32} className="text-hive-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Create your first room</h3>
            <p className="text-surface-400 max-w-md mb-8">Start collaborating with your team in real-time. Share a link and code together instantly.</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              Create a Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((room, i) => (
              <div key={room._id} className="animate-slide-up" style={{ animationDelay: `${(i % 6) * 50}ms` }}>
                <RoomCard 
                  room={room} 
                  currentUserId={user?._id}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  onDelete={handleDeleteRoom}
                  onLeave={handleLeaveRoom}
                />
              </div>
            ))}
          </div>
        )}
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
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="input-field !py-2.5"
                  placeholder="Optional"
                />
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
                    <input
                      type="password"
                      value={createData.password}
                      onChange={(e) => setCreateData({...createData, password: e.target.value})}
                      className="input-field !py-2.5"
                      placeholder="Secure password"
                      required={!createData.isPublic}
                    />
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
      <footer className="mt-auto border-t border-surface-800/50 bg-surface-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl opacity-80">🐝</span>
            <span className="text-sm font-semibold text-surface-400">CodeHive</span>
          </div>
          <p className="text-xs text-surface-500">
            &copy; {new Date().getFullYear()} CodeHive. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-surface-500">
            <a href="#" className="hover:text-surface-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
