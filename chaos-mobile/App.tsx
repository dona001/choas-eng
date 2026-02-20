/**
 * Chaos Control Center — Mobile App
 * 
 * This is the MOBILE equivalent of the web frontend's page.tsx.
 * It connects to the SAME Spring Boot microservice backend and mirrors:
 * - Status cards (API, DB, Cache)
 * - Item submission form ("Trigger Chaos Action")
 * - Registry list with skeleton loaders
 * - Toast notification system
 * 
 * All components have testID attributes for Detox chaos testing.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StatusCard } from './src/components/StatusCard';
import { SkeletonLoader } from './src/components/SkeletonLoader';
import { ItemRow } from './src/components/ItemRow';
import { Toast } from './src/components/Toast';
import { useItems } from './src/hooks/useItems';

export default function App() {
  const {
    items,
    loading,
    error,
    submitting,
    toast,
    fetchItems,
    createItem,
    dismissToast,
  } = useItems();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSubmit = async () => {
    if (!name || !value) return;

    const success = await createItem(name, Number(value));
    if (success) {
      setName('');
      setValue('');
    }
    // On failure: form data is PRESERVED (chaos resilience pattern)
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          testID="main-scroll"
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#60a5fa"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text testID="app-title" style={styles.title}>
              Chaos Control{'\n'}Center
            </Text>
            <Text style={styles.subtitle}>
              Principal Level Mobile Monitoring
            </Text>
          </View>

          {/* STATUS CARDS */}
          <View testID="status-cards" style={styles.statusRow}>
            <StatusCard
              title="Backend API"
              status={error ? 'degraded' : 'operational'}
              testID="api-card"
            />
            <StatusCard
              title="DB Connection"
              status={submitting ? 'busy' : 'stable'}
              testID="db-card"
            />
            <StatusCard
              title="Cache Layer"
              status="operational"
              testID="cache-card"
            />
          </View>

          {/* ACTION FORM */}
          <View testID="action-form" style={styles.glassCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.sectionTitle}>Trigger Chaos Action</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                testID="item-name"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Resilience Test"
                placeholderTextColor="#64748b"
                editable={!submitting}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Impact Value</Text>
              <TextInput
                testID="item-value"
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder="0 - 100"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                editable={!submitting}
              />
            </View>

            <TouchableOpacity
              testID="submit-btn"
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Processing Submission...' : 'Commit to Database'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* REGISTRY LIST */}
          <View testID="registry-section" style={styles.glassCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Registry</Text>
              <TouchableOpacity testID="refresh-btn" onPress={fetchItems}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <View testID="items-container">
              {loading ? (
                <>
                  <SkeletonLoader />
                  <SkeletonLoader />
                  <SkeletonLoader />
                </>
              ) : items.length === 0 ? (
                <Text testID="empty-state" style={styles.emptyText}>
                  No records found.
                </Text>
              ) : (
                items.map((item, idx) => (
                  <ItemRow key={item.id || idx} item={item} index={idx} />
                ))
              )}
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* TOAST SYSTEM */}
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    color: '#60a5fa',
    lineHeight: 42,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  accentBar: {
    width: 4,
    height: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshText: {
    color: '#60a5fa',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 40,
  },
});
