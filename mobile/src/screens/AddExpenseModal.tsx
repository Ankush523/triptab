import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { newExpenseId } from '../../../engine/ledger';
import type { Expense, Member } from '../../../engine/protocol';
import { AppButton } from '../components/AppButton';
import { AppTextField } from '../components/AppTextField';
import { colors, radii, space, type } from '../theme/tokens';

type Props = {
  visible: boolean;
  members: Pick<Member, 'id' | 'name'>[];
  currency: string;
  myMemberId: string;
  onClose: () => void;
  onSave: (expense: Expense) => void;
};

export function AddExpenseModal({
  visible,
  members,
  currency,
  myMemberId,
  onClose,
  onSave,
}: Props) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(myMemberId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(members.map(m => m.id)));
  const [error, setError] = useState<string | null>(null);

  const participantIds = useMemo(() => [...selected], [selected]);

  const memberIds = useMemo(() => members.map(m => m.id).join(','), [members]);

  useEffect(() => {
    if (!visible) return;
    setPayerId(myMemberId);
    setSelected(new Set(members.map(m => m.id)));
    setError(null);
  }, [visible, myMemberId, memberIds, members]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    const parsed = parseMoneyToCents(amount);
    if (parsed == null) {
      setError('Enter a valid amount (e.g. 12.50)');
      return;
    }
    if (!label.trim()) {
      setError('Add a short description');
      return;
    }
    if (participantIds.length === 0) {
      setError('Select at least one person');
      return;
    }
    if (!participantIds.includes(payerId)) {
      setError('Payer must be included in the split');
      return;
    }
    setError(null);
    onSave({
      id: newExpenseId(),
      label: label.trim(),
      amountCents: parsed,
      payerId,
      participantIds,
      createdAt: Date.now(),
      createdBy: myMemberId,
    });
    setLabel('');
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet} edges={['top', 'left', 'right']}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add expense</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <AppTextField label="Description" value={label} onChangeText={setLabel} placeholder="Dinner, gas, tickets…" />
          <AppTextField
            label={`Amount (${currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Text style={styles.section}>Paid by</Text>
          {members.map(m => (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: payerId === m.id }}
              onPress={() => setPayerId(m.id)}
              style={[styles.chip, payerId === m.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, payerId === m.id && styles.chipTextActive]}>{m.name}</Text>
            </Pressable>
          ))}
          <Text style={styles.section}>Split between</Text>
          {members.map(m => (
            <Pressable
              key={`split-${m.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected.has(m.id) }}
              onPress={() => toggle(m.id)}
              style={[styles.chip, selected.has(m.id) && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected.has(m.id) && styles.chipTextActive]}>{m.name}</Text>
            </Pressable>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.actionsSafe}>
          <View style={styles.actions}>
            <AppButton label="Save expense" onPress={save} />
            <AppButton label="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}

function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  scroll: { flex: 1, minHeight: 0 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginTop: space.sm,
    marginBottom: space.md,
  },
  title: { ...type.title, color: colors.text, marginBottom: space.md },
  form: { gap: space.md, paddingBottom: space.lg },
  section: { ...type.label, color: colors.textSecondary, marginTop: space.sm },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    marginBottom: space.sm,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.1)' },
  chipText: { ...type.body, color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  error: { ...type.caption, color: colors.danger },
  actionsSafe: { backgroundColor: colors.bg },
  actions: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.sm },
});
