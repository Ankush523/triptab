import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppTextField } from '../components/AppTextField';
import { GlassCard } from '../components/GlassCard';
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

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'];

export function HomeScreen({ name, setName, onAction }: Props) {
  const [title, setTitle] = useState('Weekend getaway');
  const [currency, setCurrency] = useState('USD');

  return (
    <Screen scroll hero>
      <View style={styles.heroText}>
        <Text style={styles.kicker}>Trip Tab</Text>
        <Text style={styles.headline}>Group expenses{'\n'}without internet.</Text>
        <Text style={styles.sub}>
          One phone hosts the trip. Everyone nearby adds costs and sees who owes whom — over
          Bluetooth mesh.
        </Text>
      </View>

      <GlassCard style={styles.card}>
        <AppTextField
          label="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <IconWallet color={colors.primary} />
          <Text style={styles.cardTitle}>Start a trip</Text>
        </View>
        <AppTextField label="Trip name" value={title} onChangeText={setTitle} />
        <AppTextField
          label="Currency (ISO)"
          value={currency}
          onChangeText={v => setCurrency(v.toUpperCase().slice(0, 3))}
          autoCapitalize="characters"
          hint={`Common: ${CURRENCIES.join(', ')}`}
        />
        <AppButton
          label="Host this trip"
          disabled={!name.trim()}
          onPress={() => onAction({ kind: 'host', title, currency: currency || 'USD' })}
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <IconRadio color={colors.cta} />
          <Text style={styles.cardTitle}>Join nearby</Text>
        </View>
        <Text style={styles.cardBody}>
          Turn on Bluetooth and pick a trip hosted by someone in your group.
        </Text>
        <AppButton
          label="Find trips nearby"
          variant="secondary"
          disabled={!name.trim()}
          onPress={() => onAction({ kind: 'join' })}
        />
      </GlassCard>

      <View style={styles.trust}>
        <IconUsers size={18} color={colors.textMuted} />
        <Text style={styles.trustText}>No account · No cloud · 2–8 travelers</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: { marginBottom: space.lg, gap: space.sm, paddingTop: 96 },
  kicker: { ...type.label, color: 'rgba(255,255,255,0.85)' },
  headline: { ...type.hero, color: '#FFFFFF' },
  sub: { ...type.body, color: 'rgba(255,255,255,0.88)', maxWidth: 340 },
  card: { marginBottom: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...type.subtitle, color: colors.text },
  cardBody: { ...type.body, color: colors.textSecondary },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  trustText: { ...type.caption, color: colors.textMuted },
});
