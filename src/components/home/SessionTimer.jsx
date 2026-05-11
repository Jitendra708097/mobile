/**
 * @module SessionTimer
 * @description Live ticking session duration counter.
 *              Updates every minute. Displays in DM Mono green.
 *              Called by: CheckOutButton, HomeScreen.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { formatSessionTimer } from '../../utils/formatters.js';

/**
 * @param {object} props
 * @param {string} props.startTime - ISO string of session start
 * @param {string} [props.timezone] - Org timezone
 * @param {object} [props.style]
 */
const SessionTimer = ({ startTime, timezone = 'Asia/Kolkata', style }) => {
  const [display, setDisplay] = useState(formatSessionTimer(startTime, timezone));
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startTime) return;

    setDisplay(formatSessionTimer(startTime, timezone));

    intervalRef.current = setInterval(() => {
      setDisplay(formatSessionTimer(startTime, timezone));
    }, 30000); // update every 30 seconds

    return () => clearInterval(intervalRef.current);
  }, [startTime, timezone]);

  return (
    <Text style={[styles.timer, style]}>{display}</Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    fontFamily: typography.fontMonoMed,
    fontSize:   typography.base,
    color:      colors.success,
  },
});

export default SessionTimer;
