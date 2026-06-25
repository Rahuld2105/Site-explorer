import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminLogin } from '../api/authApi';
import { extractData, extractMessage } from '../api/responseUtils';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate replace to="/admin/dashboard" />;
  }

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await adminLogin(form);
      login(extractData(response));
      toast.success('Admin access granted.');
      navigate(location.state?.from?.pathname || '/admin/dashboard', { replace: true });
    } catch (error) {
      toast.error(extractMessage(error, 'Admin credentials are invalid.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-admin">
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
          <div>
            <span className="auth-kicker">TourVision Admin</span>
            <h1>Operate every heritage workflow from one dashboard.</h1>
            <p>Manage places, alerts, AI guide content, QR scans, travelers, trips, media, feedback, and platform settings.</p>
          </div>
          <div className="auth-highlights">
            <span>Places</span>
            <span>Smart alerts</span>
            <span>Analytics</span>
            <span>CMS</span>
          </div>
        </section>

        <section className="auth-card anim-scale-in">
          <span className="badge badge-teal">Admin Login</span>
          <h2>Secure dashboard access</h2>
          <p>Use an admin account to open the TourVision control center.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Admin Email</span>
              <input
                name="email"
                type="email"
                placeholder="admin@example.com"
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
                  placeholder="Enter admin password"
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
              {loading ? <Loader label="Checking admin..." size="sm" /> : 'Open Admin Dashboard'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-500">
            <Link className="text-teal-700 hover:text-teal-900" to="/login">
              User login
            </Link>
            <Link className="text-teal-700 hover:text-teal-900" to="/signup">
              Create account
            </Link>
            <Link className="hover:text-slate-900" to="/">
              Back to TourVision
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
