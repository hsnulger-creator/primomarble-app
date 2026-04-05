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
  primary: '#1a4ed8',
  white: '#FFFFFF',
  background: '#f0f4ff',
  card: '#FFFFFF',
  text: '#1a1a2e',
  textLight: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  danger: '#dc2626',
  checkBg: '#e8f0ff',
};

const CheckBox = ({ label, description, checked, onToggle }) => (
  <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <View style={styles.checkLabelContainer}>
      <Text style={styles.checkLabel}>{label}</Text>
      {description ? <Text style={styles.checkDescription}>{description}</Text> : null}
    </View>
  </TouchableOpacity>
);

const SectionHeader = ({ title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

export default function ForkliftCheckScreen({ navigation, route }) {
  const { username } = route.params || {};
  const today = new Date().toLocaleDateString('en-CA');

  const [operator, setOperator] = useState('');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');

  // Step 1 - Visual checks (true = OK)
  const [tiresWheels, setTiresWheels] = useState(true);
  const [forksMast, setForksMast] = useState(true);
  const [leaks, setLeaks] = useState(true);
  const [slabBoom, setSlabBoom] = useState(true);
  const [stoneClamp, setStoneClamp] = useState(true);

  // Step 2 - Test checks (true = OK)
  const [brakes, setBrakes] = useState(true);
  const [steering, setSteering] = useState(true);
  const [warnings, setWarnings] = useState(true);
  const [hydraulics, setHydraulics] = useState(true);

  // Status
  const [safeToOperate, setSafeToOperate] = useState(true);
  const [issues, setIssues] = useState('');
  const [signature, setSignature] = useState('');
  const [supervisor, setSupervisor] = useState('');

  const [sending, setSending] = useState(false);
  const draftLoaded = useRef(false);

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    saveToServer();
  }, [operator, date, hours, tiresWheels, forksMast, leaks, slabBoom, stoneClamp,
      brakes, steering, warnings, hydraulics, safeToOperate, issues, signature, supervisor]);

  const loadDraft = async () => {
    try {
      const result = await loadDraftFromServer(username || 'default', 'forklift');
      const d = result.ok && result.data ? result.data : null;
      if (d) {
        setOperator(d.operator !== undefined ? d.operator : (username || ''));
        setDate(d.date !== undefined ? d.date : today);
        setHours(d.hours !== undefined ? d.hours : '');
        setTiresWheels(d.tiresWheels !== undefined ? d.tiresWheels : true);
        setForksMast(d.forksMast !== undefined ? d.forksMast : true);
        setLeaks(d.leaks !== undefined ? d.leaks : true);
        setSlabBoom(d.slabBoom !== undefined ? d.slabBoom : true);
        setStoneClamp(d.stoneClamp !== undefined ? d.stoneClamp : true);
        setBrakes(d.brakes !== undefined ? d.brakes : true);
        setSteering(d.steering !== undefined ? d.steering : true);
        setWarnings(d.warnings !== undefined ? d.warnings : true);
        setHydraulics(d.hydraulics !== undefined ? d.hydraulics : true);
        setSafeToOperate(d.safeToOperate !== undefined ? d.safeToOperate : true);
        setIssues(d.issues !== undefined ? d.issues : '');
        setSignature(d.signature !== undefined ? d.signature : '');
        setSupervisor(d.supervisor !== undefined ? d.supervisor : '');
      } else if (username) {
        setOperator(username);
      }
    } catch (_) {
      if (username) setOperator(username);
    } finally {
      draftLoaded.current = true;
    }
  };

  const saveToServer = async () => {
    await saveDraft(username || 'default', 'forklift', {
      operator, date, hours, tiresWheels, forksMast, leaks, slabBoom, stoneClamp,
      brakes, steering, warnings, hydraulics, safeToOperate, issues, signature, supervisor,
    });
  };

  const checkIcon = (val) => (val ? '✅ OK' : '❌ NEEDS ATTENTION');

  const buildEmailBody = () => {
    return `
FORKLIFT DAILY CHECK REPORT
Primo Marble & Granite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Operator: ${operator || 'N/A'}
Date: ${date}
Hours: ${hours || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: THE VISUAL (Engine Off)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${checkIcon(tiresWheels)} Tires/Wheels
${checkIcon(forksMast)} Forks/Mast
${checkIcon(leaks)} Leaks
${checkIcon(slabBoom)} Slab Boom
${checkIcon(stoneClamp)} Stone Clamp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: THE TEST (Engine On)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${checkIcon(brakes)} Brakes
${checkIcon(steering)} Steering
${checkIcon(warnings)} Warnings (Horn & Backup Alarm)
${checkIcon(hydraulics)} Hydraulics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS: ${safeToOperate ? '✅ SAFE TO OPERATE' : '🔴 OUT OF SERVICE (Red Tag Applied / Key Removed)'}

Issues: ${issues || 'None'}
Signature: ${signature || 'N/A'}
Supervisor: ${supervisor || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from Primo Marble Day Check App
    `.trim();
  };

  const saveReportToHistory = async (body) => {
    try {
      const stored = await AsyncStorage.getItem('reportHistory');
      const history = stored ? JSON.parse(stored) : [];
      history.push({
        id: Date.now().toString(),
        type: 'forklift',
        operator: operator || 'N/A',
        date,
        status: safeToOperate ? 'SAFE TO OPERATE' : 'OUT OF SERVICE',
        submittedAt: new Date().toISOString(),
        body,
      });
      await AsyncStorage.setItem('reportHistory', JSON.stringify(history));
    } catch (_) {}
  };

  const handleSend = async () => {
    if (!operator.trim()) {
      Alert.alert('Required Field', 'Please enter the Operator name before sending.');
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
        subject: `Forklift Daily Check - ${operator} - ${date}`,
        body,
      });

      if (result.status === 'sent') {
        Alert.alert('Sent!', 'Forklift check report has been sent to the manager.', [
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
    Alert.alert('Reset Form', 'Clear all fields and reset checkboxes to OK?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await saveDraft(username || 'default', 'forklift', null);
          setOperator(username || ''); setDate(today); setHours('');
          setTiresWheels(true); setForksMast(true); setLeaks(true);
          setSlabBoom(true); setStoneClamp(true);
          setBrakes(true); setSteering(true); setWarnings(true); setHydraulics(true);
          setSafeToOperate(true); setIssues(''); setSignature(''); setSupervisor('');
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
        <Text style={styles.headerTitle}>Forklift Daily Check</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>FORKLIFT DAILY CHECK: PRIMO MARBLE</Text>
          <Text style={styles.infoBannerNote}>All checkboxes default to OK. Uncheck any item that needs attention.</Text>
        </View>

        {/* Operator Info */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Operator *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Full name"
                value={operator}
                onChangeText={setOperator}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Hours</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="0"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Step 1 */}
        <View style={styles.card}>
          <SectionHeader title="STEP 1: THE VISUAL" subtitle="Engine Off" />
          <CheckBox
            label="Tires/Wheels"
            description="No chunks missing; no stone shards in rubber"
            checked={tiresWheels}
            onToggle={() => setTiresWheels(!tiresWheels)}
          />
          <CheckBox
            label="Forks/Mast"
            description='No cracks in "heels"; chains are greased'
            checked={forksMast}
            onToggle={() => setForksMast(!forksMast)}
          />
          <CheckBox
            label="Leaks"
            description="No puddles under the machine (Oil/Hydraulic/Coolant)"
            checked={leaks}
            onToggle={() => setLeaks(!leaks)}
          />
          <CheckBox
            label="Slab Boom"
            description="Weld points look solid; Safety Pin is installed"
            checked={slabBoom}
            onToggle={() => setSlabBoom(!slabBoom)}
          />
          <CheckBox
            label="Stone Clamp"
            description="Rubber pads are clean and free of slurry/dust"
            checked={stoneClamp}
            onToggle={() => setStoneClamp(!stoneClamp)}
          />
        </View>

        {/* Step 2 */}
        <View style={styles.card}>
          <SectionHeader title="STEP 2: THE TEST" subtitle="Engine On" />
          <CheckBox
            label="Brakes"
            description="Foot brake stops fast; Parking brake holds on a slope"
            checked={brakes}
            onToggle={() => setBrakes(!brakes)}
          />
          <CheckBox
            label="Steering"
            description='No sticking or "loose" feeling'
            checked={steering}
            onToggle={() => setSteering(!steering)}
          />
          <CheckBox
            label="Warnings"
            description="Horn and Backup Alarm are loud"
            checked={warnings}
            onToggle={() => setWarnings(!warnings)}
          />
          <CheckBox
            label="Hydraulics"
            description="Lift/Tilt/Side-shift move smoothly"
            checked={hydraulics}
            onToggle={() => setHydraulics(!hydraulics)}
          />
        </View>

        {/* Status */}
        <View style={styles.card}>
          <SectionHeader title="STATUS" />
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusButton, safeToOperate && styles.statusButtonActive]}
              onPress={() => setSafeToOperate(true)}
            >
              <Text style={[styles.statusButtonText, safeToOperate && styles.statusButtonTextActive]}>
                ✅ SAFE TO OPERATE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, !safeToOperate && styles.statusButtonDanger]}
              onPress={() => setSafeToOperate(false)}
            >
              <Text style={[styles.statusButtonText, !safeToOperate && styles.statusButtonTextActive]}>
                🔴 OUT OF SERVICE
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Issues</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              placeholder="Describe any issues found..."
              value={issues}
              onChangeText={setIssues}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Signature</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Your name"
                value={signature}
                onChangeText={setSignature}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Supervisor</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Supervisor name"
                value={supervisor}
                onChangeText={setSupervisor}
              />
            </View>
          </View>
        </View>

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
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  checkLabelContainer: { flex: 1 },
  checkLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  checkDescription: { fontSize: 12, color: COLORS.textLight, marginTop: 2, lineHeight: 16 },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statusButtonActive: { borderColor: COLORS.success, backgroundColor: '#f0fdf4' },
  statusButtonDanger: { borderColor: COLORS.danger, backgroundColor: '#fef2f2' },
  statusButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  statusButtonTextActive: { color: COLORS.text },

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
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
