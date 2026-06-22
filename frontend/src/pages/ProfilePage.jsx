import { useEffect, useMemo, useState } from 'react';
import { getProfileDashboard } from '../api/authApi';
import { extractData } from '../api/responseUtils';
import { useAuth } from '../context/AuthContext';
import { calculateTripSummary, readTripsFromStorage } from '../utils/tripExpenses';

/**
 * Lightweight profile route so profile navigation stays distinct from expenses.
 */
export default function ProfilePage() {
  const { isAuthenticated, logout, user } = useAuth();
  const [serverDashboard, setServerDashboard] = useState(null);
  const localTrips = useMemo(() => readTripsFromStorage(), []);
  const localStats = useMemo(() => {
    const completed = localTrips.filter((trip) => trip.status === 'Completed');
    const totalExpenses = localTrips.reduce((sum, trip) => sum + calculateTripSummary(trip).total, 0);
    const uploadedMemories = localTrips.reduce((sum, trip) => sum + (trip.memories || []).length, 0);

    return {
      completed,
      placesVisited: [...new Set(completed.flatMap((trip) => trip.destinations || []))],
      totalExpenses,
      uploadedMemories
    };
  }, [localTrips]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await getProfileDashboard();
        const data = extractData(response);
        if (mounted) {
          setServerDashboard(data?.dashboard || null);
        }
      } catch {
        if (mounted) {
          setServerDashboard(null);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Places visited', serverDashboard?.places_visited?.length ?? localStats.placesVisited.length],
              ['Trips completed', serverDashboard?.trips_completed ?? localStats.completed.length],
              ['Expenses tracked', `INR ${Math.round(serverDashboard?.expenses_total ?? localStats.totalExpenses).toLocaleString('en-IN')}`],
              ['Uploaded memories', serverDashboard?.uploaded_memories ?? localStats.uploadedMemories]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black text-slate-950">Trip history</h2>
              <div className="mt-4 space-y-3">
                {(serverDashboard?.trip_history?.length ? serverDashboard.trip_history : localTrips).slice(0, 6).map((trip) => (
                  <div key={trip.id || trip._id || trip.name} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-900">{trip.name}</p>
                    <p className="text-sm font-semibold text-slate-500">{trip.status}</p>
                  </div>
                ))}
                {!localTrips.length && !serverDashboard?.trip_history?.length ? (
                  <p className="text-sm font-semibold text-slate-500">Start and complete trips to build your history.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black text-slate-950">Uploaded media</h2>
              <div className="mt-4 space-y-3">
                {localTrips.flatMap((trip) => (trip.memories || []).map((memory) => ({ ...memory, tripName: trip.name }))).slice(0, 6).map((memory) => (
                  <div key={memory.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="truncate font-bold text-slate-900">{memory.name}</p>
                    <p className="text-sm font-semibold text-slate-500">{memory.tripName}</p>
                  </div>
                ))}
                {!localStats.uploadedMemories ? (
                  <p className="text-sm font-semibold text-slate-500">Completed trip memories will appear here.</p>
                ) : null}
              </div>
            </section>
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
