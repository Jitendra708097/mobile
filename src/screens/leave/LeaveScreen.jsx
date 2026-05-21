/**
 * @module LeaveScreen
 * @description Leave management screen with 3 tabs: Balance, Apply, History.
 *              Tab 1 — Balance: 4 leave type cards with progress bars.
 *              Tab 2 — Apply:   Date picker, type, reason, submit form.
 *              Tab 3 — History: Paginated leave request list with cancel.
 *              Called by: MainNavigator (Tab 3 — Leave).
 */

import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton  from '../../components/common/AppButton.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { EmptyState, ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
} from '../../utils/constants.js';
import { formatDateRange, countWorkingDays } from '../../utils/formatters.js';
import { applyLeave, cancelLeave, getLeaveBalance, getLeaveHistory, getLeaveTypes } from '../../services/leaveService.js';

// ── Leave Balance Card ───────────────────────────────────────────────────────
const BalanceCard = ({ type, balance }) => {
  const { total = 0, used = 0, remaining = 0 } = balance || {};
  const progress = total > 0 ? (used / total) : 0;

  const TYPE_COLORS = {
    casual:   colors.info,
    sick:     colors.danger,
    earned:   colors.success,
    optional: colors.warning,
  };
  const color = TYPE_COLORS[type] || colors.accent;

  return (
    <View style={[bStyles.card, { borderTopColor: color }]}>
      <Text style={bStyles.typeLabel}>{balance?.label || LEAVE_TYPE_LABELS[type] || type}</Text>
      <Text style={[bStyles.remaining, { color }]}>{remaining}</Text>
      <Text style={bStyles.unit}>days left</Text>
      <View style={bStyles.track}>
        <View style={[bStyles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={bStyles.detail}>{used} used of {total}</Text>
    </View>
  );
};

const bStyles = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: colors.bgSurface,
    borderRadius:    14,
    padding:         spacing.base,
    borderTopWidth:  4,
    marginBottom:    spacing.sm,
    boxShadow:       '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation:       2,
  },
  typeLabel: {
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.sm,
    color:        colors.textSecondary,
    marginBottom: spacing.sm,
  },
  remaining: {
    fontFamily: typography.fontBold,
    fontSize:   typography['3xl'],
    lineHeight: typography['3xl'],
  },
  unit: {
    fontFamily:   typography.fontRegular,
    fontSize:     typography.xs,
    color:        colors.textMuted,
    marginBottom: spacing.sm,
  },
  track: {
    height:          4,
    backgroundColor: colors.border,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    spacing.xs,
  },
  fill: { height: 4, borderRadius: 2 },
  detail: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.textMuted,
  },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
const TABS = ['Balance', 'Apply', 'History'];

