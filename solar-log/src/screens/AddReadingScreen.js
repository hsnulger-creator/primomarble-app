import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { getReadings, setReading, deleteReading } from '../storage';
import { todayKey, addDays, isValidKey, formatDate, parseKwh } from '../stats';

export default function AddReadingScreen({ navigation, route }) {
  const [date, setDate] = useState(route.params?.date || todayKey());
  const [kwh, setKwh] = useState('');
  const [readings, setReadings] = useState({});

  useEffect(() => {
    getReadings().then(setReadings);
  }, []);

  const dateOk = isValidKey(date);
  const existing = dateOk && date in readings ? readings[date] : null;

  // Show the saved value whenever the selected date changes.
  useEffect(() => {
    setKwh(existing === null ? '' : String(existing));
  }, [date, existing]);

  const shift = (n) => {
    const next = addDays(dateOk ? date : todayKey(), n);
    if (next <= todayKey()) setDate(next);
  };

  const handleSave = async () => {
    const value = parseKwh(kwh);
    if (!dateOk) return Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
    if (date > todayKey()) return Alert.alert('Check the date', 'That date is in the future.');
    if (value === null) return Alert.alert('Check the reading', 'Enter the kWh produced, e.g. 18.4');
    await setReading(date, value);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete reading', `Remove the reading for ${formatDate(date)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReading(date);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Daily reading" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.stepButton} onPress={() => shift(-1)} accessibilityLabel="Previous day">
            <Text style={styles.stepText}>‹</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.stepButton} onPress={() => shift(1)} accessibilityLabel="Next day">
            <Text style={styles.stepText}>›</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>{dateOk ? formatDate(date) : 'Use the format YYYY-MM-DD'}</Text>

        <Text style={styles.label}>Energy produced (kWh)</Text>
        <TextInput
          style={styles.input}
          value={kwh}
          onChangeText={setKwh}
          placeholder="e.g. 18.4"
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>
          {existing === null
            ? "Use the day's total from your inverter display or app."
            : 'A reading is already saved for this day. Saving replaces it.'}
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save reading</Text>
        </TouchableOpacity>
        {existing !== null && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete this reading</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  body: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateInput: { flex: 1, textAlign: 'center', marginHorizontal: 8 },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.sun, fontSize: 26, fontWeight: '700', lineHeight: 28 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 6 },
  saveButton: {
    backgroundColor: colors.sun,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveText: { color: colors.navy, fontSize: 17, fontWeight: '700' },
  deleteButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  deleteText: { color: colors.red, fontSize: 15, fontWeight: '600' },
});
