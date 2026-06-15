import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from './Logo';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-surface-950/90 backdrop-blur-2xl border-b border-surface-700/30 shadow-lg shadow-black/20'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <Logo size={30} withText />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-ghost flex items-center gap-2">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/40 border border-surface-700/30">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-surface-600/50"
                      style={{ backgroundColor: user.avatar }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-surface-200">
                      {user.name}
                    </span>
                  </div>

                  <button onClick={handleLogout} className="btn-ghost text-surface-400 hover:text-red-400">
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost">
                    Login
                  </Link>
                  <Link to="/signup" className="btn-primary text-sm !py-2 !px-5">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 right-0 w-72 m-4 rounded-2xl bg-surface-900/95 backdrop-blur-xl border border-surface-700/40 shadow-2xl shadow-black/40 animate-scale-in overflow-hidden">
            <div className="p-4 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 mb-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: user.avatar }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{user.name}</div>
                      <div className="text-xs text-surface-400">Online</div>
                    </div>
                  </div>

                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-surface-200 hover:bg-surface-800/60 transition-colors"
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>

                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full px-4 py-2.5 rounded-xl text-center text-surface-200 hover:bg-surface-800/60 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full btn-primary text-center text-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
