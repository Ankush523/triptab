import React from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { GlassCard } from '../components/GlassCard';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { colors, space, type } from '../theme/tokens';

type Props = {
  summary: string;
  onDone: () => void;
};

export function DebriefScreen({ summary, onDone }: Props) {
  return (
    <Screen
      scroll
      footer={
        <View style={styles.footerActions}>
          <AppButton
            label="Share summary"
            onPress={() => Share.share({ message: summary, title: 'Trip Tab summary' })}
          />
          <AppButton label="Back to home" variant="ghost" onPress={onDone} />
        </View>
      }
    >
      <PageHeader
        title="Trip complete"
        subtitle="Share this breakdown with your group — no signal required."
      />
      <GlassCard>
        <Text style={styles.mono} selectable>
          {summary}
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mono: { ...type.body, color: colors.text },
  footerActions: { gap: space.sm },
});
