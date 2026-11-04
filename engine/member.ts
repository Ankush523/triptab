import type {
  Expense,
  LedgerSnapshot,
  Me,
  Msg,
  Phase,
  Send,
  TripPing,
} from './protocol.ts';

export type MemberRosterEntry = { id: string; name: string };

export type MemberView = {
  title: string;
  currency: string;
  phase: Phase;
  memberCount: number;
  myMemberId: string | null;
  myName: string | null;
  /** Everyone in the trip (from host ledger snapshots). */
  roster: MemberRosterEntry[];
  ledger: LedgerSnapshot | null;
  pings: TripPing[];
  full: boolean;
  closed: boolean;
  rejectReason: string | null;
  revision: number;
};

export class TripMember {
  view!: MemberView;
  private revision = 0;
  private title = '';
  private currency = 'USD';
  private phase: Phase = 'lobby';
  private memberCount = 0;
  private myMemberId: string | null = null;
  private myName: string | null = null;
  private ledger: LedgerSnapshot | null = null;
  private pings: TripPing[] = [];
  private full = false;
  private closed = false;
  private rejectReason: string | null = null;
  private readonly peers = new Set<string>();
  /** Mesh peer id of the trip host — only this peer gets `{ t: 'join' }`. */
  private hostPeerId: string | null = null;
  private readonly net: Send;
  private readonly me: Me;
  private readonly onChange: (view: MemberView) => void;

  constructor(
    net: Send,
    me: Me,
    onChange: (view: MemberView) => void,
    peers: Iterable<string> = [],
  ) {
    this.net = net;
    this.me = me;
    this.onChange = onChange;
    this.push();
    for (const p of peers) this.peerUp(p);
  }

  peerUp(id: string) {
    if (id === this.me.id) return;
    const isNew = !this.peers.has(id);
    this.peers.add(id);
    if (!isNew) return;
    if (id === this.hostPeerId) {
      this.net.send(id, { t: 'hello' });
      if (this.myName) this.net.send(id, { t: 'join', name: this.myName });
    } else {
      this.net.send(id, { t: 'hello' });
    }
    this.push();
  }

  peerDown(_id: string) {
    this.push();
  }

  setDisplayName(name: string) {
    this.myName = name.trim().slice(0, 24) || 'Traveler';
    this.sendJoinToHost();
    this.push();
  }

  message(_from: string, m: Msg) {
    switch (m.t) {
      case 'trip':
        this.title = m.title;
        this.currency = m.currency;
        this.memberCount = m.members;
        this.phase = m.phase;
        this.push();
        return;
      case 'assign':
        this.myMemberId = m.memberId;
        this.myName = m.name;
        this.full = false;
        this.push();
        return;
      case 'ledger':
        if (!this.ledger || m.snapshot.version >= this.ledger.version) {
          this.ledger = {
            ...m.snapshot,
            memberNames: m.snapshot.memberNames ?? {},
          };
        }
        this.push();
        return;
      case 'expense_add':
        if (this.ledger && m.expense) {
          this.applyExpenseEcho(m.expense);
        }
        this.push();
        return;
      case 'expense_remove':
        if (this.ledger) {
          this.ledger = {
            ...this.ledger,
            expenses: this.ledger.expenses.filter(e => e.id !== m.expenseId),
          };
        }
        this.push();
        return;
      case 'ping':
        this.pings = [m.ping, ...this.pings].slice(0, 50);
        this.push();
        return;
      case 'full':
        this.full = true;
        this.push();
        return;
      case 'reject':
        this.rejectReason = m.reason;
        this.push();
        return;
      case 'closed':
        this.closed = true;
        this.phase = 'closed';
        this.push();
        return;
      default:
        return;
    }
  }

  requestJoin(name: string) {
    this.setDisplayName(name);
  }

  /** User chose a host in discovery — start the app-level join immediately (mesh may queue until linked). */
  pickHost(hostPeerId: string, displayName: string) {
    this.myName = displayName.trim().slice(0, 24) || 'Traveler';
    if (hostPeerId && hostPeerId !== this.me.id) {
      this.hostPeerId = hostPeerId;
      this.peers.add(hostPeerId);
      this.net.send(hostPeerId, { t: 'hello' });
      this.sendJoinToHost();
    }
    this.push();
  }

  private sendJoinToHost() {
    if (!this.myName || !this.hostPeerId || this.hostPeerId === this.me.id) return;
    this.net.send(this.hostPeerId, { t: 'join', name: this.myName });
  }

  submitExpense(expense: Expense) {
    const to = this.hostPeerId ?? [...this.peers][0];
    if (to) this.net.send(to, { t: 'expense_add', expense });
  }

  private applyExpenseEcho(expense: Expense) {
    if (!this.ledger) return;
    if (this.ledger.expenses.some(e => e.id === expense.id)) return;
    this.ledger = {
      ...this.ledger,
      expenses: [...this.ledger.expenses, expense],
    };
  }

  private buildRoster(): MemberRosterEntry[] {
    const names = this.ledger?.memberNames ?? {};
    const ids = new Set<string>();
    if (this.ledger) {
      for (const id of Object.keys(this.ledger.balances)) ids.add(id);
    }
    if (this.myMemberId) ids.add(this.myMemberId);
    return [...ids]
      .sort()
      .map(id => ({
        id,
        name:
          id === this.myMemberId
            ? this.myName?.trim() || names[id] || 'You'
            : names[id]?.trim() || id,
      }));
  }

  private push() {
    this.revision++;
    this.view = {
      title: this.title,
      currency: this.currency,
      phase: this.phase,
      memberCount: this.memberCount,
      myMemberId: this.myMemberId,
      myName: this.myName,
      roster: this.buildRoster(),
      ledger: this.ledger,
      pings: [...this.pings],
      full: this.full,
      closed: this.closed,
      rejectReason: this.rejectReason,
      revision: this.revision,
    };
    this.onChange(this.view);
  }
}
