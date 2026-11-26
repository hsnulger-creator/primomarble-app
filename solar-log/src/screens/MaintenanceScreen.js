import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { getNotes, addNote, deleteNote } from '../storage';
import { todayKey, isValidKey, formatDate } from '../stats';

const TYPES = ['Cleaning', 'Fault', 'Service', 'Other'];

export default function MaintenanceScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState(TYPES[0]);
  const [text, setText] = useState('');

  const reload = useCallback(() => {
    getNotes().then((list) =>
      setNotes([...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)))
    );
  }, []);

  useFocusEffect(reload);

  const handleAdd = async () => {
    if (!isValidKey(date)) return Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
    await addNote({ date, type, text: text.trim() });
    setText('');
    reload();
  };

  const handleDelete = (note) => {
    Alert.alert('Delete note', `Remove this ${note.type.toLowerCase()} note?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          reload();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Maintenance" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New note</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={text}
            onChangeText={setText}
            placeholder="What happened? (optional)"
            multiline
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addText}>Add note</Text>
          </TouchableOpacity>
        </View>

        {notes.length === 0 ? (
          <Text style={styles.empty}>
            No notes yet. Log panel cleaning, inverter faults and service visits here.
          </Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.note}>
              <View style={styles.noteHead}>
                <Text style={styles.noteType}>{note.type}</Text>
                <Text style={styles.noteDate}>{formatDate(note.date)}</Text>
              </View>
              {!!note.text && <Text style={styles.noteText}>{note.text}</Text>}
              <TouchableOpacity onPress={() => handleDelete(note)}>
                <Text style={styles.noteDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  body: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.bg,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.navy },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  addButton: {
    backgroundColor: colors.sun,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30, fontSize: 15 },
  note: { backgroundColor: colors.card, borderRadius: 10, padding: 14, marginBottom: 8 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  noteType: { fontSize: 15, fontWeight: '700', color: colors.sunDark },
  noteDate: { fontSize: 13, color: colors.muted },
  noteText: { fontSize: 14, color: colors.text, marginTop: 6 },
  noteDelete: { color: colors.red, fontSize: 13, fontWeight: '600', marginTop: 10 },
});
