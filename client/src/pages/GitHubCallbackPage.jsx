import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/shared/Loader';

/**
 * GitHub OAuth callback page.
 * Reads the JWT token from the URL query params (sent by the backend after OAuth),
 * saves it to localStorage, and redirects to the dashboard.
 */
const GitHubCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('GitHub authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        setError('No token received from GitHub.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Save token and fetch user profile
      try {
        localStorage.setItem('token', token);
        // Force a page reload to re-initialize auth context with the new token
        window.location.href = '/dashboard';
      } catch (err) {
        setError('Failed to complete authentication.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 text-white">
        <div className="text-red-400 text-lg mb-2">⚠️ {error}</div>
        <div className="text-surface-500 text-sm">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <Loader text="Completing GitHub sign-in..." />
    </div>
  );
};

export default GitHubCallbackPage;
