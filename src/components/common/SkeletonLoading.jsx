/**
 * @component SkeletonLoading
 * @description Animated skeleton loader for better perceived performance.
 *              Shows placeholder shimmer effect while content loads.
 *
 * Usage:
 *   <SkeletonLoading type="line" count={3} />
 *   <SkeletonLoading type="avatar" />
 *   <SkeletonLoading type="card" />
 *   <SkeletonLoading type="text" width="70%" />
 */

import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const SkeletonLoading = ({
  type = 'line',
  count = 1,
  width = '100%',
  height = 16,
  style,
  testID = 'skeleton-loader'
}) => {
  // Shimmer animation
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const shimmerInterpolate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return (
          <Animated.View
            style={[
              styles.avatar,
              {
                opacity: shimmerInterpolate,
                backgroundColor: colors.border,
              },
              style,
            ]}
            testID={testID}
          />
        );

      case 'card':
        return (
          <View testID={testID}>
            {/* Card header skeleton */}
            <Animated.View
              style={[
                styles.cardHeader,
                {
                  opacity: shimmerInterpolate,
                  backgroundColor: colors.border,
                },
              ]}
            />
            {/* Card content skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <Animated.View
                key={`line-${i}`}
                style={[
                  styles.line,
                  {
                    marginTop: 12,
                    opacity: shimmerInterpolate,
                    backgroundColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>
        );

      case 'text':
        return (
          <View testID={testID}>
            {Array.from({ length: count }).map((_, i) => (
              <Animated.View
                key={`text-${i}`}
                style={[
                  styles.line,
                  {
                    width,
                    height,
                    marginBottom: i < count - 1 ? 8 : 0,
                    opacity: shimmerInterpolate,
                    backgroundColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>
        );

      case 'line':
      default:
        return (
          <View testID={testID}>
            {Array.from({ length: count }).map((_, i) => (
              <Animated.View
                key={`skeleton-${i}`}
                style={[
                  styles.line,
                  {
                    width,
                    height,
                    marginBottom: i < count - 1 ? 12 : 0,
                    opacity: shimmerInterpolate,
                    backgroundColor: colors.border,
                  },
                  style,
                ]}
              />
            ))}
          </View>
        );
    }
  };

  return renderSkeleton();
};

const styles = StyleSheet.create({
  line: {
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  cardHeader: {
    height: 20,
    borderRadius: 4,
    width: '60%',
    backgroundColor: colors.border,
  },
});

export default SkeletonLoading;
