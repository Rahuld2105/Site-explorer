import { useAuth } from '../context/AuthContext';

/**
 * Lightweight profile route so profile navigation stays distinct from expenses.
 */
export default function ProfilePage() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="section-sm">
      <div className="container">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Profile</p>
          <h1 className="mt-3 font-heading text-[2rem] font-extrabold text-slate-900">Your traveler profile</h1>
          <p className="mt-3 text-sm text-slate-500">
            Keep account details here so profile navigation no longer mixes with expense tracking.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-2 font-semibold text-slate-900">{user?.name || 'Traveler'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-2 font-semibold text-slate-900">{user?.email || 'Sign in to view account info'}</p>
            </div>
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-gray-100"
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
