import { useState } from 'react';
import { Github, Sparkles, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const getApiBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Remove trailing slash and ensure clean URL
  return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

export default function Login() {
  const { login: authLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGitHubLogin = () => {
    // Debug: Log the environment variable
    console.log('VITE_API_URL from env:', import.meta.env.VITE_API_URL);
    console.log('API_BASE_URL:', API_BASE_URL);
    
    // Ensure no double slashes
    const githubUrl = `${API_BASE_URL}/api/auth/github`.replace(/([^:]\/)\/+/g, '$1');
    console.log('Redirecting to:', githubUrl);
    
    if (API_BASE_URL.includes('localhost')) {
      console.error('⚠️ WARNING: Using localhost! VITE_API_URL is not set in Vercel environment variables.');
      alert('Configuration Error: API URL is not set. Please set VITE_API_URL in Vercel environment variables.');
      return;
    }
    
    window.location.href = githubUrl;
  };

  const handleGoogleLogin = () => {
    // Debug: Log the environment variable
    console.log('VITE_API_URL from env:', import.meta.env.VITE_API_URL);
    console.log('API_BASE_URL:', API_BASE_URL);
    
    // Ensure no double slashes
    const googleUrl = `${API_BASE_URL}/api/auth/google`.replace(/([^:]\/)\/+/g, '$1');
    console.log('Redirecting to:', googleUrl);
    
    if (API_BASE_URL.includes('localhost')) {
      console.error('⚠️ WARNING: Using localhost! VITE_API_URL is not set in Vercel environment variables.');
      alert('Configuration Error: API URL is not set. Please set VITE_API_URL in Vercel environment variables.');
      return;
    }
    
    window.location.href = googleUrl;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = isLogin
        ? { email, password }
        : { email, password, displayName };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
      
      // Login user with token and user data
      authLogin(response.data.access_token, response.data.user);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        (isLogin
          ? 'Failed to login. Please check your credentials.'
          : 'Failed to register. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="sparkle-icon">
            <Sparkles size={48} />
          </div>
          <h1>Welcome to SalaryCalc</h1>
          <p className="login-subtitle">Calculate your in-hand salary</p>
        </div>

        <div className="login-content">
          {/* Auth Type Toggle */}
          <div className="auth-toggle">
            <button
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              Login
            </button>
            <button
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Social Login */}
          <div className="social-login-section">
            <button onClick={handleGoogleLogin} className="google-login-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button onClick={handleGitHubLogin} className="github-login-btn">
              <Github size={24} />
              <span>Continue with GitHub</span>
            </button>
            <div className="divider">
              <span>or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="email-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="displayName">
                  <User size={18} />
                  Full Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={18} />
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="email-submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="login-features">
            <div className="feature-item">
              <span className="feature-emoji">📊</span>
              <span>Track all your calculations</span>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">🔒</span>
              <span>Secure & private</span>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">⚡</span>
              <span>Fast & accurate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
