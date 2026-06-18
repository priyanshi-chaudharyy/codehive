import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';
import showToast from '../components/shared/Toast';
import Logo from '../components/shared/Logo';
import { Github, ArrowRight, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      showToast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      showToast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    // Strip "/api" suffix to get the server root URL
    const serverUrl = apiUrl.replace(/\/api\/?$/, '');
    window.location.href = `${serverUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-hive-600/6 rounded-full blur-[150px] pointer-events-none animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-honey-500/4 rounded-full blur-[130px] pointer-events-none animate-float-delayed" />
        <div className="absolute inset-0 dot-pattern opacity-10" />

        <div className="w-full max-w-md relative animate-slide-up">
          <div className="glass-card p-8 md:p-10 rounded-2xl shadow-2xl shadow-black/50 border border-surface-700/30">
            {/* Header */}
            <div className="text-center mb-8">
              <Logo size={40} className="mx-auto mb-5" />
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
              <p className="text-surface-400 mt-2 text-sm">Sign in to continue your collaborative sessions</p>
            </div>

            {/* GitHub OAuth Button */}
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-surface-600/30 text-white font-medium transition-all duration-300 hover:border-surface-500/50 mb-6 group"
            >
              <Github size={20} />
              Continue with GitHub
              <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-700/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface-900/80 px-3 text-surface-500">or sign in with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-surface-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-hive-400 hover:text-hive-300 font-medium transition-colors">
                Create one now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
