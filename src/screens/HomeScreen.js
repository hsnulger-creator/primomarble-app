import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  primary: '#1a4ed8',
  primaryDark: '#1238a8',
  white: '#FFFFFF',
  background: '#f0f4ff',
  card: '#FFFFFF',
  text: '#1a1a2e',
  textLight: '#6b7280',
  shadow: '#000',
};

export default function HomeScreen({ navigation, route }) {
  const { username } = route.params || {};

  const handleSave = async () => {
    try {
      const [fRes, dRes] = await Promise.all([
        fetch(`http://217.216.95.49:3737/load/${encodeURIComponent(username || 'default')}/forklift`).then(r => r.json()),
        fetch(`http://217.216.95.49:3737/load/${encodeURIComponent(username || 'default')}/driver`).then(r => r.json()),
      ]);
      const hasSaved = (fRes.ok && fRes.data) || (dRes.ok && dRes.data);
      Alert.alert(
        'Data Saved on Server',
        hasSaved
          ? 'Your form data is saved on the server.\nIt will be restored next time you open the forms.'
          : 'No form data saved yet. Fill in a form first.',
      );
    } catch (_) {
      Alert.alert('Error', 'Could not reach server. Check your internet connection.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.jpg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.headerButtonText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings', { username })}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Text style={styles.headerButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.titleText}>Daily Check App</Text>
        {username ? (
          <Text style={styles.subtitleText}>Welcome, {username}</Text>
        ) : (
          <Text style={styles.subtitleText}>Select a form to begin your inspection</Text>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.cardsContainer}>

        {/* Forklift Card */}
        <TouchableOpacity
          style={[styles.card, styles.cardForklift]}
          onPress={() => navigation.navigate('ForkliftCheck', { username })}
          activeOpacity={0.85}
        >
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>🏗️</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Forklift Daily Check</Text>
            <Text style={styles.cardDescription}>
              Visual & operational inspection{'\n'}for forklift equipment
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        {/* Driver Inspection Card */}
        <TouchableOpacity
          style={[styles.card, styles.cardDriver]}
          onPress={() => navigation.navigate('DriverInspection', { username })}
          activeOpacity={0.85}
        >
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>🚛</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Driver's Vehicle Inspection</Text>
            <Text style={styles.cardDescription}>
              Pre-trip vehicle safety{'\n'}inspection report
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>💾  SAVE DATA</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Primo Marble & Granite © 2024</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 40,
    paddingBottom: 14,
  },
  headerLogo: {
    width: 140,
    height: 50,
    borderRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  cardForklift: {
    backgroundColor: COLORS.primary,
  },
  cardDriver: {
    backgroundColor: '#1238a8',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  cardArrow: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '300',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    paddingVertical: 8,
  },
});
