import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { AppTextField } from '../components/AppTextField';
import { CurrencyChips } from '../components/CurrencyChips';
import { GlassCard } from '../components/GlassCard';
import { HeroHeader } from '../components/HeroHeader';
import { IconRadio, IconUsers, IconWallet } from '../components/Icons';
import { Screen } from '../components/Screen';
import { colors, space, type } from '../theme/tokens';

export type HomeAction =
  | { kind: 'host'; title: string; currency: string }
  | { kind: 'join' };

type Props = {
  name: string;
  setName: (v: string) => void;
  onAction: (action: HomeAction) => void;
};

export function HomeScreen({ name, setName, onAction }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('Weekend getaway');
  const [currency, setCurrency] = useState('USD');
  const ready = name.trim().length > 0;

  const bodyPad = {
    paddingLeft: space.lg + insets.left,
    paddingRight: space.lg + insets.right,
  };

  return (
    <Screen
      scroll
      statusBar="light"
      edgeToEdgeTop
      header={
        <HeroHeader
          bleedUnderStatusBar
          kicker="OFFLINE · BLUETOOTH MESH"
          title={'Group expenses\nwithout internet.'}
          subtitle="One phone hosts the trip. Everyone nearby adds costs and sees who owes whom."
        />
      }
    >
      <View style={[styles.body, bodyPad]}>
      <GlassCard style={styles.card}>
        <AppTextField
          label="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
          placeholder="How your group will see you"
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.iconWrap, styles.iconPrimary]}>
            <IconWallet color={colors.primary} size={22} />
          </View>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardTitle}>Start a trip</Text>
            <Text style={styles.cardHint}>You become the host on this phone</Text>
          </View>
        </View>
        <AppTextField label="Trip name" value={title} onChangeText={setTitle} placeholder="Beach week, ski trip…" />
        <Text style={styles.fieldLabel}>Currency</Text>
        <CurrencyChips value={currency} onChange={setCurrency} />
        <AppButton
          label="Host this trip"
          disabled={!ready}
          onPress={() => onAction({ kind: 'host', title, currency: currency || 'USD' })}
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.iconWrap, styles.iconAccent]}>
            <IconRadio color={colors.cta} size={22} />
          </View>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardTitle}>Join nearby</Text>
            <Text style={styles.cardHint}>Pick a trip broadcasting over Bluetooth</Text>
          </View>
        </View>
        <AppButton
          label="Find trips nearby"
          variant="secondary"
          disabled={!ready}
          onPress={() => onAction({ kind: 'join' })}
        />
      </GlassCard>

      <View style={styles.trust}>
        <IconUsers size={18} color={colors.textMuted} />
        <Text style={styles.trustText}>No account · No cloud · 2–8 travelers</Text>
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, marginTop: space.md },
  card: { gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrimary: { backgroundColor: 'rgba(37,99,235,0.1)' },
  iconAccent: { backgroundColor: 'rgba(249,115,22,0.12)' },
  cardHeadText: { flex: 1, gap: 2 },
  cardTitle: { ...type.subtitle, color: colors.text },
  cardHint: { ...type.caption, color: colors.textMuted },
  fieldLabel: { ...type.label, color: colors.text, marginTop: -space.xs },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
    paddingBottom: space.xxl,
  },
  trustText: { ...type.caption, color: colors.textMuted },
});
