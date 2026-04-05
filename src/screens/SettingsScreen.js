import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  successBg: '#f0fdf4',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
};

const DEFAULT_USER = { username: 'PrimoMarble', password: 'Prm4075', isAdmin: true };

export default function SettingsScreen({ navigation, route }) {
  const { username: currentUsername } = route.params || {};

  const [managerEmail, setManagerEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Add user form (admin only)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [makeAdmin, setMakeAdmin] = useState(false);

  // Change password state (inline per user for admin, or self for regular)
  const [changingPassword, setChangingPassword] = useState(null);
  // { index, currentPwd, newPwd, showCurrent, showNew }

  useEffect(() => {
    loadEmail();
    loadUsers();
  }, []);

  // ── Email ──────────────────────────────────────────────────────────────────

  const loadEmail = async () => {
    const email = await AsyncStorage.getItem('managerEmail');
    if (email) { setManagerEmail(email); setSavedEmail(email); }
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSaveEmail = async () => {
    if (!managerEmail.trim()) {
      Alert.alert('Required', 'Please enter a manager email address.'); return;
    }
    if (!validateEmail(managerEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.'); return;
    }
    await AsyncStorage.setItem('managerEmail', managerEmail.trim());
    setSavedEmail(managerEmail.trim());
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
    Alert.alert('Saved!', `Manager email saved:\n${managerEmail.trim()}`);
  };

  const handleClearEmail = () => {
    Alert.alert('Clear Email', 'Remove the saved manager email?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('managerEmail');
          setManagerEmail(''); setSavedEmail('');
        },
      },
    ]);
  };

  // ── Users ──────────────────────────────────────────────────────────────────

  const loadUsers = async () => {
    const stored = await AsyncStorage.getItem('users');
    let list;
    if (stored) {
      list = JSON.parse(stored);
      // Migrate old users without isAdmin field
      list = list.map(u => ({ isAdmin: false, ...u }));
    } else {
      list = [DEFAULT_USER];
      await AsyncStorage.setItem('users', JSON.stringify(list));
    }
    setUsers(list);
    const me = list.find(u => u.username === currentUsername);
    setIsAdmin(me?.isAdmin === true);
  };

  const saveUsers = async (updated) => {
    await AsyncStorage.setItem('users', JSON.stringify(updated));
    setUsers(updated);
  };

  // Admin: add new user
  const handleAddUser = async () => {
    const uname = newUsername.trim();
    const pwd = newPassword.trim();
    if (!uname || !pwd) {
      Alert.alert('Required', 'Please enter both a username and password.'); return;
    }
    if (users.find(u => u.username.toLowerCase() === uname.toLowerCase())) {
      Alert.alert('Duplicate', 'A user with that username already exists.'); return;
    }
    const updated = [...users, { username: uname, password: pwd, isAdmin: makeAdmin }];
    await saveUsers(updated);
    setNewUsername(''); setNewPassword(''); setMakeAdmin(false);
    Alert.alert('User Added', `"${uname}" can now log in.`);
  };

  // Admin: change any user's password (no current password needed)
  // Regular: change own password (must provide current password)
  const handleChangePassword = async (index) => {
    const { currentPwd, newPwd } = changingPassword;
    const targetUser = users[index];
    const isChangingOwnPassword = targetUser.username === currentUsername;

    if (!isAdmin || isChangingOwnPassword) {
      // Must verify current password
      if (!currentPwd.trim()) {
        Alert.alert('Required', 'Please enter your current password.'); return;
      }
      if (currentPwd.trim() !== targetUser.password) {
        Alert.alert('Wrong Password', 'Current password is incorrect.'); return;
      }
    }

    if (!newPwd.trim()) {
      Alert.alert('Required', 'Please enter a new password.'); return;
    }
    if (newPwd.trim().length < 4) {
      Alert.alert('Too Short', 'Password must be at least 4 characters.'); return;
    }

    const updated = users.map((u, i) =>
      i === index ? { ...u, password: newPwd.trim() } : u
    );
    await saveUsers(updated);
    setChangingPassword(null);
    Alert.alert('Done', `Password updated for "${targetUser.username}".`);
  };

  // Admin: delete user
  const handleDeleteUser = (index) => {
    if (users[index].username === currentUsername) {
      Alert.alert('Cannot Delete', 'You cannot delete your own account.'); return;
    }
    if (users.length === 1) {
      Alert.alert('Cannot Delete', 'You must keep at least one user.'); return;
    }
    Alert.alert('Delete User', `Remove "${users[index].username}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = users.filter((_, i) => i !== index);
          await saveUsers(updated);
        },
      },
    ]);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderChangePasswordForm = (index) => {
    const targetUser = users[index];
    const isOwnAccount = targetUser.username === currentUsername;
    const needCurrentPwd = !isAdmin || isOwnAccount;

    return (
      <View style={styles.changePwdForm}>
        {needCurrentPwd && (
          <>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInlineInput}
                placeholder="Enter current password"
                value={changingPassword.currentPwd}
                onChangeText={(t) => setChangingPassword({ ...changingPassword, currentPwd: t })}
                secureTextEntry={!changingPassword.showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setChangingPassword({ ...changingPassword, showCurrent: !changingPassword.showCurrent })}
              >
                <Text>{changingPassword.showCurrent ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <Text style={styles.fieldLabel}>New Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInlineInput}
            placeholder="Enter new password"
            value={changingPassword.newPwd}
            onChangeText={(t) => setChangingPassword({ ...changingPassword, newPwd: t })}
            secureTextEntry={!changingPassword.showNew}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setChangingPassword({ ...changingPassword, showNew: !changingPassword.showNew })}
          >
            <Text>{changingPassword.showNew ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={() => handleChangePassword(index)}>
            <Text style={styles.saveButtonText}>Save Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={() => setChangingPassword(null)}>
            <Text style={styles.clearButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Manager Email */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📧 Manager Email</Text>
          <Text style={styles.cardDescription}>
            Reports from both forms will be sent to this email address when you tap "Send Report".
          </Text>
          {savedEmail ? (
            <View style={styles.currentEmailBadge}>
              <Text style={styles.currentEmailLabel}>Current:</Text>
              <Text style={styles.currentEmailValue}>{savedEmail}</Text>
            </View>
          ) : (
            <View style={styles.noEmailBadge}>
              <Text style={styles.noEmailText}>⚠️ No manager email set</Text>
            </View>
          )}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="manager@company.com"
            value={managerEmail}
            onChangeText={(t) => { setManagerEmail(t); setEmailSaved(false); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton, emailSaved && styles.saveButtonSaved]}
              onPress={handleSaveEmail}
            >
              <Text style={styles.saveButtonText}>{emailSaved ? '✓ Saved!' : 'Save Email'}</Text>
            </TouchableOpacity>
            {savedEmail ? (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearEmail}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* User Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 User Management</Text>

          {isAdmin ? (
            <Text style={styles.cardDescription}>
              You are an admin. You can add, delete, and change passwords for all users.
            </Text>
          ) : (
            <Text style={styles.cardDescription}>
              You can change your own password below.
            </Text>
          )}

          {/* User list */}
          {users.map((user, index) => {
            const isOwnAccount = user.username === currentUsername;
            const canChangePassword = isAdmin || isOwnAccount;
            const isExpanded = changingPassword?.index === index;

            return (
              <View key={index}>
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.usernameText}>{user.username}</Text>
                    <View style={styles.badgeRow}>
                      {user.isAdmin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                      {isOwnAccount && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    {canChangePassword && (
                      <TouchableOpacity
                        style={styles.changePwdBtn}
                        onPress={() =>
                          setChangingPassword(
                            isExpanded ? null : { index, currentPwd: '', newPwd: '', showCurrent: false, showNew: false }
                          )
                        }
                      >
                        <Text style={styles.changePwdBtnText}>
                          {isExpanded ? 'Cancel' : 'Change Pwd'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {isAdmin && !isOwnAccount && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteUser(index)}
                      >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {isExpanded && renderChangePasswordForm(index)}

                {index < users.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}

          {/* Add new user — admin only */}
          {isAdmin && (
            <View style={styles.addUserSection}>
              <Text style={styles.addUserTitle}>Add New User</Text>

              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInlineInput}
                  placeholder="Enter password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Text>{showNewPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.adminToggleRow}
                onPress={() => setMakeAdmin(!makeAdmin)}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleBox, makeAdmin && styles.toggleBoxChecked]}>
                  {makeAdmin && <Text style={styles.toggleCheck}>✓</Text>}
                </View>
                <Text style={styles.adminToggleText}>Make this user an Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addUserBtn} onPress={handleAddUser}>
                <Text style={styles.addUserBtnText}>+ Add User</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>Primo Marble Day Check</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>Primo Marble & Granite</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 How It Works</Text>
          <Text style={styles.howToText}>1. Set the manager email above</Text>
          <Text style={styles.howToText}>2. Go to Home and select a form</Text>
          <Text style={styles.howToText}>3. Fill in the inspection details</Text>
          <Text style={styles.howToText}>4. Tap "Send Report" — your email app will open with the report pre-filled</Text>
          <Text style={styles.howToText}>5. Tap Send in your email app to deliver the report</Text>
        </View>

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
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  cardDescription: { fontSize: 13, color: COLORS.textLight, lineHeight: 18, marginBottom: 14 },

  // Email
  currentEmailBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
    flexDirection: 'row', alignItems: 'center',
  },
  currentEmailLabel: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginRight: 6 },
  currentEmailValue: { fontSize: 13, color: COLORS.success, flex: 1 },
  noEmailBadge: {
    backgroundColor: '#fefce8',
    borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#fde68a',
  },
  noEmailText: { fontSize: 13, color: '#92400e', fontWeight: '600' },

  // Common inputs
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.textLight,
    marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: COLORS.text, backgroundColor: '#fafafa', marginBottom: 12,
  },
  buttonRow: { flexDirection: 'row', gap: 10 },
  saveButton: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  saveButtonSaved: { backgroundColor: COLORS.success },
  saveButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  clearButton: {
    borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center',
  },
  clearButtonText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },

  // User list
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
  },
  userInfo: { flex: 1 },
  usernameText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  adminBadge: {
    backgroundColor: '#ede9fe', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  youBadge: {
    backgroundColor: '#dbeafe', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  youBadgeText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  userActions: { flexDirection: 'row', gap: 8 },
  changePwdBtn: {
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  changePwdBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

  // Change password form
  changePwdForm: {
    backgroundColor: '#f8faff', borderRadius: 8, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#c7d7f8',
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, backgroundColor: '#fafafa', marginBottom: 12,
  },
  passwordInlineInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: COLORS.text,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  // Add user section
  addUserSection: {
    marginTop: 14, borderTopWidth: 1,
    borderTopColor: COLORS.border, paddingTop: 14,
  },
  addUserTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  adminToggleRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  toggleBox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, backgroundColor: COLORS.white,
  },
  toggleBoxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  toggleCheck: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  adminToggleText: { fontSize: 14, color: COLORS.text },
  addUserBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  addUserBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // App info
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 14, color: COLORS.textLight },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  howToText: { fontSize: 13, color: COLORS.textLight, lineHeight: 22, paddingLeft: 4 },
});
