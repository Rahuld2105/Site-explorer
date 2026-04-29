import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ExpenseChart from './ExpenseChart';
import { calculateTripSummary } from '../../utils/tripExpenses';

const CATEGORY_OPTIONS = [
  { value: 'Food', accent: 'bg-amber-100 text-amber-700', icon: '🍜' },
  { value: 'Travel', accent: 'bg-sky-100 text-sky-700', icon: '🚕' },
  { value: 'Stay', accent: 'bg-emerald-100 text-emerald-700', icon: '🏨' },
  { value: 'Other', accent: 'bg-slate-100 text-slate-700', icon: '🧾' }
];

function getCategoryMeta(category) {
  return CATEGORY_OPTIONS.find((option) => option.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

function createInitialForm(trip) {
  return {
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    name: '',
    paidBy: trip?.participants?.[0] || '',
    participantNames: trip?.participants || []
  };
}

/**
 * Trip-scoped expense manager with smart splitting and settlement-friendly data.
 */
export default function ExpenseTracker({ onTripUpdate, trip }) {
  const [form, setForm] = useState(() => createInitialForm(trip));
  const [formError, setFormError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  const summary = useMemo(() => calculateTripSummary(trip), [trip]);
  const chartData = useMemo(() => {
    return (trip.expenses || []).reduce((accumulator, expense) => {
      const current = accumulator.find((item) => item.category === expense.category);

      if (current) {
        current.amount += Number(expense.amount || 0);
      } else {
        accumulator.push({
          amount: Number(expense.amount || 0),
          category: expense.category
        });
      }

      return accumulator;
    }, []);
  }, [trip.expenses]);

  const visibleExpenses = useMemo(() => {
    let nextExpenses = [...(trip.expenses || [])];

    if (categoryFilter !== 'All') {
      nextExpenses = nextExpenses.filter((expense) => expense.category === categoryFilter);
    }

    nextExpenses.sort((first, second) => {
      if (sortBy === 'amount-desc') {
        return Number(second.amount || 0) - Number(first.amount || 0);
      }

      if (sortBy === 'amount-asc') {
        return Number(first.amount || 0) - Number(second.amount || 0);
      }

      if (sortBy === 'date-asc') {
        return new Date(first.date).getTime() - new Date(second.date).getTime();
      }

      return new Date(second.date).getTime() - new Date(first.date).getTime();
    });

    return nextExpenses;
  }, [categoryFilter, sortBy, trip.expenses]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const toggleParticipant = (participant) => {
    setForm((current) => {
      const exists = current.participantNames.includes(participant);
      return {
        ...current,
        participantNames: exists
          ? current.participantNames.filter((name) => name !== participant)
          : [...current.participantNames, participant]
      };
    });
  };

  const handleAddExpense = (event) => {
    event.preventDefault();

    const amount = Number(form.amount || 0);

    if (amount <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    if (!form.paidBy) {
      setFormError('Select who paid for this expense.');
      return;
    }

    if (!form.participantNames.length) {
      setFormError('Select at least one participant for the split.');
      return;
    }

    const splitAmount = amount / form.participantNames.length;
    const nextExpense = {
      amount,
      category: form.category,
      date: form.date,
      id: String(Date.now()),
      name: form.name.trim(),
      paidBy: form.paidBy,
      participants: form.participantNames,
      peopleCount: form.participantNames.length,
      splitAmount
    };

    onTripUpdate({
      ...trip,
      expenses: [nextExpense, ...(trip.expenses || [])]
    });
    setForm(createInitialForm(trip));
    setFormOpen(false);
    setFormError('');
  };

  const handleDeleteExpense = (expenseId) => {
    onTripUpdate({
      ...trip,
      expenses: (trip.expenses || []).filter((expense) => expense.id !== expenseId)
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trip Expenses</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900">Add expense to {trip.name}</h2>
            <p className="mt-2 text-sm text-slate-500">Track who paid, who joined, and how much each person owes.</p>
          </div>
          <button type="button" onClick={() => setFormOpen((current) => !current)} className="btn-primary btn-sm">
            Add Expense
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-slate-900">₹{summary.total.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Per Person Share</p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-emerald-700">₹{summary.totalPerPerson.toFixed(2)}</p>
          </div>
        </div>

        {formOpen ? (
          <form className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5" onSubmit={handleAddExpense}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="input-wrap">
                <span className="input-label">Expense Name</span>
                <input className="input" placeholder="Dinner, cab, hotel..." required value={form.name} onChange={handleChange('name')} />
              </label>

              <label className="input-wrap">
                <span className="input-label">Amount</span>
                <input className="input" min="0" required type="number" value={form.amount} onChange={handleChange('amount')} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="input-wrap">
                <span className="input-label">Category</span>
                <select className="input" value={form.category} onChange={handleChange('category')}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="input-wrap">
                <span className="input-label">Date</span>
                <input className="input" required type="date" value={form.date} onChange={handleChange('date')} />
              </label>

              <label className="input-wrap">
                <span className="input-label">Paid By</span>
                <select className="input" value={form.paidBy} onChange={handleChange('paidBy')}>
                  {trip.participants.map((participant) => (
                    <option key={participant} value={participant}>
                      {participant}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="input-label">Participants</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trip.participants.map((participant) => {
                  const active = form.participantNames.includes(participant);

                  return (
                    <button
                      key={participant}
                      type="button"
                      onClick={() => toggleParticipant(participant)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {participant}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            ) : null}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              {form.participantNames.length ? (
                <p>
                  Split preview: ₹
                  {(Number(form.amount || 0) / Math.max(form.participantNames.length, 1)).toFixed(2)}
                  {' '}per person across {form.participantNames.length} participant(s)
                </p>
              ) : (
                <p>Select participants to preview the split.</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-outline btn-sm" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Save Expense
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Expense List</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">Trip ledger</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="input-wrap">
              <span className="input-label">Filter</span>
              <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="All">All Categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-wrap">
              <span className="input-label">Sort</span>
              <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6">
          {visibleExpenses.length ? (
            <div className="space-y-3">
              {visibleExpenses.map((expense) => {
                const categoryMeta = getCategoryMeta(expense.category);

                return (
                  <article key={expense.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg shadow-sm ring-1 ring-slate-200">
                            {categoryMeta.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{expense.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryMeta.accent}`}>
                                {expense.category}
                              </span>
                              <span>{expense.peopleCount} people</span>
                              <span>{expense.date}</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-slate-500">Paid by {expense.paidBy}</p>
                        <p className="mt-2 text-sm text-slate-500">Participants: {expense.participants.join(', ')}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-heading text-xl font-bold text-slate-900">₹{Number(expense.amount).toFixed(2)}</p>
                        <p className="mt-2 text-sm text-slate-500">Total amount</p>
                        <p className="mt-3 font-heading text-lg font-extrabold text-emerald-700">
                          ₹{Number(expense.splitAmount || 0).toFixed(2)} per person
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="mt-3 rounded-lg px-2 py-1 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-900">No expenses added yet</p>
              <p className="mt-2 text-sm text-slate-500">Add your first expense to start splitting this trip.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category Overview</p>
          <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">Expense breakdown</h3>
        </div>
        <ExpenseChart data={chartData} />
      </section>
    </div>
  );
}

ExpenseTracker.propTypes = {
  onTripUpdate: PropTypes.func.isRequired,
  trip: PropTypes.shape({
    expenses: PropTypes.arrayOf(
      PropTypes.shape({
        amount: PropTypes.number,
        category: PropTypes.string,
        date: PropTypes.string,
        id: PropTypes.string,
        name: PropTypes.string,
        paidBy: PropTypes.string,
        participants: PropTypes.arrayOf(PropTypes.string),
        peopleCount: PropTypes.number,
        splitAmount: PropTypes.number
      })
    ),
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    participants: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
};
