/**
 * @module AttendanceCalendar
 * @description Monthly calendar grid with full-cell colored status days.
 *   Green  → present
 *   Red    → absent
 *   Amber  → half day / late
 *   Blue   → on leave
 *   Grey   → weekend / holiday / no data
 *   Empty  → future date
 * Called by: HistoryScreen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';

const STATUS_STYLES = {
  present: {
    bg: colors.successLight,
    border: colors.success,
    text: colors.success,
  },
  absent: {
    bg: colors.dangerLight,
    border: colors.danger,
    text: colors.danger,
  },
  half_day: {
    bg: colors.warningLight,
    border: colors.warning,
    text: colors.warning,
  },
  half_day_early: {
    bg: colors.warningLight,
    border: colors.warning,
    text: colors.warning,
  },
  late: {
    bg: colors.warningLight,
    border: colors.warning,
    text: colors.warning,
  },
  on_leave: {
    bg: colors.infoLight,
    border: colors.info,
    text: colors.info,
  },
  holiday: {
    bg: colors.accentLight,
    border: colors.accent,
    text: colors.accent,
  },
  weekend: {
    bg: colors.bgSubtle,
    border: colors.border,
    text: colors.textMuted,
  },
  regularisation_pending: {
    bg: colors.warningLight,
    border: colors.warning,
    text: colors.warning,
  },
  incomplete: {
    bg: colors.dangerLight,
    border: colors.danger,
    text: colors.danger,
  },
};

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * @param {object} props
 * @param {Date|string} props.month         - Any date in the target month
 * @param {object}      props.attendanceMap - { 'YYYY-MM-DD': { status, isLate } }
 * @param {function}    [props.onDayPress]  - (dateString: 'YYYY-MM-DD') => void
 */
const AttendanceCalendar = ({ month, attendanceMap = {}, onDayPress }) => {
  const firstDay  = dayjs(month).startOf('month');
  const lastDay   = dayjs(month).endOf('month');
  const startDow  = firstDay.day(); // 0 = Sunday
  const totalDays = lastDay.date();
  const today     = dayjs().format('YYYY-MM-DD');

  // Build grid cells: nulls for leading blank days, then day numbers
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <View style={styles.calendar}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((h, i) => (
          <Text key={i} style={styles.headerCell}>{h}</Text>
        ))}
      </View>

      {/* Day cells in rows of 7 */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`blank-${idx}`} style={styles.cell} />;

          const dateStr  = firstDay.date(day).format('YYYY-MM-DD');
          const record   = attendanceMap[dateStr];
          const status   = typeof record === 'string'
            ? record
            : record?.status || (dayjs(dateStr).isAfter(today) ? null : 'weekend');
          const isToday  = dateStr === today;
          const isLate   = typeof record === 'object' && Boolean(record?.isLate);
          const statusStyle = isLate
            ? STATUS_STYLES.late
            : (status ? STATUS_STYLES[status] : null);

          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.cell}
              onPress={() => onDayPress && record && onDayPress(dateStr)}
              activeOpacity={record ? 0.7 : 1}
            >
              <View
                style={[
                  styles.dayFill,
                  statusStyle && {
                    backgroundColor: statusStyle.bg,
                    borderColor: statusStyle.border,
                  },
                  isToday && styles.cellToday,
                ]}
              >
                <Text style={[
                  styles.dayNum,
                  statusStyle && { color: statusStyle.text },
                  !record && styles.dayNumMuted,
                  isToday && styles.dayNumToday,
                ]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colors.bgSurface,
    borderRadius:    16,
    padding:         spacing.base,
    marginHorizontal: spacing.base,
  },
  headerRow: {
    flexDirection:   'row',
    marginBottom:    spacing.sm,
  },
  headerCell: {
    flex:       1,
    textAlign:  'center',
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.xs,
    color:      colors.textMuted,
  },
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
  },
  cell: {
    width:          `${100 / 7}%`,
    aspectRatio:    1,
    padding:         2,
  },
  dayFill: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     colors.transparent,
  },
  cellToday: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  dayNum: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    color:      colors.textPrimary,
  },
  dayNumToday: {
    color: colors.accent,
  },
  dayNumMuted: {
    color: colors.textMuted,
  },
});

export default AttendanceCalendar;
