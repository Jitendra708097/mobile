/**
 * @module TodaySummaryCard
 * @description Summary card showing today's worked time, session count, status.
 *              Displayed below the check-in button on HomeScreen.
 *              Called by: HomeScreen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors }      from '../../theme/colors.js';
import { typography }  from '../../theme/typography.js';
import { spacing }     from '../../theme/spacing.js';
import AppCard         from '../common/AppCard.jsx';
import StatusBadge     from '../common/StatusBadge.jsx';
import { formatDuration, formatTime } from '../../utils/formatters.js';
import { SESSION }     from '../../utils/constants.js';

/**
 * @param {object} props
 * @param {number} props.totalWorkedMins    - Total minutes worked today
 * @param {number} props.sessionsToday      - Sessions used today
 * @param {string} [props.todayStatus]      - e.g. 'present', 'absent'
 * @param {string} [props.firstCheckInTime] - ISO string of first check-in
 * @param {string} [props.lastCheckOutTime] - ISO string of last check-out
 * @param {boolean}[props.isActive]         - Whether a session is currently open
 * @param {string} [props.timezone]         - Org timezone
 * @param {boolean}[props.isLate]           - Late flag
 */
const TodaySummaryCard = ({
  totalWorkedMins = 0,
  sessionsToday   = 0,
  todayStatus,
  firstCheckInTime,
  lastCheckOutTime,
  isActive       = false,
  timezone       = 'Asia/Kolkata',
  isLate          = false,
  maxSessionsPerDay = SESSION.MAX_SESSIONS_PER_DAY,
}) => {
  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Today's Summary</Text>
        {todayStatus ? (
          <StatusBadge status={isLate ? 'late' : todayStatus} size="sm" />
        ) : null}
      </View>

      {/* Main worked time */}
      <Text style={styles.workedTime}>
        {formatDuration(totalWorkedMins)}
      </Text>
      <Text style={styles.workedLabel}>total worked</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{firstCheckInTime ? formatTime(firstCheckInTime, timezone) : '--:--'}</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </View>

        <View style={[styles.stat, styles.statDivider]}>
          <Text style={[styles.statValue, isActive && styles.activeValue]}>
            {isActive ? 'Active' : lastCheckOutTime ? formatTime(lastCheckOutTime, timezone) : '--:--'}
          </Text>
          <Text style={styles.statLabel}>Check-out</Text>
        </View>

        <View style={[styles.stat, styles.statDivider]}>
          <Text style={styles.statValue}>
            {sessionsToday}/{maxSessionsPerDay}
          </Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.base,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heading: {
    flex: 1,
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.sm,
    color:        colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  workedTime: {
    fontFamily: typography.fontMonoMed,
    fontSize:   typography['3xl'],
    color:      colors.textPrimary,
    lineHeight: typography['3xl'] * 1.1,
  },
  workedLabel: {
    fontFamily:  typography.fontRegular,
    fontSize:    typography.sm,
    color:       colors.textMuted,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    width:           '100%',
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    paddingTop:      spacing.md,
  },
  stat: {
    alignItems:   'center',
    flex:          1,
    minWidth:      0,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statValue: {
    fontFamily:   typography.fontMonoMed,
    fontSize:     typography.base,
    color:        colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign:    'center',
  },
  activeValue: {
    fontFamily: typography.fontSemiBold,
    color: colors.success,
  },
  statLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});

export default TodaySummaryCard;
