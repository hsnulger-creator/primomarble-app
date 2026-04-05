import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = {
  primary: '#1a4ed8',
  primaryDark: '#1238a8',
  white: '#FFFFFF',
  background: '#0d2d8a',
  inputBg: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.4)',
  error: '#ff6b6b',
};

const DEFAULT_USER = { username: 'PrimoMarble', password: 'Prm4075' };

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [users, setUsers] = useState([DEFAULT_USER]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadRemembered();
    }, [])
  );

  const loadUsers = async () => {
    const stored = await AsyncStorage.getItem('users');
    if (stored) setUsers(JSON.parse(stored));
  };

  const loadRemembered = async () => {
    const remembered = await AsyncStorage.getItem('rememberMe');
    const savedUsername = await AsyncStorage.getItem('savedUsername');
    if (remembered === 'true' && savedUsername) {
      setRememberMe(true);
      setUsername(savedUsername);
    }
  };

  const handleLogin = async () => {
    const match = users.find(
      u => u.username === username && u.password === password
    );
    if (match) {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
        await AsyncStorage.setItem('savedUsername', username);
      } else {
        await AsyncStorage.removeItem('rememberMe');
        await AsyncStorage.removeItem('savedUsername');
      }
      navigation.replace('Home', { username: match.username });
    } else {
      Alert.alert('Login Failed', 'Incorrect username or password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: '#4ade80' }}
              thumbColor={COLORS.white}
            />
            <Text style={styles.rememberText}>Remember username</Text>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Primo Marble & Granite © 2024</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 260,
    height: 120,
    borderRadius: 8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 18,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    gap: 10,
  },
  rememberText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 32,
    textAlign: 'center',
  },
});
