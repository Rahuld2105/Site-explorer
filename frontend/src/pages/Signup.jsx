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
function AuthCard({ children, title, subtitle }) {
  return (
    <div className="panel-strong w-full max-w-md p-8">
      <span className="badge">Create Your Travel Profile</span>
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_transparent_35%),linear-gradient(180deg,_#08111f_0%,_#0b1930_48%,_#10192c_100%)] px-4 py-12">
      <AuthCard
        title="Build your smart travel profile"
        subtitle="Save nearby recommendations, plan collaborative trips, and unlock place-aware narration."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="field"
            name="name"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
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
            placeholder="Create password"
            value={form.password}
            onChange={handleChange}
            required
          />
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
      </AuthCard>
    </div>
  );
}
