import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateTripSummary, createTrip, readTripsFromStorage, writeTripsToStorage } from '../utils/tripExpenses';

function createInitialTripForm() {
  return {
    name: '',
    participants: ''
  };
}

/**
 * Trip list page for creating trips and entering the shared expense flow.
 */
export default function TripsPage() {
  const [trips, setTrips] = useState(() => readTripsFromStorage());
  const [form, setForm] = useState(createInitialTripForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const enrichedTrips = useMemo(
    () =>
      trips.map((trip) => ({
        ...trip,
        summary: calculateTripSummary(trip)
      })),
    [trips]
  );

  const handleCreateTrip = (event) => {
    event.preventDefault();

    const participants = form.participants
      .split(',')
      .map((participant) => participant.trim())
      .filter(Boolean);

    if (!form.name.trim()) {
      setError('Trip name is required.');
      return;
    }

    if (!participants.length) {
      setError('Add at least one participant.');
      return;
    }

    const nextTrips = [createTrip(form.name.trim(), participants), ...trips];
    setTrips(nextTrips);
    writeTripsToStorage(nextTrips);
    setForm(createInitialTripForm());
    setFormOpen(false);
    setError('');
  };

  return (
    <div className="section-sm">
      <div className="container space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trips / Expenses</p>
              <h1 className="mt-2 font-heading text-[2rem] font-extrabold text-slate-900">Trip-based expense management</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Create a trip, add participants, and track who paid, who owes, and how the group should settle up.
              </p>
            </div>
            <button type="button" onClick={() => setFormOpen((current) => !current)} className="btn-primary btn-sm">
              Create Trip
            </button>
          </div>

          {formOpen ? (
            <form className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2" onSubmit={handleCreateTrip}>
              <label className="input-wrap">
                <span className="input-label">Trip Name</span>
                <input
                  className="input"
                  placeholder="Pune Trip"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="input-wrap">
                <span className="input-label">Participants</span>
                <input
                  className="input"
                  placeholder="Rahul, Amit, Priya"
                  value={form.participants}
                  onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))}
                />
              </label>

              {error ? (
                <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" className="btn-outline btn-sm" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Save Trip
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {enrichedTrips.length ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {enrichedTrips.map((trip) => (
              <article key={trip.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trip</p>
                    <h2 className="mt-2 font-heading text-xl font-bold text-slate-900">{trip.name}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {trip.participants.length} people
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">{trip.participants.join(', ')}</p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Spent</p>
                    <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">₹{trip.summary.total.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Per Person</p>
                    <p className="mt-2 font-heading text-2xl font-extrabold text-emerald-700">₹{trip.summary.totalPerPerson.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-900">Settlement summary</p>
                  {trip.summary.settlements.length ? (
                    <div className="mt-3 space-y-2">
                      {trip.summary.settlements.slice(0, 2).map((settlement) => (
                        <p key={`${settlement.from}-${settlement.to}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {settlement.from} owes {settlement.to} ₹{settlement.amount.toFixed(2)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      Everyone is settled up.
                    </p>
                  )}
                </div>

                <Link
                  to={`/trips/${trip.id}`}
                  className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800"
                >
                  Open Trip
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-[var(--shadow-card)]">
            <p className="font-semibold text-slate-900">No trips created yet</p>
            <p className="mt-2 text-sm text-slate-500">Create your first trip to start tracking shared expenses and settlements.</p>
          </div>
        )}
      </div>
    </div>
  );
}
