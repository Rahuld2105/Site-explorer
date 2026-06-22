const TRIP_STORAGE_KEY = 'tourvision_trips';

export const TRIP_STATUSES = {
  PLANNED: 'Planned',
  ONGOING: 'Ongoing',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const STATUS_META = {
  [TRIP_STATUSES.PLANNED]: {
    accent: 'bg-sky-50 text-sky-700 ring-sky-100',
    label: 'Planned'
  },
  [TRIP_STATUSES.ONGOING]: {
    accent: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    label: 'Ongoing'
  },
  [TRIP_STATUSES.PAUSED]: {
    accent: 'bg-amber-50 text-amber-700 ring-amber-100',
    label: 'Paused'
  },
  [TRIP_STATUSES.COMPLETED]: {
    accent: 'bg-violet-50 text-violet-700 ring-violet-100',
    label: 'Completed'
  },
  [TRIP_STATUSES.CANCELLED]: {
    accent: 'bg-rose-50 text-rose-700 ring-rose-100',
    label: 'Cancelled'
  }
};

function uniqueList(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

export function normalizeTrip(trip) {
  const participants = uniqueList(trip?.participants || trip?.travelers || []);
  const destinations = uniqueList(trip?.destinations || []);
  const expenses = (trip?.expenses || []).filter((expense) => expense.status !== 'settled');
  const settledExpenses = trip?.settledExpenses || (trip?.expenses || []).filter((expense) => expense.status === 'settled');
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return {
    budget: Number(trip?.budget || trip?.totalBudget || 0),
    completedAt: trip?.completedAt || null,
    coverImage: trip?.coverImage || '',
    createdAt: trip?.createdAt || new Date().toISOString(),
    destinations,
    destinationDetails: trip?.destinationDetails || [],
    duration: trip?.duration || Math.max(destinations.length, 1),
    endDate: trip?.endDate || '',
    expenses,
    id: trip?.id || String(Date.now()),
    memories: trip?.memories || trip?.stories || [],
    name: trip?.name || 'Untitled Trip',
    participants,
    pausedAt: trip?.pausedAt || null,
    routeData: trip?.routeData || {
      currentStopIndex: 0,
      distanceKm: destinations.length ? destinations.length * 85 : 0,
      etaMinutes: destinations.length ? destinations.length * 95 : 0,
      progress: 0
    },
    settledExpenses,
    startDate: trip?.startDate || '',
    status: trip?.status || TRIP_STATUSES.PLANNED,
    startedAt: trip?.startedAt || null,
    transport: trip?.transport || 'car',
    totalBudget: Number(trip?.totalBudget || trip?.budget || 0),
    totalSpent,
    travelers: participants,
    updatedAt: trip?.updatedAt || trip?.createdAt || new Date().toISOString()
  };
}

export function readTripsFromStorage() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedTrips = window.localStorage.getItem(TRIP_STORAGE_KEY);
    return storedTrips ? JSON.parse(storedTrips).map(normalizeTrip) : [];
  } catch (error) {
    return [];
  }
}

export function writeTripsToStorage(trips) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify((trips || []).map(normalizeTrip)));
}

export function createTrip(name, participants, options = {}) {
  return normalizeTrip({
    budget: options.budget,
    coverImage: options.coverImage,
    destinations: options.destinations || [],
    destinationDetails: options.destinationDetails || [],
    duration: options.duration,
    endDate: options.endDate,
    expenses: [],
    id: String(Date.now()),
    name,
    participants,
    routeData: options.routeData,
    settledExpenses: [],
    status: TRIP_STATUSES.PLANNED,
    totalBudget: options.totalBudget || options.budget || 0,
    startDate: options.startDate,
    transport: options.transport
  });
}

export function calculateTripSummary(trip) {
  const normalizedTrip = normalizeTrip(trip);
  const participants = normalizedTrip.participants || [];
  const expenses = normalizedTrip.expenses || [];
  const settledExpenses = normalizedTrip.settledExpenses || [];
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

  settledExpenses.forEach((settlement) => {
    if (!settlement.from || !settlement.to) {
      return;
    }

    const amount = Number(settlement.amount || 0);
    balances[settlement.from] = Number(((balances[settlement.from] || 0) + amount).toFixed(2));
    balances[settlement.to] = Number(((balances[settlement.to] || 0) - amount).toFixed(2));
  });

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
    pendingSettlementTotal: settlements.reduce((sum, settlement) => sum + settlement.amount, 0),
    settledTotal: settledExpenses.reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0),
    settlements,
    total,
    totalPerPerson
  };
}

export function updateTripStatus(trip, status) {
  const updates = {
    ...normalizeTrip(trip),
    status,
    updatedAt: new Date().toISOString()
  };

  if (status === TRIP_STATUSES.COMPLETED) {
    updates.completedAt = new Date().toISOString();
    updates.routeData = {
      ...updates.routeData,
      progress: 100
    };
  }

  if (status === TRIP_STATUSES.ONGOING) {
    updates.startedAt = updates.startedAt || new Date().toISOString();
    updates.routeData = {
      ...updates.routeData,
      progress: Math.max(Number(updates.routeData?.progress || 0), 8)
    };
  }

  if (status === TRIP_STATUSES.PAUSED) {
    updates.pausedAt = new Date().toISOString();
  }

  return normalizeTrip(updates);
}
