import { formatMoney } from '../../../engine/ledger';
import type { HostView } from '../../../engine/host';
import type { MemberView } from '../../../engine/member';

export function buildDebriefFromHost(view: HostView): string {
  const lines: string[] = [
    `Trip Tab — ${view.meta.title}`,
    `Currency: ${view.meta.currency}`,
    '',
    'Balances',
  ];
  for (const m of view.members) {
    const cents = view.ledger.balances[m.id] ?? 0;
    const label = cents >= 0 ? 'is owed' : 'owes';
    lines.push(`• ${m.name}: ${formatMoney(Math.abs(cents), view.meta.currency)} ${label}`);
  }
  lines.push('', 'Suggested settlements');
  if (view.ledger.settlements.length === 0) {
    lines.push('• All settled up');
  } else {
    for (const s of view.ledger.settlements) {
      const from = view.members.find(m => m.id === s.from)?.name ?? s.from;
      const to = view.members.find(m => m.id === s.to)?.name ?? s.to;
      lines.push(
        `• ${from} pays ${to} ${formatMoney(s.amountCents, view.meta.currency)}`,
      );
    }
  }
  lines.push('', 'Expenses');
  for (const e of view.ledger.expenses) {
    lines.push(`• ${e.label}: ${formatMoney(e.amountCents, view.meta.currency)}`);
  }
  lines.push('', '— Split the trip without signal.');
  return lines.join('\n');
}

export function buildDebriefFromMember(view: MemberView, names: Record<string, string>): string {
  if (!view.ledger) return `Trip Tab — ${view.title}\nNo ledger data.`;
  const lines: string[] = [`Trip Tab — ${view.title}`, '', 'Suggested settlements'];
  if (view.ledger.settlements.length === 0) lines.push('• All settled up');
  else {
    for (const s of view.ledger.settlements) {
      const from = names[s.from] ?? s.from;
      const to = names[s.to] ?? s.to;
      lines.push(`• ${from} pays ${to} ${formatMoney(s.amountCents, view.currency)}`);
    }
  }
  return lines.join('\n');
}
