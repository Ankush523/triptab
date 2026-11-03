import {
  newExpenseId,
  newPingId,
  recomputeLedger,
  validateExpense,
} from './ledger.ts';
import {
  MAX_MEMBERS,
  MIN_MEMBERS_TO_START,
  type Expense,
  type LedgerSnapshot,
  type Me,
  type Member,
  type Msg,
  type Phase,
  type Send,
  type TripMeta,
  type TripPing,
} from './protocol.ts';

export type HostView = {
  meta: TripMeta;
  phase: Phase;
  members: Member[];
  ledger: LedgerSnapshot;
  pings: TripPing[];
  hostMemberId: string;
  revision: number;
};

const cleanName = (x: unknown) =>
  (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, 24) : '') || 'Traveler';

export class TripHost {
  view!: HostView;
  readonly meta: TripMeta;
  private revision = 0;
  private readonly peers = new Set<string>();
  private ledgerVersion = 0;
  private expenses: Expense[] = [];
  private pings: TripPing[] = [];
  private phase: Phase = 'lobby';
  private members: Member[] = [];
  private readonly net: Send;
  private readonly me: Me;
  private readonly onChange: (view: HostView) => void;

  constructor(
    net: Send,
    meta: TripMeta,
    me: Me,
    onChange: (view: HostView) => void,
    peers: Iterable<string> = [],
  ) {
    this.net = net;
    this.meta = meta;
    this.me = me;
    this.onChange = onChange;
    this.members = [
      {
        id: 'm0',
        peerId: me.id,
        name: cleanName(me.name),
        connected: true,
      },
    ];
    this.push();
    for (const p of peers) this.peerUp(p);
  }

  get hostMemberId(): string {
    return 'm0';
  }

  peerUp(id: string) {
    if (id === this.me.id) return;
    this.peers.add(id);
    const member = this.members.find(m => m.peerId === id);
    if (member) {
      this.members = this.members.map(m =>
        m.peerId === id ? { ...m, connected: true } : m,
      );
      this.push();
      this.sendLedger(id);
      return;
    }
    this.net.send(id, this.tripMsg());
  }

  peerDown(id: string) {
    this.peers.delete(id);
    const member = this.members.find(m => m.peerId === id);
    if (!member) return;
    this.members = this.members.map(m =>
      m.peerId === id ? { ...m, connected: false } : m,
    );
    this.push();
  }

  message(from: string, m: Msg) {
    switch (m.t) {
      case 'hello':
        this.net.send(from, this.tripMsg());
        return;
      case 'join': {
        const existing = this.members.find(mem => mem.peerId === from);
        if (existing) {
          this.members = this.members.map(mem =>
            mem.peerId === from
              ? { ...mem, connected: true, name: cleanName(m.name) }
              : mem,
          );
          this.net.send(from, { t: 'assign', memberId: existing.id, name: existing.name });
          this.sendLedger(from);
          return this.push();
        }
        if (this.phase !== 'lobby') {
          this.net.send(from, { t: 'full' });
          return;
        }
        if (this.members.length >= MAX_MEMBERS) {
          this.net.send(from, { t: 'full' });
          return;
        }
        const memberId = `m${this.members.length}`;
        const name = cleanName(m.name);
        const member: Member = { id: memberId, peerId: from, name, connected: true };
        this.members = [...this.members, member];
        this.net.send(from, { t: 'assign', memberId, name });
        this.broadcastTrip();
        this.broadcastLedger();
        return this.push();
      }
      case 'expense_add': {
        const err = validateExpense(m.expense, this.members, this.phase);
        if (err) {
          this.net.send(from, { t: 'reject', reason: err });
          return;
        }
        this.addExpenseInternal(m.expense, from);
        return;
      }
      default:
        return;
    }
  }

  startSplitting(): boolean {
    if (this.phase !== 'lobby') return false;
    const others = this.members.filter(m => m.id !== 'm0').length;
    if (others < MIN_MEMBERS_TO_START) return false;
    this.phase = 'active';
    this.broadcastTrip();
    this.broadcastLedger();
    this.push();
    return true;
  }

  addExpense(input: Omit<Expense, 'id' | 'createdAt'> & { id?: string }) {
    const expense: Expense = {
      id: input.id ?? newExpenseId(),
      createdAt: Date.now(),
      label: input.label.trim(),
      amountCents: input.amountCents,
      payerId: input.payerId,
      participantIds: input.participantIds,
      createdBy: input.createdBy,
    };
    const err = validateExpense(expense, this.members, this.phase);
    if (err) throw new Error(err);
    this.addExpenseInternal(expense, this.me.id);
  }

  removeExpense(expenseId: string) {
    if (this.phase === 'closed') return;
    const next = this.expenses.filter(e => e.id !== expenseId);
    if (next.length === this.expenses.length) return;
    this.expenses = next;
    this.bumpLedger();
  }

  sendPing(kind: TripPing['kind'], text: string) {
    if (this.phase === 'closed') return;
    const ping: TripPing = {
      id: newPingId(),
      kind,
      text: text.trim().slice(0, 120),
      at: Date.now(),
    };
    this.pings = [ping, ...this.pings].slice(0, 50);
    this.push();
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'ping', ping });
    }
  }

  endTrip() {
    if (this.phase === 'closed') return;
    this.phase = 'closed';
    this.push();
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'closed' });
    }
  }

  stop() {
    /* lifecycle hook for bridge */
  }

  private addExpenseInternal(expense: Expense, _from: string) {
    this.expenses = [...this.expenses, expense];
    this.bumpLedger();
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'expense_add', expense });
    }
  }

  private bumpLedger() {
    this.ledgerVersion++;
    this.broadcastLedger();
    this.push();
  }

  private ledger(): LedgerSnapshot {
    return recomputeLedger(this.members, this.expenses, this.ledgerVersion);
  }

  private sendLedger(to: string) {
    this.net.send(to, { t: 'ledger', snapshot: this.ledger() });
  }

  private broadcastLedger() {
    const snapshot = this.ledger();
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'ledger', snapshot });
    }
  }

  private tripMsg(): Msg {
    return {
      t: 'trip',
      title: this.meta.title,
      currency: this.meta.currency,
      members: this.members.length,
      phase: this.phase,
    };
  }

  private broadcastTrip() {
    const msg = this.tripMsg();
    for (const peer of this.peers) {
      this.net.send(peer, msg);
    }
  }

  private push() {
    this.revision++;
    this.view = {
      meta: this.meta,
      phase: this.phase,
      members: [...this.members],
      ledger: this.ledger(),
      pings: [...this.pings],
      hostMemberId: this.hostMemberId,
      revision: this.revision,
    };
    this.onChange(this.view);
  }
}