const LeaveScreen = () => {
  const [activeTab,  setActiveTab]  = useState(0);
  const [balances,   setBalances]   = useState({});
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [history,    setHistory]    = useState([]);
  const [isLoading,  setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [isRefreshing, setRefreshing] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyType, setHistoryType] = useState('all');
  const applyScrollRef = useRef(null);

  // Apply form
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES.CASUAL);
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [reason,    setReason]    = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState('morning');

  useEffect(() => { 
    const init =  async() => {
      try {
            await fetchBalance(); 
            await fetchTypes();
            await fetchHistory();
      } catch (error) {
        console.log("fetch Balanace Error: ",error);
      }
    }

    init();
   }, []);

  const fetchBalance = async () => {
    try {
      const data = await getLeaveBalance();
      setBalances(data);
    } catch { setBalances({}); }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getLeaveHistory({ limit: 20 });
      setHistory(data.requests || []);
    } catch { setHistory([]); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    if (!fromDate || !toDate) { setError('Please select dates.'); return; }
    if (!reason.trim())       { setError('Reason is required.'); return; }
    setError(''); setLoading(true);
    try {
      await applyLeave({ leaveType, fromDate, toDate, reason: reason.trim(), isHalfDay, halfDayPeriod: isHalfDay ? halfDayPeriod : null });
      setSuccess('Leave request submitted successfully.');
      setReason(''); setFromDate(''); setToDate('');
      fetchBalance(); fetchHistory();
      setTimeout(() => { setSuccess(''); setActiveTab(2); }, 1800);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to submit leave request.');
    } finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    try {
      await cancelLeave(id);
      fetchHistory();
    } catch { /* non-critical */ }
  };

  const fetchTypes = async () => {
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data.types || []);
    } catch { setLeaveTypes([]); }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBalance(), fetchHistory()]);
    } finally {
      setRefreshing(false);
    }
  };

  const workingDays = fromDate && toDate ? countWorkingDays(fromDate, toDate) : 0;
  const dynamicTypeOptions = leaveTypes.length > 0
    ? leaveTypes.map((item) => ({ type: item.type || item.code, label: item.label || item.name, halfDayAllowed: item.halfDayAllowed !== false }))
    : Object.entries(LEAVE_TYPE_LABELS).map(([type, label]) => ({ type, label, halfDayAllowed: true }));
  const selectedType = dynamicTypeOptions.find((item) => item.type === leaveType);
  const selectedBalance = balances[leaveType];
  const pendingCount = history.filter((item) => item.status === 'pending').length;
  const filteredHistory = history.filter((item) => {
    const statusMatches = historyStatus === 'all' || item.status === historyStatus;
    const typeMatches = historyType === 'all' || item.leaveType === historyType;
    return statusMatches && typeMatches;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Leave</Text>
          <Text style={styles.subtitle}>Balance, requests, and approvals</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setActiveTab(1)}
          activeOpacity={0.85}
        >
          <Text style={styles.headerActionText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
              {tab}{tab === 'History' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab 0: Balance ── */}
      {activeTab === 0 && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
        >
          <View style={styles.grid}>
            {dynamicTypeOptions.map(({ type }) => (
              <View key={type} style={styles.cardWrap}>
                <BalanceCard type={type} balance={balances[type]} />
              </View>
            ))}
          </View>
          <AppButton
            label="Apply for Leave"
            onPress={() => setActiveTab(1)}
            fullWidth
            style={{ marginTop: spacing.base }}
          />
        </ScrollView>
      )}

      {/* ── Tab 1: Apply ── */}
      {activeTab === 1 && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            ref={applyScrollRef}
            contentContainerStyle={styles.applyScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
          >
            {success && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}
            {error && <ErrorMessage message={error} />}

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Leave Type</Text>
              <View style={styles.pillRow}>
                {dynamicTypeOptions.map(({ type: k, label: v }) => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.pill, leaveType === k && styles.pillActive]}
                    onPress={() => {
                      setLeaveType(k);
                      if (balances[k]?.halfDayAllowed === false) setIsHalfDay(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.pillText, leaveType === k && styles.pillTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputCol}>
                  <Text style={styles.label}>From Date</Text>
                  <TextInput
                    value={fromDate}
                    onChangeText={setFromDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                  <View style={styles.quickDateRow}>
                    <TouchableOpacity style={styles.quickDateBtn} onPress={() => setFromDate(dayjs().format('YYYY-MM-DD'))}>
                      <Text style={styles.quickDateText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickDateBtn} onPress={() => setFromDate(dayjs().add(1, 'day').format('YYYY-MM-DD'))}>
                      <Text style={styles.quickDateText}>Tomorrow</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dateInputCol}>
                  <Text style={styles.label}>To Date</Text>
                  <TextInput
                    value={toDate}
                    onChangeText={setToDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                  <View style={styles.quickDateRow}>
                    <TouchableOpacity style={styles.quickDateBtn} onPress={() => setToDate(fromDate || dayjs().format('YYYY-MM-DD'))}>
                      <Text style={styles.quickDateText}>Same</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickDateBtn} onPress={() => setToDate(dayjs(fromDate || undefined).add(1, 'day').format('YYYY-MM-DD'))}>
                      <Text style={styles.quickDateText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.halfDayRow, isHalfDay && styles.halfDayActive]}
                onPress={() => selectedType?.halfDayAllowed === false ? null : setIsHalfDay((p) => !p)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.halfDayText}>Half Day</Text>
                  <Text style={styles.halfDaySub}>Counts as 0.5 working day</Text>
                </View>
                <Text style={styles.halfDayCheck}>{isHalfDay ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>

              {isHalfDay && (
                <View style={styles.filterRow}>
                  {['morning', 'afternoon'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[styles.filterChip, halfDayPeriod === period && styles.filterChipActive]}
                      onPress={() => setHalfDayPeriod(period)}
                    >
                      <Text style={[styles.filterText, halfDayPeriod === period && styles.filterTextActive]}>
                        {period === 'morning' ? 'Morning' : 'Afternoon'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {workingDays > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewDays}>{isHalfDay ? 0.5 : workingDays} working day{workingDays !== 1 ? 's' : ''}</Text>
                  {selectedBalance && (
                    <Text style={styles.previewBalance}>
                      {selectedBalance.remaining} days remaining - {selectedBalance.remaining >= workingDays ? 'Available' : 'Low balance'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                onFocus={() => setTimeout(() => applyScrollRef.current?.scrollToEnd({ animated: true }), 250)}
                placeholder="Reason for leave..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textarea]}
              />

              <AppButton
                label="Submit Leave Request"
                onPress={handleApply}
                loading={isLoading}
                fullWidth
                style={styles.submitButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Tab 2: History ── */}
      {activeTab === 2 && (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
          ListHeaderComponent={
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterRow}>
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, historyStatus === status && styles.filterChipActive]}
                    onPress={() => setHistoryStatus(status)}
                  >
                    <Text style={[styles.filterText, historyStatus === status && styles.filterTextActive]}>
                      {status === 'all' ? 'All' : status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.filterRow}>
                {['all', ...dynamicTypeOptions.map((item) => item.type)].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, historyType === type && styles.filterChipActive]}
                    onPress={() => setHistoryType(type)}
                  >
                    <Text style={[styles.filterText, historyType === type && styles.filterTextActive]}>
                      {type === 'all' ? 'All' : (dynamicTypeOptions.find((item) => item.type === type)?.label || LEAVE_TYPE_LABELS[type] || type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <View style={styles.historyTop}>
                <StatusBadge status={item.status} size="sm" />
                <Text style={styles.historyDays}>{item.daysCount} day{item.daysCount !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.historyType}>{dynamicTypeOptions.find((option) => option.type === item.leaveType)?.label || LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType}</Text>
              <Text style={styles.historyDates}>{formatDateRange(item.fromDate, item.toDate)}</Text>
              <Text style={styles.historyReason} numberOfLines={2}>{item.reason}</Text>
              {item.status === 'pending' && (
                <TouchableOpacity
                  onPress={() => handleCancel(item.id)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Cancel Request</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            !isLoading && (
              <EmptyState icon="L" title="No leave requests" subtitle="Your leave history will appear here" />
            )
          }
          ListFooterComponent={
            isLoading && <ActivityIndicator color={colors.accent} style={{ margin: spacing.xl }} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bgPrimary },
  flex: { flex: 1 },
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  applyScroll: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'] * 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    backgroundColor: colors.bgPrimary,
  },
  headerText: { flex: 1, paddingRight: spacing.base },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.textPrimary,
    lineHeight: typography['2xl'] * 1.15,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    minHeight: 40,
    paddingHorizontal: spacing.base,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  headerActionText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textInverse,
  },

  tabBar: {
    flexDirection:   'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  tab: {
    flex:            1,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems:      'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: colors.bgSurface,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.08)',
    elevation: 1,
  },
  tabText: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    color:      colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: { color: colors.accent, fontFamily: typography.fontSemiBold },

  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent: 'space-between',
  },
  cardWrap: {
    width: '48%',
    marginBottom: spacing.sm,
  },

  sectionLabel: {
    fontFamily:      typography.fontMedium,
    fontSize:        typography.sm,
    color:           colors.textSecondary,
    marginBottom:    spacing.sm,
  },
  pillRow: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             spacing.sm,
  },
  pill: {
    width: '48%',
    minHeight:         44,
    borderRadius:      10,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    backgroundColor:   colors.bgSubtle,
    borderWidth:       1,
    borderColor:       colors.border,
    justifyContent:    'center',
  },
  pillActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  pillText:   { fontFamily: typography.fontMedium, fontSize: typography.sm, color: colors.textSecondary, textAlign: 'center' },
  pillTextActive: { color: colors.accent },

  formPad:  { paddingHorizontal: spacing.base },
  formSection: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
    boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInputCol: {
    flex: 1,
  },

  // ── TextInput Styles ─────────────────────────────────────────────────────────
  label: {
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.sm,
    color:        colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      12,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    minHeight:         46,
    fontFamily:        typography.fontRegular,
    fontSize:          typography.sm,
    color:             colors.textPrimary,
    backgroundColor:   colors.bgSubtle,
  },
  textarea: {
    minHeight: 108,
    textAlignVertical: 'top',
    marginBottom: spacing.base,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickDateBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.accent,
  },

  halfDayRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.bgSubtle,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
    marginTop:       spacing.base,
  },
  halfDayActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  halfDayText:   { fontFamily: typography.fontMedium, fontSize: typography.base, color: colors.textPrimary },
  halfDaySub:    { fontFamily: typography.fontRegular, fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  halfDayCheck:  { fontFamily: typography.fontBold,   fontSize: typography.lg,   color: colors.accent },

  previewBox: {
    backgroundColor: colors.accentLight,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
  },
  previewDays: {
    fontFamily: typography.fontBold,
    fontSize:   typography.md,
    color:      colors.accent,
  },
  previewBalance: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textSecondary,
    marginTop:  spacing.xs,
  },
  submitButton: {
    marginTop: spacing.xs,
  },

  successBox: {
    backgroundColor: colors.successLight,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
    alignItems:      'center',
  },
  successText: { fontFamily: typography.fontSemiBold, fontSize: typography.base, color: colors.success },

  historyItem: {
    backgroundColor: colors.bgSurface,
    borderRadius:    14,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
    boxShadow:       '0px 1px 6px rgba(0, 0, 0, 0.05)',
    elevation:       1,
  },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  historyDays: { fontFamily: typography.fontMonoMed, fontSize: typography.sm, color: colors.textSecondary },
  historyType: { fontFamily: typography.fontSemiBold, fontSize: typography.base, color: colors.textPrimary, marginBottom: 2 },
  historyDates: { fontFamily: typography.fontRegular, fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  historyReason: { fontFamily: typography.fontRegular, fontSize: typography.sm, color: colors.textMuted },
  cancelBtn: {
    marginTop:    spacing.sm,
    alignSelf:    'flex-start',
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.dangerLight,
  },
  cancelText: { fontFamily: typography.fontMedium, fontSize: typography.xs, color: colors.danger },
  filterBlock: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  filterLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  filterText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: colors.accent,
  },
});

export default LeaveScreen;
