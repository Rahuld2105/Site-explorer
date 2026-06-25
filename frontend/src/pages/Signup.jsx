import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signup as signupRequest } from '../api/authApi';
import { extractData, extractMessage } from '../api/responseUtils';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

/**
 * Shared authentication card container used by signup and login pages.
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
          <span className="auth-kicker">Create Your Travel Profile</span>
          <h1>Plan richer visits before you arrive.</h1>
          <p>Build a TourVision profile for saved routes, nearby discoveries, AI guide history, and smart alerts.</p>
          <div className="auth-highlights">
            <span>Heritage guides</span>
            <span>Smart routes</span>
            <span>Place alerts</span>
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

function getPasswordScore(password) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
}

/**
 * Signup page for new traveler registration.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordScore = getPasswordScore(form.password);
  const strengthLabel = ['Start typing', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore];

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
      const response = await signupRequest(form);
      login(extractData(response));
      toast.success('Your TourVision account is ready.');
      navigate('/');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card anim-scale-in">
        <span className="badge badge-teal">New traveler</span>
        <h2>Create your account</h2>
        <p>Start a smarter TourVision journey.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Full name</span>
            <input
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
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
                placeholder="Create password"
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
          <div className={`password-strength password-strength-${passwordScore}`}>
            <span><i /></span>
            <strong>{strengthLabel}</strong>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader label="Creating account..." size="sm" /> : 'Sign up'}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-amber-300 hover:text-amber-200">
            Sign in
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
