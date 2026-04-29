import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ExpenseTracker from '../components/expense/ExpenseTracker';
import { calculateTripSummary, readTripsFromStorage, writeTripsToStorage } from '../utils/tripExpenses';

/**
 * Trip detail page for adding expenses and viewing split settlements.
 */
export default function TripDetailsPage() {
  const { id } = useParams();
  const [trips, setTrips] = useState(() => readTripsFromStorage());

  const trip = useMemo(
    () => trips.find((currentTrip) => currentTrip.id === id) || null,
    [id, trips]
  );
  const summary = useMemo(() => (trip ? calculateTripSummary(trip) : null), [trip]);

  const handleUpdateTrip = (nextTrip) => {
    const nextTrips = trips.map((currentTrip) => (currentTrip.id === nextTrip.id ? nextTrip : currentTrip));
    setTrips(nextTrips);
    writeTripsToStorage(nextTrips);
  };

  if (!trip) {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <p className="font-semibold text-slate-900">Trip not found</p>
            <p className="mt-2 text-sm text-slate-500">This trip may have been removed or never created.</p>
            <Link to="/trips" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              Back to Trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link to="/trips" className="text-sm font-semibold text-slate-500 transition hover:text-slate-900">
                Back to Trips
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trip Detail</p>
              <h1 className="mt-2 font-heading text-[2rem] font-extrabold text-slate-900">{trip.name}</h1>
              <p className="mt-3 text-sm text-slate-500">Participants: {trip.participants.join(', ')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total spent</p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">₹{summary.total.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Per person share</p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-emerald-700">₹{summary.totalPerPerson.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <ExpenseTracker trip={trip} onTripUpdate={handleUpdateTrip} />

          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Balances</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-slate-900">Who paid vs who owes</h2>

              <div className="mt-5 space-y-3">
                {trip.participants.map((participant) => {
                  const balance = summary.balances[participant] || 0;
                  const isPositive = balance >= 0;

                  return (
                    <div key={participant} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{participant}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Paid ₹{(summary.paidTotals[participant] || 0).toFixed(2)} · Owes ₹{(summary.owedTotals[participant] || 0).toFixed(2)}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isPositive ? 'Gets back' : 'Owes'} ₹{Math.abs(balance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Settlements</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-slate-900">Smart split summary</h2>

              {summary.settlements.length ? (
                <div className="mt-5 space-y-3">
                  {summary.settlements.map((settlement) => (
                    <div key={`${settlement.from}-${settlement.to}-${settlement.amount}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">
                        {settlement.from} owes {settlement.to} ₹{settlement.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                  Everyone is settled up for this trip.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
