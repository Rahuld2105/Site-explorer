import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as loginRequest } from '../api/authApi';
import { extractData, extractMessage } from '../api/responseUtils';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

/**
 * Shared authentication card container used by login and signup pages.
 */
function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero-sun" />
        <div className="auth-hero-fort">
          <span className="auth-hero-dome" />
          <span className="auth-hero-tower auth-hero-tower-left" />
          <span className="auth-hero-gate" />
          <span className="auth-hero-tower auth-hero-tower-right" />
        </div>
        <div className="auth-hero-path" />
      </div>
      <div className="auth-grid">
        <section className="auth-copy anim-fade-up">
          <span className="auth-kicker">TourVision Access</span>
          <h1>Explore heritage with smarter context.</h1>
          <p>Sign in to restore your saved trips, AI guide sessions, route plans, and place-aware alerts.</p>
          <div className="auth-highlights">
            <span>Live alerts</span>
            <span>AI narration</span>
            <span>Trip memory</span>
          </div>
        </section>
        {children}
      </div>
    </div>
  );
}

AuthShell.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Login page for JWT session creation.
 */
export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await loginRequest(form);
      login(extractData(response));
      toast.success('Welcome back to TourVision.');
      navigate('/');
    } catch (error) {
      toast.error(extractMessage(error, 'Invalid credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card anim-scale-in">
        <span className="badge badge-teal">Welcome back</span>
        <h2>Sign in to TourVision</h2>
        <p>Continue from your last heritage journey.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader label="Signing in..." size="sm" /> : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-amber-300 hover:text-amber-200">
            Create an account
          </Link>
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Managing TourVision?{' '}
          <Link to="/admin/login" className="font-semibold text-teal-300 hover:text-teal-200">
            Admin login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
