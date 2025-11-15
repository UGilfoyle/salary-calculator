import { useState } from 'react';
import { Github, Sparkles, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  const { login: authLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/github`;
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

          {/* GitHub Login */}
          <div className="github-section">
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
