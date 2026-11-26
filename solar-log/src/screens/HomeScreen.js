import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import BarChart from '../components/BarChart';
import { colors } from '../theme';
import { getReadings, getSettings, getAccount, DEFAULT_SETTINGS } from '../storage';
import { syncNow, AUTO_SYNC_MS } from '../sync';
import {
  summary, dailySeries, monthlySeries, todayKey, formatKwh, formatDate,
} from '../stats';

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '12m', label: '12 months' },
];

export default function HomeScreen({ navigation }) {
  const [readings, setReadings] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [range, setRange] = useState('7d');
  const [account, setAccount] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const runSync = useCallback(async () => {
    setSyncing(true);
    const updated = await syncNow();
    setAccount(updated);
    setReadings(await getReadings());
    setSyncing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getReadings(), getSettings(), getAccount()]).then(([r, s, a]) => {
        if (!active) return;
        setReadings(r);
        setSettings(s);
        setAccount(a);
        // Refresh from the inverter when the last sync is getting old.
        if (a && Date.now() - (a.lastSync || 0) > AUTO_SYNC_MS) runSync();
      });
      return () => {
        active = false;
      };
    }, [runSync])
  );

  const syncTime = account && account.lastSync
    ? new Date(account.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const today = todayKey();
  const stats = summary(readings, today);
  const money = (kwh) => `${settings.currency}${(kwh * settings.rate).toFixed(2)}`;
  const series =
    range === '7d' ? dailySeries(readings, today, 7)
      : range === '30d' ? dailySeries(readings, today, 30)
        : monthlySeries(readings, today, 12);

  const tiles = [
    { label: 'Last 7 days', kwh: stats.last7 },
    { label: 'This month', kwh: stats.month },
    { label: 'This year', kwh: stats.year },
    { label: 'Lifetime', kwh: stats.lifetime },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>☀️ Solar Log</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings">
          <Text style={styles.headerIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>Today · {formatDate(today)}</Text>
          {stats.today === null ? (
            <Text style={styles.todayEmpty}>Not logged yet</Text>
          ) : (
            <>
              <Text style={styles.todayValue}>{formatKwh(stats.today)}</Text>
              <Text style={styles.todaySaved}>Saved about {money(stats.today)}</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddReading', { date: today })}
          >
            <Text style={styles.primaryButtonText}>
              {stats.today === null ? "Log today's reading" : "Edit today's reading"}
            </Text>
          </TouchableOpacity>
          {account && (
            <View style={styles.syncRow}>
              <Text style={[styles.syncText, !!account.lastError && !syncing && styles.syncError]} numberOfLines={2}>
                {syncing
                  ? 'Syncing with SmartESS…'
                  : account.lastError || (syncTime ? `SmartESS synced ${syncTime}` : 'SmartESS not synced yet')}
              </Text>
              {!syncing && (
                <TouchableOpacity onPress={runSync}>
                  <Text style={styles.syncButton}>Sync now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileValue}>{formatKwh(t.kwh)}</Text>
              <Text style={styles.tileMoney}>{money(t.kwh)} saved</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Production</Text>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.rangeChip, range === r.id && styles.rangeChipActive]}
                onPress={() => setRange(r.id)}
              >
                <Text style={[styles.rangeText, range === r.id && styles.rangeTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <BarChart data={series} highlightKey={range === '12m' ? today.slice(0, 7) : today} />
        </View>

        {stats.daysLogged > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>At a glance</Text>
            <Text style={styles.fact}>Days logged: {stats.daysLogged}</Text>
            <Text style={styles.fact}>Daily average: {formatKwh(stats.average)}</Text>
            <Text style={styles.fact}>
              Best day: {formatKwh(readings[stats.bestDay])} on {formatDate(stats.bestDay)}
            </Text>
          </View>
        )}

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Maintenance')}>
            <Text style={styles.navIcon}>🔧</Text>
            <Text style={styles.navText}>Maintenance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerIcon: { fontSize: 22 },
  content: { backgroundColor: colors.bg, padding: 16, paddingBottom: 40, flexGrow: 1 },
  todayCard: { backgroundColor: colors.navy, borderRadius: 16, padding: 20, marginBottom: 12 },
  todayLabel: { color: '#cbd5e1', fontSize: 13 },
  todayValue: { color: colors.sun, fontSize: 40, fontWeight: '800', marginTop: 6 },
  todaySaved: { color: '#cbd5e1', fontSize: 14, marginTop: 2 },
  todayEmpty: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 },
  primaryButton: {
    backgroundColor: colors.sun,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  syncText: { flex: 1, color: '#94a3b8', fontSize: 12, marginRight: 10 },
  syncError: { color: '#fca5a5' },
  syncButton: { color: colors.sun, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  tileLabel: { color: colors.muted, fontSize: 12 },
  tileValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  tileMoney: { color: colors.green, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  rangeRow: { flexDirection: 'row', marginBottom: 8 },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg,
    marginRight: 8,
  },
  rangeChipActive: { backgroundColor: colors.navy },
  rangeText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  rangeTextActive: { color: '#fff' },
  fact: { color: colors.text, fontSize: 14, marginBottom: 4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navButton: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  navIcon: { fontSize: 26 },
  navText: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
});
