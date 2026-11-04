import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HostView } from '../../engine/host';
import type { MemberView } from '../../engine/member';
import { formatMoney } from '../../engine/ledger';
import type { Expense, TripPing } from '../../engine/protocol';
import { AppButton } from './components/AppButton';
import { GlassCard } from './components/GlassCard';
import { IconChevronRight, IconCompass, IconPlus, IconRadio, IconWallet } from './components/Icons';
import { PageHeader } from './components/PageHeader';
import { Screen } from './components/Screen';
import { TabScreen } from './components/TabScreen';
import { useNearbyRoom } from './mesh/useNearbyRoom';
import { AddExpenseModal } from './screens/AddExpenseModal';
import { DebriefScreen } from './screens/DebriefScreen';
import {
  APP_ID,
  createHostBridge,
  createMemberBridge,
  meshSend,
  type HostBridge,
  type MemberBridge,
} from './session/bridge';
import { colors, radii, space, type } from './theme/tokens';
import { buildDebriefFromHost, buildDebriefFromMember } from './utils/debrief';

export type TripStart =
  | { kind: 'host'; title: string; currency: string }
  | { kind: 'join' };

type Props = {
  name: string;
  start: TripStart;
  onHome: () => void;
};

type Mode =
  | { k: 'host'; bridge: HostBridge }
  | { k: 'member'; bridge: MemberBridge }
  | { k: 'debrief'; summary: string };

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function TripSession({ name, start, onHome }: Props) {
  const safeInsets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode | null>(null);
  const [hostView, setHostView] = useState<HostView | null>(null);
  const [memberView, setMemberView] = useState<MemberView | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const bridgeRef = useRef<{ host?: HostBridge; member?: MemberBridge }>({});
  const roomStarted = useRef(false);
  const memberBridgeReady = useRef(false);
  const joinHostRef = useRef<string | null>(null);

  const room = useNearbyRoom({
    appId: APP_ID,
    onMessage: (from, data) => {
      bridgeRef.current.host?.onMessage(from, data);
      bridgeRef.current.member?.onMessage(from, data);
    },
    onPeerJoined: peer => {
      bridgeRef.current.host?.onPeerJoined(peer.id);
      bridgeRef.current.member?.onPeerJoined(peer.id);
    },
    onPeerLeft: peer => {
      bridgeRef.current.host?.onPeerLeft(peer.id);
      bridgeRef.current.member?.onPeerLeft(peer.id);
    },
  });

  joinHostRef.current = room.hostId;

  const me = () => ({ id: room.localId, name: name.trim() || 'Traveler' });

  useEffect(() => {
    const live =
      (hostView && hostView.phase !== 'closed') || (memberView && !memberView.closed);
    if (!live) return;
    try {
      activateKeepAwake();
    } catch {
      /* optional */
    }
    return () => {
      try {
        deactivateKeepAwake();
      } catch {
        /* ignore */
      }
    };
  }, [hostView, memberView]);

  useEffect(() => {
    if (roomStarted.current) return;
    roomStarted.current = true;
    if (start.kind === 'host') void room.host(start.title);
    else void room.discover();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per session; room hook object identity changes each render
  }, [start]);

  useEffect(() => {
    if (!room.localId) return;

    if (start.kind === 'host' && room.status === 'hosting' && !bridgeRef.current.host) {
      const send = meshSend(room.send);
      const bridge = createHostBridge(
        send,
        { title: start.title, currency: start.currency },
        me(),
        v => {
          setHostView(v);
          bump();
        },
        room.peers.map(p => p.id),
      );
      bridgeRef.current.host = bridge;
      setHostView(bridge.host.view);
      setMode({ k: 'host', bridge });
      return;
    }

    if (start.kind === 'join' && !memberBridgeReady.current) {
      memberBridgeReady.current = true;
      const send = meshSend(room.send);
      const bridge = createMemberBridge(
        send,
        me(),
        v => {
          setMemberView(v);
          bump();
          if (v.closed) {
            setMode({
              k: 'debrief',
              summary: buildDebriefFromMember(v, {}),
            });
          }
        },
        room.peers.map(p => p.id),
      );
      bridgeRef.current.member = bridge;
      bridge.member.requestJoin(name);
      setMemberView(bridge.member.view);
      setMode({ k: 'member', bridge });
    }
  }, [room.localId, start, name, bump, room.peers.length, room.send]);

  useEffect(() => {
    return () => {
      bridgeRef.current.host?.dispose();
    };
  }, []);

  const peerIds = room.peers.map(p => p.id).join(',');

  /** Mesh peer list + host choice → engine join retries until `assign`. */
  useEffect(() => {
    if (start.kind !== 'join') return;
    const bridge = bridgeRef.current.member;
    if (!bridge) return;
    if (memberView?.myMemberId) return;

    const hostId = room.hostId ?? room.peers.find(p => p.id !== room.localId)?.id;
    if (hostId && (room.status === 'joining' || room.status === 'connected')) {
      bridge.member.pickHost(hostId, name);
    }
    for (const p of room.peers) {
      bridge.onPeerJoined(p.id);
    }
  }, [start.kind, room.status, room.hostId, peerIds, name, memberView?.myMemberId, room.localId]);

  useEffect(() => {
    if (start.kind !== 'join' || memberView?.myMemberId) return;
    const retry = setInterval(() => {
      const bridge = bridgeRef.current.member;
      if (!bridge || bridge.member.view.myMemberId) return;
      const hostId = joinHostRef.current;
      if (hostId) bridge.member.pickHost(hostId, name);
    }, 4000);
    return () => clearInterval(retry);
  }, [start.kind, name, memberView?.myMemberId]);

  if (mode?.k === 'debrief') {
    return (
      <DebriefScreen
        summary={mode.summary}
        onDone={() => {
          void room.leave();
          onHome();
        }}
      />
    );
  }

  if (start.kind === 'join' && memberView?.myMemberId && memberView.phase === 'lobby') {
    return (
      <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
        <PageHeader
          title="Waiting for host"
          subtitle={`You are in ${memberView.title || 'the trip'}. The host will start splitting when everyone is ready.`}
        />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </Screen>
    );
  }

  const joinFlowActive =
    start.kind === 'join' &&
    (room.status === 'discovering' ||
      room.status === 'joining' ||
      (room.status === 'connected' && !memberView?.myMemberId));

  if (joinFlowActive) {
    if (room.status === 'connected' && !memberView?.myMemberId) {
      return (
        <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
          <PageHeader
            title="Syncing with host…"
            subtitle={
              room.error ||
              'Bluetooth link is up. Confirming your spot in the trip — usually a few seconds.'
            }
          />
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        </Screen>
      );
    }

    if (room.status === 'joining') {
      return (
        <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
          <PageHeader
            title="Joining trip…"
            subtitle={
              room.error ||
              'Requesting a seat from the host over Bluetooth. Keep both phones unlocked and nearby.'
            }
          />
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        </Screen>
      );
    }

    return (
      <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
        <PageHeader
          title="Nearby trips"
          subtitle={
            room.error ||
            'Looking for hosts over Bluetooth. Keep both phones unlocked — one phone must tap Host this trip first.'
          }
        />
        {room.hosts.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : null}
        {room.hosts.length === 0 ? (
          <GlassCard>
            <Text style={styles.sub}>
              No trips found yet. Ask your host to tap “Host this trip”.
            </Text>
          </GlassCard>
        ) : (
          room.hosts.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                const member = bridgeRef.current.member?.member;
                member?.pickHost(item.id, name);
                void room.join(item.id, name);
              }}
              style={styles.hostRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.hostName}>{item.name}</Text>
                <Text style={styles.hostMeta}>Tap to join</Text>
              </View>
              <IconChevronRight />
            </Pressable>
          ))
        )}
      </Screen>
    );
  }

  if (room.status === 'starting' || room.status === 'error') {
    return (
      <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
        <PageHeader
          title={room.status === 'error' ? 'Connection issue' : 'Starting mesh…'}
          subtitle={room.error || 'Enable Bluetooth and stay near your group.'}
        />
        {room.status === 'starting' ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <AppButton
            label="Try again"
            onPress={() => {
              roomStarted.current = false;
              memberBridgeReady.current = false;
              if (start.kind === 'host') void room.host(start.title);
              else void room.discover();
            }}
          />
        )}
      </Screen>
    );
  }

  const lobbyHostView = hostView ?? bridgeRef.current.host?.host.view ?? null;
  if (mode?.k === 'host' && lobbyHostView && lobbyHostView.phase === 'lobby') {
    const others = lobbyHostView.members.filter(m => m.id !== 'm0');
    return (
      <Screen
        scroll
        footer={
          <AppButton
            label="Start splitting"
            disabled={others.length < 1}
            onPress={() => {
              if (!bridgeRef.current.host?.host.startSplitting()) {
                Alert.alert('Not ready', 'Wait for at least one traveler to join.');
              }
            }}
          />
        }
      >
        <PageHeader
          title={lobbyHostView.meta.title}
          subtitle={`Lobby · ${lobbyHostView.meta.currency} · waiting for travelers`}
        />
        <GlassCard style={{ gap: space.sm }}>
          <Text style={styles.section}>Travelers</Text>
          {lobbyHostView.members.map(m => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={[styles.badge, m.connected ? styles.badgeOn : styles.badgeOff]}>
                {m.connected ? 'Nearby' : 'Away'}
              </Text>
            </View>
          ))}
        </GlassCard>
        <Text style={styles.hint}>Ask friends to tap “Find trips nearby” and join this trip.</Text>
        <AppButton label="Leave lobby" variant="ghost" onPress={onHome} />
      </Screen>
    );
  }

  const activeHost = mode?.k === 'host' && hostView && hostView.phase !== 'lobby';
  const activeMember =
    mode?.k === 'member' &&
    memberView &&
    memberView.myMemberId &&
    memberView.phase !== 'lobby' &&
    memberView.ledger != null;

  if (!activeHost && !activeMember) {
    let waitingLabel =
      start.kind === 'host'
        ? room.status === 'hosting'
          ? 'Opening trip lobby…'
          : 'Setting up your trip…'
        : 'Connecting…';
    if (
      start.kind === 'join' &&
      memberView?.myMemberId &&
      memberView.phase !== 'lobby' &&
      !memberView.ledger
    ) {
      waitingLabel = 'Syncing trip data…';
    }
    return (
      <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
        <PageHeader
          title={waitingLabel}
          subtitle={room.error || 'Enable Bluetooth and stay near your group.'}
        />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </Screen>
    );
  }

  const currency = activeHost ? hostView!.meta.currency : memberView!.currency;
  const members = activeHost
    ? hostView!.members.map(m => ({ id: m.id, name: m.name }))
    : memberView!.roster;
  const ledger = activeHost ? hostView!.ledger : memberView!.ledger!;
  const myMemberId = activeHost ? hostView!.hostMemberId : memberView!.myMemberId!;
  const pings = activeHost ? hostView!.pings : memberView!.pings;
  const tripTitle = activeHost ? hostView!.meta.title : memberView!.title;

  const onAddExpense = (expense: Expense) => {
    if (activeHost) {
      try {
        bridgeRef.current.host?.host.addExpense(expense);
      } catch (e) {
        Alert.alert('Could not add', e instanceof Error ? e.message : String(e));
      }
    } else {
      bridgeRef.current.member?.member.submitExpense(expense);
    }
  };

  const endTrip = () => {
    Alert.alert('End trip?', 'Everyone will see the debrief summary.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End trip',
        style: 'destructive',
        onPress: () => {
          if (activeHost) {
            const host = bridgeRef.current.host?.host;
            host?.endTrip();
            if (host?.view) setMode({ k: 'debrief', summary: buildDebriefFromHost(host.view) });
          } else {
            onHome();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sessionRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerTitle: tripTitle,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.bgElevated },
            headerTitleStyle: { ...type.subtitle, color: colors.text },
            sceneStyle: styles.tabScene,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.border,
              paddingTop: 6,
            },
            headerRightContainerStyle: { paddingRight: Math.max(safeInsets.right, space.sm) },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { ...type.caption, fontWeight: '600' },
          }}
        >
          <Tab.Screen
            name="Expenses"
            options={{
              tabBarIcon: ({ color }) => <IconWallet color={color} size={22} />,
              headerRight: () => (
                <Pressable
                  accessibilityLabel="Add expense"
                  onPress={() => setExpenseOpen(true)}
                  style={styles.headerBtn}
                >
                  <IconPlus color={colors.primary} size={22} />
                </Pressable>
              ),
            }}
          >
            {() => (
              <ExpensesTab
                expenses={ledger.expenses}
                members={members}
                currency={currency}
                onAdd={() => setExpenseOpen(true)}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Settle"
            options={{ tabBarIcon: ({ color }) => <IconCompass color={color} size={22} /> }}
          >
            {() => (
              <SettleTab ledger={ledger} members={members} currency={currency} myMemberId={myMemberId} />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Trip"
            options={{ tabBarIcon: ({ color }) => <IconRadio color={color} size={22} /> }}
          >
            {() => (
              <TripPingTab
                pings={pings}
                isHost={!!activeHost}
                onPing={(kind, text) => bridgeRef.current.host?.host.sendPing(kind, text)}
                onEnd={endTrip}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      <AddExpenseModal
        visible={expenseOpen}
        members={members}
        currency={currency}
        myMemberId={myMemberId}
        onClose={() => setExpenseOpen(false)}
        onSave={onAddExpense}
      />
    </View>
  );
}

function ExpensesTab({
  expenses,
  members,
  currency,
  onAdd,
}: {
  expenses: Expense[];
  members: { id: string; name: string }[];
  currency: string;
  onAdd: () => void;
}) {
  const nameOf = (id: string) => members.find(m => m.id === id)?.name ?? id;
  return (
    <TabScreen scroll footer={<AppButton label="Add expense" onPress={onAdd} />}>
      {expenses.length === 0 ? (
        <GlassCard>
          <Text style={styles.sub}>No expenses yet. Add the first one — everyone syncs over mesh.</Text>
        </GlassCard>
      ) : (
        expenses
          .slice()
          .reverse()
          .map(e => (
            <GlassCard key={e.id} style={styles.expenseCard}>
              <View style={styles.expenseTop}>
                <Text style={styles.expenseLabel} numberOfLines={2}>
                  {e.label}
                </Text>
                <Text style={styles.expenseAmount}>{formatMoney(e.amountCents, currency)}</Text>
              </View>
              <Text style={styles.expenseMeta}>
                Paid by {nameOf(e.payerId)} · split {e.participantIds.length} ways
              </Text>
            </GlassCard>
          ))
      )}
    </TabScreen>
  );
}

function SettleTab({
  ledger,
  members,
  currency,
  myMemberId,
}: {
  ledger: HostView['ledger'];
  members: { id: string; name: string }[];
  currency: string;
  myMemberId: string;
}) {
  const nameOf = (id: string) => members.find(m => m.id === id)?.name ?? id;
  const mine = ledger.balances[myMemberId] ?? 0;
  return (
    <TabScreen scroll>
      <GlassCard elevated style={styles.balanceHero}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: mine >= 0 ? colors.credit : colors.debt },
          ]}
        >
          {mine >= 0 ? '+' : '−'}
          {formatMoney(Math.abs(mine), currency)}
        </Text>
        <Text style={styles.sub}>{mine >= 0 ? 'You are owed overall' : 'You owe overall'}</Text>
      </GlassCard>
      <Text style={styles.section}>Suggested payments</Text>
      {ledger.settlements.length === 0 ? (
        <GlassCard>
          <Text style={styles.sub}>All settled up — no payments needed.</Text>
        </GlassCard>
      ) : (
        ledger.settlements.map((s, i) => (
          <GlassCard key={`${s.from}-${s.to}-${i}`}>
            <Text style={styles.settleLine}>
              {nameOf(s.from)} → {nameOf(s.to)}
            </Text>
            <Text style={styles.settleAmount}>{formatMoney(s.amountCents, currency)}</Text>
          </GlassCard>
        ))
      )}
    </TabScreen>
  );
}

function TripPingTab({
  pings,
  isHost,
  onPing,
  onEnd,
}: {
  pings: TripPing[];
  isHost: boolean;
  onPing: (kind: TripPing['kind'], text: string) => void;
  onEnd: () => void;
}) {
  const presets: { kind: TripPing['kind']; label: string; text: string }[] = [
    { kind: 'food', label: 'Food stop', text: 'Stopping for food' },
    { kind: 'meet', label: 'Meet up', text: 'Meet at the lobby' },
    { kind: 'late', label: 'Running late', text: 'Running 10 min late' },
  ];
  return (
    <TabScreen
      scroll
      footer={isHost ? <AppButton label="End trip" variant="danger" onPress={onEnd} /> : undefined}
    >
      {isHost ? (
        <View style={styles.pingGrid}>
          {presets.map(p => (
            <AppButton
              key={p.kind}
              label={p.label}
              variant="ghost"
              onPress={() => onPing(p.kind, p.text)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.sub}>Trip pings from your host appear here — not a chat app.</Text>
      )}
      {pings.map(p => (
        <GlassCard key={p.id}>
          <Text style={styles.pingKind}>{p.kind.toUpperCase()}</Text>
          <Text style={styles.pingText}>{p.text}</Text>
        </GlassCard>
      ))}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  sessionRoot: { flex: 1, backgroundColor: colors.bg },
  tabScene: { backgroundColor: colors.bg },
  spinner: { alignSelf: 'center', marginVertical: space.lg },
  sub: { ...type.body, color: colors.textSecondary },
  section: { ...type.label, color: colors.textSecondary, marginVertical: space.sm },
  hint: { ...type.caption, color: colors.textMuted, marginTop: space.md },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    padding: space.md,
    borderRadius: radii.lg,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hostName: { ...type.subtitle, color: colors.text },
  hostMeta: { ...type.caption, color: colors.textMuted },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { ...type.body, color: colors.text },
  badge: { ...type.caption, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  badgeOn: { backgroundColor: 'rgba(5,150,105,0.12)', color: colors.success },
  badgeOff: { backgroundColor: colors.border, color: colors.textMuted },
  headerBtn: { marginRight: space.md, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  expenseCard: { marginBottom: space.sm, gap: space.xs },
  expenseTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  expenseLabel: { ...type.subtitle, color: colors.text, flex: 1 },
  expenseAmount: { ...type.subtitle, fontSize: 18, color: colors.text, fontWeight: '700' },
  expenseMeta: { ...type.caption, color: colors.textMuted },
  balanceHero: { alignItems: 'center', marginBottom: space.lg },
  balanceLabel: { ...type.label, color: colors.textSecondary },
  balanceValue: { ...type.hero, marginVertical: space.sm },
  settleLine: { ...type.body, color: colors.text },
  settleAmount: { ...type.subtitle, color: colors.cta, marginTop: space.xs },
  pingGrid: { gap: space.sm, marginBottom: space.lg },
  pingKind: { ...type.caption, color: colors.textMuted },
  pingText: { ...type.subtitle, color: colors.text, marginTop: 4 },
});
