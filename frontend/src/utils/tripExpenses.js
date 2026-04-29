const TRIP_STORAGE_KEY = 'tourvision_trips';

export function readTripsFromStorage() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedTrips = window.localStorage.getItem(TRIP_STORAGE_KEY);
    return storedTrips ? JSON.parse(storedTrips) : [];
  } catch (error) {
    return [];
  }
}

export function writeTripsToStorage(trips) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trips));
}

export function createTrip(name, participants) {
  return {
    expenses: [],
    id: String(Date.now()),
    name,
    participants
  };
}

export function calculateTripSummary(trip) {
  const participants = trip?.participants || [];
  const expenses = trip?.expenses || [];
  const paidTotals = {};
  const owedTotals = {};

  participants.forEach((participant) => {
    paidTotals[participant] = 0;
    owedTotals[participant] = 0;
  });

  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0);
    const paidBy = expense.paidBy;
    const selectedParticipants = expense.participants?.length ? expense.participants : participants;
    const peopleCount = Math.max(selectedParticipants.length || Number(expense.peopleCount || 0), 1);
    const splitAmount = Number(expense.splitAmount || amount / peopleCount);

    if (paidBy) {
      paidTotals[paidBy] = (paidTotals[paidBy] || 0) + amount;
    }

    selectedParticipants.forEach((participant) => {
      owedTotals[participant] = (owedTotals[participant] || 0) + splitAmount;
    });
  });

  const balances = participants.reduce((accumulator, participant) => {
    accumulator[participant] = Number((paidTotals[participant] - owedTotals[participant]).toFixed(2));
    return accumulator;
  }, {});

  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance > 0.01)
    .map(([name, balance]) => ({ amount: balance, name }))
    .sort((first, second) => second.amount - first.amount);

  const debtors = Object.entries(balances)
    .filter(([, balance]) => balance < -0.01)
    .map(([name, balance]) => ({ amount: Math.abs(balance), name }))
    .sort((first, second) => second.amount - first.amount);

  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const settlementAmount = Number(Math.min(creditor.amount, debtor.amount).toFixed(2));

    if (settlementAmount > 0) {
      settlements.push({
        amount: settlementAmount,
        from: debtor.name,
        to: creditor.name
      });
    }

    creditor.amount = Number((creditor.amount - settlementAmount).toFixed(2));
    debtor.amount = Number((debtor.amount - settlementAmount).toFixed(2));

    if (creditor.amount <= 0.01) {
      creditorIndex += 1;
    }

    if (debtor.amount <= 0.01) {
      debtorIndex += 1;
    }
  }

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const totalPerPerson = expenses.reduce((sum, expense) => {
    const peopleCount = Math.max(Number(expense.peopleCount || expense.participants?.length || 1), 1);
    return sum + Number(expense.amount || 0) / peopleCount;
  }, 0);

  return {
    balances,
    owedTotals,
    paidTotals,
    settlements,
    total,
    totalPerPerson
  };
}
