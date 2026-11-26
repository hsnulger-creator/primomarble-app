import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const HEIGHT = 140;

// Plain-View bar chart: data is [{ key, value, label }].
export default function BarChart({ data, highlightKey }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (max === 0) {
    return (
      <View style={[styles.empty, { height: HEIGHT }]}>
        <Text style={styles.emptyText}>No readings in this period yet</Text>
      </View>
    );
  }
  // With many bars, only label every few so the text stays readable.
  const labelEvery = data.length > 16 ? 5 : 1;
  return (
    <View>
      <Text style={styles.max}>Peak {Math.round(max * 10) / 10} kWh</Text>
      <View style={[styles.bars, { height: HEIGHT }]}>
        {data.map((d) => (
          <View key={d.key} style={styles.column}>
            <View
              style={[
                styles.bar,
                { height: Math.max((d.value / max) * HEIGHT, d.value > 0 ? 3 : 1) },
                d.value === 0 && styles.barEmpty,
                d.key === highlightKey && styles.barHighlight,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <View key={d.key} style={styles.column}>
            <Text style={styles.label} numberOfLines={1}>
              {(data.length - 1 - i) % labelEvery === 0 ? d.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '70%',
    backgroundColor: colors.sun,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barEmpty: { backgroundColor: colors.border },
  barHighlight: { backgroundColor: colors.sunDark },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 10, color: colors.muted },
  max: { fontSize: 11, color: colors.muted, marginBottom: 6, textAlign: 'right' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: 13 },
});
