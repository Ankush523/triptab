export type Phase = 'lobby' | 'active' | 'closed';

export type TripMeta = {
  id: string;
  title: string;
  currency: string;
  createdAt: number;
};

export type Member = {
  id: string;
  peerId: string;
  name: string;
  connected: boolean;
};

export type Expense = {
  id: string;
  label: string;
  amountCents: number;
  payerId: string;
  participantIds: string[];
  createdAt: number;
  createdBy: string;
};

export type Settlement = {
  from: string;
  to: string;
  amountCents: number;
};

export type LedgerSnapshot = {
  version: number;
  balances: Record<string, number>;
  settlements: Settlement[];
  expenses: Expense[];
  /** Display names for every member id in `balances` (synced from host). */
  memberNames: Record<string, string>;
};

export type TripPing = {
  id: string;
  kind: 'food' | 'meet' | 'late' | 'custom';
  text: string;
  at: number;
};

export type Msg =
  | { t: 'trip'; title: string; currency: string; members: number; phase: Phase }
  | { t: 'hello' }
  | { t: 'join'; name: string }
  | { t: 'full' }
  | { t: 'reject'; reason: string }
  | { t: 'assign'; memberId: string; name: string }
  | { t: 'ledger'; snapshot: LedgerSnapshot }
  | { t: 'expense_add'; expense: Expense }
  | { t: 'expense_remove'; expenseId: string }
  | { t: 'ping'; ping: TripPing }
  | { t: 'closed' };

export type Me = { id: string; name: string };

export interface Send {
  send(to: string, msg: Msg): void;
}

export const MAX_MEMBERS = 8;
export const MIN_MEMBERS_TO_START = 1;
