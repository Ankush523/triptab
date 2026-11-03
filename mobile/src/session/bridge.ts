import type { HostView } from '../../../engine/host';
import { TripHost } from '../../../engine/host';
import { TripMember, type MemberView } from '../../../engine/member';
import { newTripId } from '../../../engine/ledger';
import type { Me, Msg, Send, TripMeta } from '../../../engine/protocol';

export const APP_ID = 'triptab';

export function wireMsg(data: unknown): Msg | null {
  if (!data || typeof data !== 'object') return null;
  const m = data as Msg;
  return typeof m.t === 'string' ? m : null;
}

export function meshSend(
  send: (peerId: string, data: unknown) => Promise<void>,
): Send {
  return {
    send(to, msg) {
      void send(to, msg).catch(err => console.warn('[triptab] send failed', msg.t, err));
    },
  };
}

export type HostBridge = {
  host: TripHost;
  onMessage: (from: string, data: unknown) => void;
  onPeerJoined: (peerId: string) => void;
  onPeerLeft: (peerId: string) => void;
  dispose: () => void;
};

export function createHostBridge(
  send: Send,
  trip: { title: string; currency: string },
  me: Me,
  onChange: (view: HostView) => void,
  peerIds: string[] = [],
): HostBridge {
  const meta: TripMeta = {
    id: newTripId(),
    title: trip.title.trim(),
    currency: trip.currency,
    createdAt: Date.now(),
  };
  const host = new TripHost(send, meta, me, onChange, peerIds);
  return {
    host,
    onMessage(from, data) {
      const msg = wireMsg(data);
      if (msg) host.message(from, msg);
    },
    onPeerJoined(peerId) {
      host.peerUp(peerId);
    },
    onPeerLeft(peerId) {
      host.peerDown(peerId);
    },
    dispose() {
      host.stop();
    },
  };
}

export type MemberBridge = {
  member: TripMember;
  onMessage: (from: string, data: unknown) => void;
  onPeerJoined: (peerId: string) => void;
  onPeerLeft: (peerId: string) => void;
};

export function createMemberBridge(
  send: Send,
  me: Me,
  onChange: (view: MemberView) => void,
  peerIds: string[] = [],
): MemberBridge {
  const member = new TripMember(send, me, onChange, peerIds);
  return {
    member,
    onMessage(from, data) {
      const msg = wireMsg(data);
      if (msg) member.message(from, msg);
    },
    onPeerJoined(peerId) {
      member.peerUp(peerId);
    },
    onPeerLeft(peerId) {
      member.peerDown(peerId);
    },
  };
}
