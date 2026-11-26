import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { getReadings, getSettings, DEFAULT_SETTINGS } from '../storage';
import { formatDate, formatKwh, parseKey } from '../stats';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Newest first, grouped by month with a total per month.
const buildSections = (readings) => {
  const sections = [];
  Object.keys(readings)
    .sort()
    .reverse()
    .forEach((key) => {
      const month = key.slice(0, 7);
      let section = sections[sections.length - 1];
      if (!section || section.month !== month) {
        const d = parseKey(key);
        section = { month, title: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, total: 0, data: [] };
        sections.push(section);
      }
      section.total += readings[key];
      section.data.push(key);
    });
  return sections;
};

export default function HistoryScreen({ navigation }) {
  const [readings, setReadings] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      getReadings().then(setReadings);
      getSettings().then(setSettings);
    }, [])
  );

  const sections = buildSections(readings);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="History"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('AddReading')}>
            <Text style={styles.add}>+ Add</Text>
          </TouchableOpacity>
        }
      />
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={sections}
        keyExtractor={(key) => key}
        ListEmptyComponent={
          <Text style={styles.empty}>No readings yet. Tap “+ Add” to log your first day.</Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionTotal}>
              {formatKwh(section.total)} · {settings.currency}
              {(section.total * settings.rate).toFixed(2)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('AddReading', { date: item })}
          >
            <Text style={styles.rowDate}>{formatDate(item)}</Text>
            <Text style={styles.rowValue}>{formatKwh(readings[item])}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: 16, paddingBottom: 40 },
  add: { color: colors.sun, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 60, fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: colors.bg,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionTotal: { fontSize: 13, color: colors.green, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  rowDate: { color: colors.text, fontSize: 15 },
  rowValue: { color: colors.sunDark, fontSize: 15, fontWeight: '700' },
});
