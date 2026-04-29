/**
 * Placeholder saved places route so saved navigation no longer points at expenses.
 */
export default function SavedPage() {
  return (
    <div className="section-sm">
      <div className="container">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Saved Places</p>
          <h1 className="mt-3 font-heading text-[2rem] font-extrabold text-slate-900">Saved stays separate</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your saved places will appear here. Expense data no longer shows up in this section.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="font-semibold text-slate-900">No saved places yet</p>
            <p className="mt-2 text-sm text-slate-500">Start exploring nearby places and save a few favorites for later.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
