import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
  warning: '#d97706',
  warningBg: '#fffbeb',
};

export default function HistoryScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    const stored = await AsyncStorage.getItem('reportHistory');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sort newest first
      parsed.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setReports(parsed);
    } else {
      setReports([]);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Report', 'Remove this report from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = reports.filter(r => r.id !== id);
          await AsyncStorage.setItem('reportHistory', JSON.stringify(updated));
          setReports(updated);
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All History', 'This will permanently delete all saved reports. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('reportHistory');
          setReports([]);
          setExpandedId(null);
        },
      },
    ]);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const statusStyle = (status) => {
    if (!status) return {};
    const s = status.toUpperCase();
    if (s.includes('SAFE') || s.includes('SATISFACTORY')) return { bg: COLORS.successBg, text: COLORS.success, border: '#bbf7d0' };
    if (s.includes('OUT OF SERVICE') || s.includes('DEFECT')) return { bg: COLORS.dangerBg, text: COLORS.danger, border: '#fca5a5' };
    return { bg: COLORS.warningBg, text: COLORS.warning, border: '#fde68a' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report History</Text>
        {reports.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptySubtitle}>Submitted inspection reports will appear here.</Text>
          </View>
        ) : (
          reports.map((report) => {
            const st = statusStyle(report.status);
            const isExpanded = expandedId === report.id;
            return (
              <View key={report.id} style={styles.card}>
                {/* Card header */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpandedId(isExpanded ? null : report.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardType}>
                      {report.type === 'forklift' ? '🏗️ Forklift Daily Check' : '🚛 Vehicle Inspection'}
                    </Text>
                    <Text style={styles.cardOperator}>{report.operator || 'Unknown operator'}</Text>
                    <Text style={styles.cardDate}>{formatDate(report.submittedAt)}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {report.status ? (
                      <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                        <Text style={[styles.statusBadgeText, { color: st.text }]} numberOfLines={2}>
                          {report.status}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded body */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <ScrollView
                      style={styles.bodyScroll}
                      nestedScrollEnabled
                    >
                      <Text style={styles.bodyText}>{report.body}</Text>
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(report.id)}
                    >
                      <Text style={styles.deleteBtnText}>Delete This Report</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

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
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  clearAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardHeaderLeft: { flex: 1 },
  cardType: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cardOperator: { fontSize: 13, color: COLORS.textLight, marginBottom: 2 },
  cardDate: { fontSize: 12, color: COLORS.textLight },
  cardHeaderRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 130,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  chevron: { fontSize: 12, color: COLORS.textLight },

  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
  },
  bodyScroll: {
    maxHeight: 300,
    backgroundColor: '#f8faff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bodyText: { fontSize: 13, color: COLORS.text, lineHeight: 20, fontFamily: 'monospace' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
});
