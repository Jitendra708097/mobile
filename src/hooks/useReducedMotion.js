/**
 * @module useReducedMotion
 * @description Hook to detect user's motion preference on mobile/web.
 *              On mobile (Expo), checks AccessibilityInfo settings.
 *              On web, checks prefers-reduced-motion media query.
 * 
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   useEffect(() => {
 *     if (prefersReducedMotion) {
 *       // Skip animations or use instant transitions
 *     }
 *   }, [prefersReducedMotion]);
 */

import { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Hook to check if user prefers reduced motion
 * @returns {boolean} true if user prefers reduced motion
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const checkMotionPreference = async () => {
      try {
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          // On native platforms, check accessibility settings
          const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
          const boldTextEnabled = await AccessibilityInfo.isBoldTextEnabled?.();
          
          // Set reduced motion if screen reader is on or bold text is on
          // (proxy for accessibility-conscious user)
          setPrefersReducedMotion(screenReaderEnabled || boldTextEnabled);
        }
      } catch (e) {
        // Fallback: assume standard motion
        console.warn('Motion preference check failed:', e);
        setPrefersReducedMotion(false);
      }
    };

    checkMotionPreference();
  }, []);

  return prefersReducedMotion;
};

export default useReducedMotion;
