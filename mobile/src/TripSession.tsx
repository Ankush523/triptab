import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { HostView } from '../../engine/host';
import type { MemberView } from '../../engine/member';
import { formatMoney } from '../../engine/ledger';
import type { Expense, TripPing } from '../../engine/protocol';
import { AppButton } from './components/AppButton';
import { GlassCard } from './components/GlassCard';
import { IconChevronRight, IconCompass, IconPlus, IconRadio, IconWallet } from './components/Icons';
import { Screen } from './components/Screen';
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
  const [mode, setMode] = useState<Mode | null>(null);
  const [hostView, setHostView] = useState<HostView | null>(null);
  const [memberView, setMemberView] = useState<MemberView | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const bridgeRef = useRef<{ host?: HostBridge; member?: MemberBridge }>({});
  const roomStarted = useRef(false);
  const memberBridgeReady = useRef(false);

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
  }, [room, start]);

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
      setMode({ k: 'member', bridge });
    }
  }, [room.localId, room.status, room.peers.length, start, name, bump]);

  useEffect(() => {
    return () => {
      bridgeRef.current.host?.dispose();
      void room.leave();
    };
  }, [room]);

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

  if (start.kind === 'join' && (room.status === 'discovering' || room.status === 'joining')) {
    if (room.status === 'joining' || memberView?.myMemberId) {
      if (memberView?.myMemberId && memberView.phase === 'lobby') {
        return (
          <Screen scroll>
            <Text style={styles.title}>Waiting for host</Text>
            <Text style={styles.sub}>
              You are in {memberView.title || 'the trip'}. The host will start splitting when
              everyone is ready.
            </Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: space.lg }} />
          </Screen>
        );
      }
    } else {
      return (
        <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
          <Text style={styles.title}>Nearby trips</Text>
          <Text style={styles.sub}>
            {room.error || 'Looking for hosts over Bluetooth… Move closer if nothing appears.'}
          </Text>
          <ActivityIndicator color={colors.primary} style={{ marginVertical: space.lg }} />
          <FlatList
            data={room.hosts}
            keyExtractor={h => h.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <GlassCard>
                <Text style={styles.sub}>No trips found yet. Ask your host to tap “Host this trip”.</Text>
              </GlassCard>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => void room.join(item.id, name)}
                style={styles.hostRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostName}>{item.name}</Text>
                  <Text style={styles.hostMeta}>Tap to join</Text>
                </View>
                <IconChevronRight />
              </Pressable>
            )}
          />
        </Screen>
      );
    }
  }

  if (room.status === 'starting' || room.status === 'error') {
    return (
      <Screen scroll footer={<AppButton label="Cancel" variant="ghost" onPress={onHome} />}>
        <Text style={styles.title}>
          {room.status === 'error' ? 'Connection issue' : 'Starting mesh…'}
        </Text>
        <Text style={styles.sub}>
          {room.error || 'Enable Bluetooth and stay near your group.'}
        </Text>
        {room.status === 'starting' ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: space.lg }} />
        ) : (
          <AppButton
            label="Try again"
            style={{ marginTop: space.lg }}
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

  if (mode?.k === 'host' && hostView && hostView.phase === 'lobby') {
    const others = hostView.members.filter(m => m.id !== 'm0');
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
        <Text style={styles.title}>{hostView.meta.title}</Text>
        <Text style={styles.sub}>Lobby · {hostView.meta.currency} · mesh id {APP_ID}</Text>
        <GlassCard style={{ gap: space.sm }}>
          <Text style={styles.section}>Travelers</Text>
          {hostView.members.map(m => (
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
    mode?.k === 'member' && memberView && memberView.myMemberId && memberView.phase !== 'lobby';

  if (!activeHost && !activeMember) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const currency = activeHost ? hostView!.meta.currency : memberView!.currency;
  const members = activeHost
    ? hostView!.members
    : memberView!.ledger
      ? inferMembers(memberView!)
      : [];
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
    <>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerTitle: tripTitle,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.bgElevated },
            tabBarStyle: {
              backgroundColor: colors.bgElevated,
              borderTopColor: colors.border,
              height: 62,
              paddingBottom: 8,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { ...type.caption },
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
    </>
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
    <Screen scroll footer={<AppButton label="Add expense" onPress={onAdd} />}>
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
              <Text style={styles.expenseLabel}>{e.label}</Text>
              <Text style={styles.expenseAmount}>{formatMoney(e.amountCents, currency)}</Text>
              <Text style={styles.expenseMeta}>
                Paid by {nameOf(e.payerId)} · split {e.participantIds.length} ways
              </Text>
            </GlassCard>
          ))
      )}
    </Screen>
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
    <Screen scroll>
      <GlassCard style={styles.balanceHero}>
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
    </Screen>
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
    <Screen
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
    </Screen>
  );
}

function inferMembers(view: MemberView) {
  const ids = new Set<string>();
  view.ledger?.expenses.forEach(e => {
    ids.add(e.payerId);
    e.participantIds.forEach(id => ids.add(id));
  });
  if (view.myMemberId) ids.add(view.myMemberId);
  return [...ids].map(id => ({ id, name: id === view.myMemberId ? view.myName ?? 'You' : id }));
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text, marginTop: space.lg },
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
  expenseCard: { marginBottom: space.sm },
  expenseLabel: { ...type.subtitle, color: colors.text },
  expenseAmount: { ...type.money, color: colors.primary, marginVertical: space.xs },
  expenseMeta: { ...type.caption, color: colors.textMuted },
  balanceHero: { alignItems: 'center', marginBottom: space.lg },
  balanceLabel: { ...type.label, color: colors.textSecondary },
  balanceValue: { ...type.hero, marginVertical: space.sm },
  settleLine: { ...type.body, color: colors.text },
  settleAmount: { ...type.subtitle, color: colors.primary, marginTop: space.xs },
  pingGrid: { gap: space.sm, marginBottom: space.lg },
  pingKind: { ...type.caption, color: colors.textMuted },
  pingText: { ...type.subtitle, color: colors.text, marginTop: 4 },
});
