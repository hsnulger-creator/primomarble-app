import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MailComposer from 'expo-mail-composer';
import { saveDraft, loadDraftFromServer } from '../api';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  primary: '#1238a8',
  white: '#FFFFFF',
  background: '#f0f4ff',
  card: '#FFFFFF',
  text: '#1a1a2e',
  textLight: '#6b7280',
  border: '#e5e7eb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
};

const CheckBox = ({ label, checked, onToggle, defect }) => (
  <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
    <View style={[
      styles.checkbox,
      defect ? (checked && styles.checkboxDefect) : (checked && styles.checkboxChecked)
    ]}>
      {checked && <Text style={styles.checkmark}>{defect ? '✕' : '✓'}</Text>}
    </View>
    <Text style={[styles.checkLabel, defect && checked && styles.checkLabelDefect]}>{label}</Text>
  </TouchableOpacity>
);

export default function DriverInspectionScreen({ navigation, route }) {
  const { username } = route.params || {};
  const today = new Date().toLocaleDateString('en-CA');

  const [date, setDate] = useState(today);
  const [truckNumber, setTruckNumber] = useState('');

  // Defect checkboxes (true = defective)
  const [defrosters, setDefrosters] = useState(false);
  const [engine, setEngine] = useState(false);
  const [emergencyBrake, setEmergencyBrake] = useState(false);
  const [heater, setHeater] = useState(false);
  const [horn, setHorn] = useState(false);
  const [lights, setLights] = useState(false);
  const [mirrors, setMirrors] = useState(false);
  const [reflectors, setReflectors] = useState(false);
  const [safetyEquipment, setSafetyEquipment] = useState(false);
  const [tires, setTires] = useState(false);
  const [transmission, setTransmission] = useState(false);
  const [windows, setWindows] = useState(false);
  const [windshieldWipers, setWindshieldWipers] = useState(false);
  const [other, setOther] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [conditionSatisfactory, setConditionSatisfactory] = useState(true);
  const [currentMileage, setCurrentMileage] = useState('');
  const [oilChangeDue, setOilChangeDue] = useState('');
  const [driverSignature, setDriverSignature] = useState('');

  const [sending, setSending] = useState(false);
  const draftLoaded = useRef(false);

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    saveToServer();
  }, [date, truckNumber, defrosters, engine, emergencyBrake, heater, horn, lights,
      mirrors, reflectors, safetyEquipment, tires, transmission, windows,
      windshieldWipers, other, remarks, conditionSatisfactory,
      currentMileage, oilChangeDue, driverSignature]);

  const loadDraft = async () => {
    try {
      const result = await loadDraftFromServer(username || 'default', 'driver');
      const d = result.ok && result.data ? result.data : null;
      if (d) {
        setDate(d.date !== undefined ? d.date : today);
        setTruckNumber(d.truckNumber !== undefined ? d.truckNumber : '');
        setDefrosters(d.defrosters !== undefined ? d.defrosters : false);
        setEngine(d.engine !== undefined ? d.engine : false);
        setEmergencyBrake(d.emergencyBrake !== undefined ? d.emergencyBrake : false);
        setHeater(d.heater !== undefined ? d.heater : false);
        setHorn(d.horn !== undefined ? d.horn : false);
        setLights(d.lights !== undefined ? d.lights : false);
        setMirrors(d.mirrors !== undefined ? d.mirrors : false);
        setReflectors(d.reflectors !== undefined ? d.reflectors : false);
        setSafetyEquipment(d.safetyEquipment !== undefined ? d.safetyEquipment : false);
        setTires(d.tires !== undefined ? d.tires : false);
        setTransmission(d.transmission !== undefined ? d.transmission : false);
        setWindows(d.windows !== undefined ? d.windows : false);
        setWindshieldWipers(d.windshieldWipers !== undefined ? d.windshieldWipers : false);
        setOther(d.other !== undefined ? d.other : false);
        setRemarks(d.remarks !== undefined ? d.remarks : '');
        setConditionSatisfactory(d.conditionSatisfactory !== undefined ? d.conditionSatisfactory : true);
        setCurrentMileage(d.currentMileage !== undefined ? d.currentMileage : '');
        setOilChangeDue(d.oilChangeDue !== undefined ? d.oilChangeDue : '');
        setDriverSignature(d.driverSignature !== undefined ? d.driverSignature : (username || ''));
      } else if (username) {
        setDriverSignature(username);
      }
    } catch (_) {
      if (username) setDriverSignature(username);
    } finally {
      draftLoaded.current = true;
    }
  };

  const saveToServer = async () => {
    await saveDraft(username || 'default', 'driver', {
      date, truckNumber, defrosters, engine, emergencyBrake, heater, horn, lights,
      mirrors, reflectors, safetyEquipment, tires, transmission, windows,
      windshieldWipers, other, remarks, conditionSatisfactory,
      currentMileage, oilChangeDue, driverSignature,
    });
  };

  const defectList = [
    { label: 'Defrosters', value: defrosters },
    { label: 'Engine (Any lights on)', value: engine },
    { label: 'Emergency Brake', value: emergencyBrake },
    { label: 'Heater', value: heater },
    { label: 'Horn', value: horn },
    { label: 'Lights', value: lights },
    { label: 'Mirrors', value: mirrors },
    { label: 'Reflectors', value: reflectors },
    { label: 'Safety Equipment (Flags/Flares/Fire Ext.)', value: safetyEquipment },
    { label: 'Tires', value: tires },
    { label: 'Transmission (Any issues)', value: transmission },
    { label: 'Windows', value: windows },
    { label: 'Windshield Wipers', value: windshieldWipers },
    { label: 'Other', value: other },
  ];

  const defectiveItems = defectList.filter(i => i.value).map(i => `❌ ${i.label}`);
  const okItems = defectList.filter(i => !i.value).map(i => `✅ ${i.label}`);

  const buildEmailBody = () => {
    return `
DRIVER'S VEHICLE INSPECTION REPORT
Primo Marble & Granite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}
Truck #: ${truckNumber || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${defectiveItems.length > 0 ? 'DEFECTIVE ITEMS:' : 'NO DEFECTS FOUND'}
${defectiveItems.join('\n') || ''}

${okItems.length > 0 ? 'OK ITEMS:\n' + okItems.join('\n') : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMARKS:
${remarks || 'None'}

Condition Satisfactory: ${conditionSatisfactory ? 'YES ✅' : 'NO ❌'}
Current Mileage: ${currentMileage || 'N/A'}
Current Oil Change Due: ${oilChangeDue || 'N/A'}
Driver's Signature: ${driverSignature || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from Primo Marble Day Check App
    `.trim();
  };

  const saveReportToHistory = async (body) => {
    try {
      const stored = await AsyncStorage.getItem('reportHistory');
      const history = stored ? JSON.parse(stored) : [];
      const hasDefects = defectiveItems.length > 0;
      history.push({
        id: Date.now().toString(),
        type: 'driver',
        operator: driverSignature || 'N/A',
        date,
        status: hasDefects ? `${defectiveItems.length} Defect(s) Found` : 'Satisfactory',
        submittedAt: new Date().toISOString(),
        body,
      });
      await AsyncStorage.setItem('reportHistory', JSON.stringify(history));
    } catch (_) {}
  };

  const handleSend = async () => {
    if (!driverSignature.trim()) {
      Alert.alert('Required Field', "Please enter the Driver's Signature before sending.");
      return;
    }

    const managerEmail = await AsyncStorage.getItem('managerEmail');
    if (!managerEmail) {
      Alert.alert(
        'No Manager Email',
        'Please set the manager email in Settings first.',
        [
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email Not Available', 'No email app is configured on this device.');
      return;
    }

    const body = buildEmailBody();
    await saveReportToHistory(body);

    setSending(true);
    try {
      const result = await MailComposer.composeAsync({
        recipients: [managerEmail],
        subject: `Driver Vehicle Inspection - Truck #${truckNumber || 'N/A'} - ${date}`,
        body,
      });

      if (result.status === 'sent') {
        Alert.alert('Sent!', 'Vehicle inspection report has been sent to the manager.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Form', 'Clear all fields and reset all items to OK?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await saveDraft(username || 'default', 'driver', null);
          setDate(today); setTruckNumber('');
          setDefrosters(false); setEngine(false); setEmergencyBrake(false);
          setHeater(false); setHorn(false); setLights(false);
          setMirrors(false); setReflectors(false); setSafetyEquipment(false);
          setTires(false); setTransmission(false); setWindows(false);
          setWindshieldWipers(false); setOther(false);
          setRemarks(''); setConditionSatisfactory(true);
          setCurrentMileage(''); setOilChangeDue('');
          setDriverSignature(username || '');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Inspection</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>DRIVER'S VEHICLE INSPECTION REPORT</Text>
          <Text style={styles.infoBannerNote}>Check ANY defective item and give details under "Remarks"</Text>
        </View>

        {/* Date & Truck */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Truck #</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Truck number"
                value={truckNumber}
                onChangeText={setTruckNumber}
              />
            </View>
          </View>
        </View>

        {/* Inspection Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>INSPECTION ITEMS</Text>
          <Text style={styles.sectionNote}>Tap to mark as DEFECTIVE</Text>

          <View style={styles.checkGrid}>
            <View style={styles.checkColumn}>
              <CheckBox label="Defrosters" checked={defrosters} onToggle={() => setDefrosters(!defrosters)} defect />
              <CheckBox label="Engine (Any lights on)" checked={engine} onToggle={() => setEngine(!engine)} defect />
              <CheckBox label="Emergency Brake" checked={emergencyBrake} onToggle={() => setEmergencyBrake(!emergencyBrake)} defect />
              <CheckBox label="Heater" checked={heater} onToggle={() => setHeater(!heater)} defect />
              <CheckBox label="Horn" checked={horn} onToggle={() => setHorn(!horn)} defect />
            </View>

            <View style={[styles.checkColumn, { borderLeftWidth: 1, borderLeftColor: COLORS.border, paddingLeft: 12 }]}>
              <CheckBox label="Lights" checked={lights} onToggle={() => setLights(!lights)} defect />
              <CheckBox label="Mirrors" checked={mirrors} onToggle={() => setMirrors(!mirrors)} defect />
              <CheckBox label="Reflectors" checked={reflectors} onToggle={() => setReflectors(!reflectors)} defect />
              <CheckBox label="Safety Equipment" checked={safetyEquipment} onToggle={() => setSafetyEquipment(!safetyEquipment)} defect />
              <CheckBox label="Tires" checked={tires} onToggle={() => setTires(!tires)} defect />
            </View>
          </View>

          <View style={styles.checkGridFull}>
            <CheckBox label="Transmission (Any issues)" checked={transmission} onToggle={() => setTransmission(!transmission)} defect />
            <CheckBox label="Windows" checked={windows} onToggle={() => setWindows(!windows)} defect />
            <CheckBox label="Windshield Wipers" checked={windshieldWipers} onToggle={() => setWindshieldWipers(!windshieldWipers)} defect />
            <CheckBox label="Other" checked={other} onToggle={() => setOther(!other)} defect />
          </View>
        </View>

        {/* Remarks & Details */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Remarks</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              placeholder="Describe any defects or issues found..."
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={styles.satisfactoryRow}
            onPress={() => setConditionSatisfactory(!conditionSatisfactory)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, conditionSatisfactory && styles.checkboxChecked]}>
              {conditionSatisfactory && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.satisfactoryText}>Condition of the above is satisfactory</Text>
          </TouchableOpacity>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Current Mileage</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 45,000"
                value={currentMileage}
                onChangeText={setCurrentMileage}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Oil Change Due</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 50,000"
                value={oilChangeDue}
                onChangeText={setOilChangeDue}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Driver's Signature *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Driver's full name"
              value={driverSignature}
              onChangeText={setDriverSignature}
            />
          </View>
        </View>

        {/* Defect Summary */}
        {defectiveItems.length > 0 && (
          <View style={styles.defectSummary}>
            <Text style={styles.defectSummaryTitle}>⚠️ {defectiveItems.length} Defective Item{defectiveItems.length > 1 ? 's' : ''} Found</Text>
            {defectiveItems.map((item, i) => (
              <Text key={i} style={styles.defectSummaryItem}>{item}</Text>
            ))}
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? 'Opening Email...' : '📧 SEND REPORT TO MANAGER'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
  },
  backButton: { padding: 4 },
  backText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resetText: { color: COLORS.white, fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  infoBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoBannerTitle: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  infoBannerNote: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5, marginBottom: 2 },
  sectionNote: { fontSize: 12, color: COLORS.danger, marginBottom: 12 },
  checkGrid: { flexDirection: 'row', marginBottom: 8 },
  checkColumn: { flex: 1 },
  checkGridFull: {},
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  checkboxChecked: { backgroundColor: '#1a4ed8', borderColor: '#1a4ed8' },
  checkboxDefect: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  checkmark: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  checkLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  checkLabelDefect: { color: COLORS.danger, fontWeight: '600' },
  fieldRow: { flexDirection: 'row' },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#fafafa',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  satisfactoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  satisfactoryText: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  defectSummary: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  defectSummaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.danger, marginBottom: 8 },
  defectSummaryItem: { fontSize: 13, color: COLORS.danger, marginBottom: 3 },

  // Photo
  addPhotoBtn: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  addPhotoBtnIcon: { fontSize: 32, marginBottom: 8 },
  addPhotoBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  photoPreviewContainer: { alignItems: 'center' },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  removePhotoBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  removePhotoBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },

  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 4,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
