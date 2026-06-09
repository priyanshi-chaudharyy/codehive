import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';
import showToast from '../components/shared/Toast';
import { Github } from 'lucide-react';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password);
      showToast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      showToast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Decorative background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-honey-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative glass-card p-8 rounded-2xl shadow-xl shadow-black/50 border border-surface-800/80">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-800 border border-surface-700 mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="text-2xl font-bold">Create your account</h2>
              <p className="text-surface-400 mt-2">Join CodeHive to start collaborating</p>
            </div>

            {/* GitHub OAuth Button */}
            <button
              onClick={() => {
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                const serverUrl = apiUrl.replace(/\/api\/?$/, '');
                window.location.href = `${serverUrl}/api/auth/github`;
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#24292f] hover:bg-[#2f363d] border border-surface-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-black/30 mb-6"
            >
              <Github size={20} />
              Continue with GitHub
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface-900 px-3 text-surface-500">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>

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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full mt-6"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-surface-400">
              Already have an account?{' '}
              <Link to="/login" className="text-hive-400 hover:text-hive-300 font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
