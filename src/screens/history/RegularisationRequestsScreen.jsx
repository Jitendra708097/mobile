import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StatusBadge from '../../components/common/StatusBadge.jsx';
import { EmptyState, ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { fetchMyRegularisations } from '../../services/regularisationService.js';
import { formatDate, formatTime, formatTimeAgo } from '../../utils/formatters.js';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const STATUS_LABELS = {
  pending: 'Pending',
  manager_approved: 'Manager Approved',
  approved: 'Approved',
  rejected: 'Rejected',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'manager_approved', label: 'Manager' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const formatDateOnly = (date) => {
  if (!date) return '--';
  return formatDate(`${date}T00:00:00.000Z`);
};

const TimePair = ({ label, value }) => (
  <View style={styles.timeItem}>
    <Text style={styles.timeLabel}>{label}</Text>
    <Text style={styles.timeValue}>{value ? formatTime(value) : '--:--'}</Text>
  </View>
);

const RegularisationCard = ({ item, highlighted }) => {
  const status = item.status || 'pending';

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.dateText}>{formatDateOnly(item.date)}</Text>
          <Text style={styles.typeText}>Attendance correction</Text>
        </View>
        <StatusBadge status={status} label={STATUS_LABELS[status]} size="sm" />
      </View>

      <View style={styles.timeRow}>
        <TimePair label="Requested In" value={item.requestedCheckIn} />
        <TimePair label="Requested Out" value={item.requestedCheckOut} />
      </View>

      <Text style={styles.reasonLabel}>Reason</Text>
      <Text style={styles.reasonText} numberOfLines={3}>{item.reason || 'No reason added'}</Text>

      {item.rejectionReason ? (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionTitle}>Rejection reason</Text>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      ) : null}

      {item.managerNotes || item.finalNotes || item.approvalNotes ? (
        <View style={styles.approvalBox}>
          <Text style={styles.approvalTitle}>Approval note</Text>
          {item.managerNotes ? <Text style={styles.approvalText}>Manager: {item.managerNotes}</Text> : null}
          {item.finalNotes ? <Text style={styles.approvalText}>Admin: {item.finalNotes}</Text> : null}
          {!item.managerNotes && !item.finalNotes && item.approvalNotes ? (
            <Text style={styles.approvalText}>{item.approvalNotes}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Submitted {formatTimeAgo(item.createdAt)}</Text>
        <Text style={styles.metaText}>{item.evidenceType || 'other'} proof</Text>
      </View>
    </View>
  );
};

const RegularisationRequestsScreen = ({ route }) => {
  const requestId = route?.params?.regularisationId || route?.params?.requestId;
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await fetchMyRegularisations({ limit: 100 });
      setRequests(data?.regularisations || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unable to load regularisation requests.');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(false);
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const filtered = filter === 'all'
      ? requests
      : requests.filter((item) => item.status === filter);

    if (!requestId) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (String(a.id) === String(requestId)) return -1;
      if (String(b.id) === String(requestId)) return 1;
      return 0;
    });
  }, [filter, requestId, requests]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Regularisation Requests</Text>
        <Text style={styles.subtitle}>Track pending, approved, and rejected corrections.</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <ErrorMessage message={error} /> : null}

      {isLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RegularisationCard
              item={item}
              highlighted={String(item.id) === String(requestId)}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadRequests(true)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title="No regularisation requests"
              subtitle="Submitted corrections will appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bgPrimary,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  filterChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.bgSurface,
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
  },
  filterTextActive: {
    color: colors.accent,
    fontFamily: typography.fontSemiBold,
  },
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  cardHighlighted: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  cardTitleBlock: {
    flex: 1,
  },
  dateText: {
    fontFamily: typography.fontBold,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  typeText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  timeItem: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.bgSubtle,
    padding: spacing.sm,
  },
  timeLabel: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  timeValue: {
    fontFamily: typography.fontMonoMed,
    fontSize: typography.sm,
    color: colors.textPrimary,
  },
  reasonLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.textPrimary,
  },
  rejectionBox: {
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    marginTop: spacing.base,
  },
  rejectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.danger,
    marginBottom: 2,
  },
  rejectionText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.danger,
  },
  approvalBox: {
    borderRadius: 8,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    marginTop: spacing.base,
  },
  approvalTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.success,
    marginBottom: 2,
  },
  approvalText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.success,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  metaText: {
    flex: 1,
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
});

export default RegularisationRequestsScreen;
