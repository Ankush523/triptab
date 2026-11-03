import type {
  Expense,
  LedgerSnapshot,
  Me,
  Msg,
  Phase,
  Send,
  TripPing,
} from './protocol.ts';

export type MemberView = {
  title: string;
  currency: string;
  phase: Phase;
  memberCount: number;
  myMemberId: string | null;
  myName: string | null;
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
    this.peers.add(id);
    this.net.send(id, { t: 'hello' });
    if (this.myName) this.net.send(id, { t: 'join', name: this.myName });
    this.push();
  }

  peerDown(_id: string) {
    this.push();
  }

  setDisplayName(name: string) {
    this.myName = name.trim().slice(0, 24) || 'Traveler';
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'join', name: this.myName });
    }
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
        if (!this.ledger || m.snapshot.version > this.ledger.version) {
          this.ledger = m.snapshot;
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

  submitExpense(expense: Expense) {
    for (const peer of this.peers) {
      this.net.send(peer, { t: 'expense_add', expense });
    }
  }

  private applyExpenseEcho(expense: Expense) {
    if (!this.ledger) return;
    if (this.ledger.expenses.some(e => e.id === expense.id)) return;
    this.ledger = {
      ...this.ledger,
      expenses: [...this.ledger.expenses, expense],
    };
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
