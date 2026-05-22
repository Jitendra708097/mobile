/**
 * @module HistoryScreen
 * @description Monthly attendance history with calendar dots and day list.
 *              Month picker (prev/next arrows).
 *              Summary strip: Present | Absent | Late | On Leave.
 *              Tap a day row → opens DayDetailSheet.
 *              FAB → RegularisationModal.
 *              Called by: MainNavigator (Tab 2 — History).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import api from '../../api/axiosInstance.js';
import AttendanceCalendar from '../../components/history/AttendanceCalendar.jsx';
import DayRow             from '../../components/history/DayRow.jsx';
import { EmptyState }     from '../../components/common/CommonComponents.jsx';
import DayDetailSheet     from './DayDetailSheet.jsx';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import { formatMonthYear } from '../../utils/formatters.js';

const HistoryScreen = ({ navigation }) => {
  const [month,       setMonth]       = useState(dayjs());
  const [records,     setRecords]     = useState([]);
  const [attendanceMap,setMap]        = useState({});
  const [summary,     setSummary]     = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [isLoading,   setLoading]     = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDetail,  setShowDetail]  = useState(false);
  const showDetailRef = useRef(false);

  const closeDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedDay(null);
  }, []);

  useEffect(() => {
    showDetailRef.current = showDetail;
  }, [showDetail]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchHistory();
      } catch (error) {
        console.log("FetchHistory Error: ", error);
      }
    };
    fetchData();
  }, [month]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/history', {
        params: { month: month.format('YYYY-MM'), limit: 31 },
      });
      const data = res.data.data;
      setRecords(data.records || []);
      setMap(data.attendanceMap || {});
      setSummary(data.summary   || { present: 0, absent: 0, late: 0, onLeave: 0 });
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async () => {
    setRefreshing(true);
    try {
      await fetchHistory();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDayPress = (dateStr) => {
    const record = records.find((r) => r.date === dateStr);
    if (record) { setSelectedDay(record); setShowDetail(true); }
  };

  useFocusEffect(
    useCallback(() => {
      const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showDetailRef.current) {
          closeDetail();
          return true;
        }
        return false;
      });

      return () => {
        backSub.remove();
        closeDetail();
      };
    }, [closeDetail])
  );

  const prevMonth = () => setMonth((m) => m.subtract(1, 'month'));
  const nextMonth = () => setMonth((m) => m.add(1, 'month'));
  const canGoNext = month.isBefore(dayjs(), 'month');

  const SummaryStrip = () => (
    <View style={styles.strip}>
      {[
        { label: 'Present', count: summary.present, color: colors.success },
        { label: 'Absent',  count: summary.absent,  color: colors.danger  },
        { label: 'Late',    count: summary.late,     color: colors.warning },
        { label: 'Leave',   count: summary.onLeave,  color: colors.info    },
      ].map(({ label, count, color }) => (
        <View key={label} style={styles.statBox}>
          <Text style={[styles.statNum, { color }]}>{count}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {/* Month picker */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
          <Ionicons name="chevron-back" size={26} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonthYear(month.toDate())}</Text>
        <TouchableOpacity
          onPress={nextMonth}
          style={styles.arrow}
          disabled={!canGoNext}
        >
          <Ionicons name="chevron-forward" size={26} color={canGoNext ? colors.accent : colors.border} />
        </TouchableOpacity>
      </View>
      {!month.isSame(dayjs(), 'month') && (
        <TouchableOpacity style={styles.todayButton} onPress={() => setMonth(dayjs())}>
          <Text style={styles.todayButtonText}>Back to Today</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.requestsButton}
        onPress={() => navigation.navigate('RegularisationRequests')}
        activeOpacity={0.85}
      >
        <Ionicons name="clipboard-outline" size={17} color={colors.accent} />
        <Text style={styles.requestsButtonText}>Track Regularisations</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </TouchableOpacity>

      <FlatList
        ListHeaderComponent={
          <>
            <SummaryStrip />
            <View style={styles.legendRow}>
              {[
                ['Present', colors.success],
                ['Absent', colors.danger],
                ['Late', colors.warning],
                ['Leave', colors.info],
              ].map(([label, color]) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
            <AttendanceCalendar
              month={month.toDate()}
              attendanceMap={attendanceMap}
              onDayPress={handleDayPress}
            />
            <Text style={styles.listHeading}>Daily Records</Text>
          </>
        }
        data={records}
        keyExtractor={(r) => r.date}
        renderItem={({ item }) => (
          <DayRow
            record={item}
            onPress={() => handleDayPress(item.date)}
          />
        )}
        ListEmptyComponent={
          !isLoading && (
            <EmptyState
              icon="R"
              title="No records this month"
              subtitle="Your attendance history will appear here"
            />
          )
        }
        ListFooterComponent={
          isLoading && <ActivityIndicator color={colors.accent} style={{ margin: spacing.xl }} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshHistory} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Regularisation', {
          date: selectedDay?.date || undefined,
        })}
      >
        <Ionicons name="create-outline" size={22} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Day detail sheet */}
      <DayDetailSheet
        visible={showDetail}
        record={selectedDay}
        onClose={closeDetail}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },

  monthRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical:  spacing.base,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  arrow:    { padding: spacing.sm },
  monthLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.md,
    color:      colors.textPrimary,
  },
  todayButton: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  todayButtonText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.accent,
  },
  requestsButton: {
    minHeight: 44,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: 8,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestsButtonText: {
    flex: 1,
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
  },

  strip: {
    flexDirection:   'row',
    justifyContent:  'space-around',
    backgroundColor: colors.bgSurface,
    paddingVertical: spacing.base,
    marginBottom:    spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  statBox:   { alignItems: 'center' },
  statNum: {
    fontFamily: typography.fontBold,
    fontSize:   typography.xl,
  },
  statLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },

  listHeading: {
    fontFamily:       typography.fontSemiBold,
    fontSize:         typography.sm,
    color:            colors.textMuted,
    letterSpacing:    0.8,
    textTransform:    'uppercase',
    marginHorizontal: spacing.base,
    marginBottom:     spacing.sm,
    marginTop:        spacing.base,
  },

  fab: {
    position:        'absolute',
    bottom:          spacing.xl,
    right:           spacing.xl,
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       '0px 6px 12px rgba(13, 115, 119, 0.3)',
    elevation:       8,
  },
});

export default HistoryScreen;
