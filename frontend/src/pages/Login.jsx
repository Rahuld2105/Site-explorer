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
function AuthCard({ children, title, subtitle }) {
  return (
    <div className="panel-strong w-full max-w-md p-8">
      <span className="badge">TourVision Access</span>
      <h1 className="mt-4 font-heading text-3xl text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

AuthCard.propTypes = {
  children: PropTypes.node.isRequired,
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_transparent_35%),linear-gradient(180deg,_#08111f_0%,_#0b1930_48%,_#10192c_100%)] px-4 py-12">
      <AuthCard
        title="Sign in to your travel cockpit"
        subtitle="Access saved trips, immersive guides, expenses, and real-time AI narration."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="field"
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            className="field"
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
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
      </AuthCard>
    </div>
  );
}
