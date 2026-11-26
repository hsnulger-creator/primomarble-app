import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import {
  getSettings, saveSettings, getReadings, mergeReadings, clearAll,
  getAccount, saveAccount, removeAccount,
} from '../storage';
import { createClient, hashPassword } from '../smartess';
import { syncNow } from '../sync';
import { parseKwh, toCsv, parseCsv } from '../stats';

export default function SettingsScreen({ navigation }) {
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState('');
  const [csv, setCsv] = useState('');
  const [account, setAccount] = useState(null);
  const [usr, setUsr] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setRate(String(s.rate));
      setCurrency(s.currency);
    });
    getAccount().then(setAccount);
  }, []);

  const handleSave = async () => {
    const value = parseKwh(rate);
    if (value === null) return Alert.alert('Check the rate', 'Enter a price per kWh, e.g. 0.30');
    await saveSettings({ rate: value, currency: currency.trim() });
    Alert.alert('Saved', 'Savings now use the new rate.');
  };

  const handleConnect = async () => {
    if (!usr.trim() || !password) return Alert.alert('SmartESS', 'Enter your SmartESS username and password.');
    setBusy(true);
    try {
      const link = { usr: usr.trim(), pwdHash: hashPassword(password) };
      await createClient(link).login(); // throws when the login is refused
      await saveAccount(link);
      setPassword('');
      setAccount((await syncNow()) || link);
    } catch (e) {
      Alert.alert('Could not connect', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    await removeAccount();
    setAccount(null);
  };

  const handleExport = async () => {
    const readings = await getReadings();
    if (Object.keys(readings).length === 0) return Alert.alert('Nothing to export', 'No readings logged yet.');
    await Share.share({ title: 'Solar Log readings', message: toCsv(readings) });
  };

  const handleImport = async () => {
    const { rows, skipped } = parseCsv(csv);
    const count = Object.keys(rows).length;
    if (count === 0) return Alert.alert('Nothing imported', 'No lines looked like “2026-06-21,18.4”.');
    await mergeReadings(rows);
    setCsv('');
    Alert.alert('Imported', `${count} reading${count === 1 ? '' : 's'} added or updated.` +
      (skipped ? ` ${skipped} line${skipped === 1 ? '' : 's'} skipped.` : ''));
  };

  const handleClear = () => {
    Alert.alert('Erase everything', 'This deletes all readings, notes and settings from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Savings estimate</Text>
          <Text style={styles.label}>Electricity price per kWh</Text>
          <TextInput
            style={styles.input}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="0.30"
          />
          <Text style={styles.label}>Currency symbol</Text>
          <TextInput
            style={styles.input}
            value={currency}
            onChangeText={setCurrency}
            maxLength={4}
            placeholder="$"
          />
          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>SmartESS automatic sync</Text>
          {account ? (
            <>
              <Text style={styles.help}>
                Connected as {account.usr}. Today's production is read from your inverter whenever
                you open the app.
              </Text>
              {!!account.lastError && <Text style={styles.error}>{account.lastError}</Text>}
              <TouchableOpacity style={styles.buttonOutline} onPress={handleDisconnect}>
                <Text style={styles.buttonOutlineText}>Disconnect</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.help}>
                Sign in with the same account you use in the SmartESS app. The password itself is
                not stored on this phone.
              </Text>
              <TextInput
                style={styles.input}
                value={usr}
                onChangeText={setUsr}
                placeholder="SmartESS username"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="SmartESS password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.button} onPress={handleConnect} disabled={busy}>
                <Text style={styles.buttonText}>{busy ? 'Connecting…' : 'Connect'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Back up</Text>
          <Text style={styles.help}>
            Share all readings as CSV text, for example to email or a notes app.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleExport}>
            <Text style={styles.buttonText}>Export readings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import readings</Text>
          <Text style={styles.help}>
            Paste lines of “date,kWh” — from a backup or your inverter's export. Existing days are
            replaced.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={csv}
            onChangeText={setCsv}
            placeholder={'2026-06-20,17.9\n2026-06-21,18.4'}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Import</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.danger} onPress={handleClear}>
          <Text style={styles.dangerText}>Erase all data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  body: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  help: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.sun,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonOutlineText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  danger: { paddingVertical: 14, alignItems: 'center' },
  dangerText: { color: colors.red, fontSize: 15, fontWeight: '600' },
});
