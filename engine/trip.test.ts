import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyExpenseToBalances,
  balancesSumToZero,
  greedySettlements,
  newTripId,
  recomputeLedger,
  validateExpense,
} from './ledger.ts';
import { TripHost } from './host.ts';
import { TripMember } from './member.ts';
import type { MemberView } from './member.ts';
import type { Expense, Me, Msg, Send, TripMeta } from './protocol.ts';

class Router {
  private deliver = new Map<string, (from: string, msg: Msg) => void>();

  register(peerId: string, handler: (from: string, msg: Msg) => void) {
    this.deliver.set(peerId, handler);
  }

  send(from: string, to: string, msg: Msg) {
    this.deliver.get(to)?.(from, msg);
  }

  net(peerId: string): Send {
    return {
      send: (to, msg) => this.send(peerId, to, msg),
    };
  }
}

describe('ledger', () => {
  it('two members, two expenses — balances sum to zero', () => {
    const members = [
      { id: 'm0', peerId: 'h', name: 'A', connected: true },
      { id: 'm1', peerId: 'b', name: 'B', connected: true },
    ];
    const expenses: Expense[] = [
      {
        id: 'e1',
        label: 'Dinner',
        amountCents: 6000,
        payerId: 'm0',
        participantIds: ['m0', 'm1'],
        createdAt: 1,
        createdBy: 'm0',
      },
      {
        id: 'e2',
        label: 'Gas',
        amountCents: 4000,
        payerId: 'm1',
        participantIds: ['m0', 'm1'],
        createdAt: 2,
        createdBy: 'm1',
      },
    ];
    const ledger = recomputeLedger(members, expenses, 1);
    assert.equal(balancesSumToZero(ledger.balances), true);
    assert.equal(ledger.balances.m0, 1000);
    assert.equal(ledger.balances.m1, -1000);
    assert.ok(ledger.settlements.length >= 1);
  });

  it('golden 3-person settlement', () => {
    const balances = { a: 5000, b: -2000, c: -3000 };
    const s = greedySettlements(balances);
    assert.deepEqual(s, [
      { from: 'c', to: 'a', amountCents: 3000 },
      { from: 'b', to: 'a', amountCents: 2000 },
    ]);
  });

  it('remainder goes to payer on odd split', () => {
    const balances = applyExpenseToBalances(
      { m0: 0, m1: 0, m2: 0 },
      {
        id: 'e',
        label: 'Tea',
        amountCents: 100,
        payerId: 'm0',
        participantIds: ['m0', 'm1', 'm2'],
        createdAt: 0,
        createdBy: 'm0',
      },
    );
    assert.equal(balancesSumToZero(balances), true);
    assert.equal(balances.m0, 100 - 34);
  });

  it('rejects invalid expense', () => {
    const members = [{ id: 'm0', peerId: 'x', name: 'A', connected: true }];
    const err = validateExpense(
      {
        id: 'e',
        label: '',
        amountCents: 0,
        payerId: 'm0',
        participantIds: ['m0'],
        createdAt: 0,
        createdBy: 'm0',
      },
      members,
      'active',
    );
    assert.ok(err);
  });
});

describe('host/member protocol', () => {
  const meta: TripMeta = {
    id: newTripId(),
    title: 'Road trip',
    currency: 'USD',
    createdAt: Date.now(),
  };
  const hostMe: Me = { id: 'host-peer', name: 'Alex' };
  const memberMe: Me = { id: 'member-peer', name: 'Sam' };

  it('join assigns member and ledger version bumps', () => {
    const router = new Router();
    let hostViewRevision = 0;
    const host = new TripHost(router.net(hostMe.id), meta, hostMe, v => {
      hostViewRevision = v.revision;
    });
    let memberView: MemberView | null = null;
    const member = new TripMember(router.net(memberMe.id), memberMe, v => {
      memberView = v;
    });
    router.register(hostMe.id, (from, msg) => host.message(from, msg));
    router.register(memberMe.id, (from, msg) => member.message(from, msg));

    host.peerUp(memberMe.id);
    member.pickHost(hostMe.id, 'Sam');

    assert.equal(member.view.myMemberId, 'm1');
    assert.ok((member.view.ledger?.version ?? 0) >= 0);
    assert.equal(member.view.roster.length, 2);
    assert.equal(member.view.roster.find(r => r.id === 'm0')?.name, 'Alex');
    assert.equal(member.view.roster.find(r => r.id === 'm1')?.name, 'Sam');

    host.startSplitting();
    const vBefore = host.view.ledger.version;
    host.addExpense({
      label: 'Lunch',
      amountCents: 2000,
      payerId: 'm0',
      participantIds: ['m0', 'm1'],
      createdBy: 'm0',
    });
    assert.ok(host.view.ledger.version > vBefore);
    assert.ok(hostViewRevision > 0);
  });

  it('closed notifies member', () => {
    const router = new Router();
    const host = new TripHost(router.net(hostMe.id), meta, hostMe, () => {});
    const member = new TripMember(router.net(memberMe.id), memberMe, () => {});
    router.register(hostMe.id, (from, msg) => host.message(from, msg));
    router.register(memberMe.id, (from, msg) => member.message(from, msg));
    host.peerUp(memberMe.id);
    host.endTrip();
    assert.equal(member.view.closed, true);
  });
});
