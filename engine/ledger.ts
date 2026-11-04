import type { Expense, LedgerSnapshot, Member, Settlement } from './protocol.ts';

export function assertCents(value: number, label = 'amount'): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer cent value`);
  }
}

export function emptyLedger(): LedgerSnapshot {
  return { version: 0, balances: {}, settlements: [], expenses: [], memberNames: {} };
}

/** Equal split; remainder cents go to the payer so balances sum to zero. */
export function applyExpenseToBalances(
  balances: Record<string, number>,
  expense: Expense,
): Record<string, number> {
  assertCents(expense.amountCents);
  const participants = [...new Set(expense.participantIds)];
  if (participants.length === 0) throw new Error('expense needs at least one participant');
  if (!participants.includes(expense.payerId)) {
    throw new Error('payer must be among participants');
  }

  const next = { ...balances };
  for (const id of participants) {
    next[id] = next[id] ?? 0;
  }
  next[expense.payerId] = (next[expense.payerId] ?? 0) + expense.amountCents;

  const n = participants.length;
  const base = Math.floor(expense.amountCents / n);
  let remainder = expense.amountCents - base * n;

  for (const id of participants) {
    let share = base;
    if (id === expense.payerId && remainder > 0) {
      share += remainder;
      remainder = 0;
    }
    next[id] = (next[id] ?? 0) - share;
  }

  return next;
}

export function recomputeLedger(
  members: Member[],
  expenses: Expense[],
  version: number,
): LedgerSnapshot {
  const balances: Record<string, number> = {};
  for (const m of members) balances[m.id] = 0;
  let working = balances;
  for (const expense of expenses) {
    working = applyExpenseToBalances(working, expense);
  }
  const memberNames: Record<string, string> = {};
  for (const m of members) memberNames[m.id] = m.name;

  return {
    version,
    balances: working,
    settlements: greedySettlements(working),
    expenses: [...expenses],
    memberNames,
  };
}

/** Greedy min-cash-flow matching largest debtor to largest creditor. */
export function greedySettlements(balances: Record<string, number>): Settlement[] {
  type Node = { id: string; cents: number };
  const debtors: Node[] = [];
  const creditors: Node[] = [];

  for (const [id, cents] of Object.entries(balances)) {
    if (cents < 0) debtors.push({ id, cents: -cents });
    else if (cents > 0) creditors.push({ id, cents });
  }

  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      out.push({ from: debtors[i].id, to: creditors[j].id, amountCents: pay });
    }
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return out;
}

export function balancesSumToZero(balances: Record<string, number>): boolean {
  const total = Object.values(balances).reduce((a, b) => a + b, 0);
  return total === 0;
}

export function validateExpense(
  expense: Expense,
  members: Member[],
  phase: 'lobby' | 'active' | 'closed',
): string | null {
  if (phase !== 'active') return 'Trip is not accepting expenses';
  if (!expense.label.trim()) return 'Expense needs a label';
  if (!Number.isSafeInteger(expense.amountCents) || expense.amountCents <= 0) {
    return 'Amount must be a positive integer number of cents';
  }
  const memberIds = new Set(members.map(m => m.id));
  if (!memberIds.has(expense.payerId)) return 'Unknown payer';
  const participants = [...new Set(expense.participantIds)];
  if (participants.length === 0) return 'Select at least one participant';
  for (const id of participants) {
    if (!memberIds.has(id)) return 'Unknown participant';
  }
  if (!participants.includes(expense.payerId)) return 'Payer must be included in the split';
  return null;
}

export function formatMoney(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export function nextMemberId(members: Member[]): string {
  const used = new Set(members.map(m => m.id));
  for (let i = 0; i < MAX_MEMBER_SLOTS; i++) {
    const id = `m${i}`;
    if (!used.has(id)) return id;
  }
  throw new Error('No member slots left');
}

const MAX_MEMBER_SLOTS = 8;

export function newExpenseId(): string {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newTripId(): string {
  return `trip-${Date.now().toString(36)}`;
}

export function newPingId(): string {
  return `ping-${Date.now().toString(36)}`;
}
