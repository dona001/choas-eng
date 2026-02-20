/**
 * SkeletonLoader Component — Matches web frontend's ItemSkeleton
 * Animated placeholder shown during data loading
 * testID="skeleton-loader" for Detox chaos assertions
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export const SkeletonLoader: React.FC = () => {
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Detox synchronization issues occur with infinite loops.
        // We skip the animation if we're in a test environment.
        // In Expo, launchArgs are often shared via process.env or similar.
        const isTest = process.env.DETOX === 'true' || process.env.NODE_ENV === 'test';

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            { iterations: 10 }
        );

        if (!isTest) {
            animation.start();
        } else {
            shimmerAnim.setValue(0.5);
        }

        return () => animation.stop();
    }, [shimmerAnim]);

    return (
        <View testID="skeleton-loader" style={styles.container}>
            <View style={styles.content}>
                <Animated.View
                    style={[styles.lineWide, { opacity: shimmerAnim }]}
                />
                <Animated.View
                    style={[styles.lineNarrow, { opacity: shimmerAnim }]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(30,41,59,0.4)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    content: {
        flex: 1,
        gap: 8,
    },
    lineWide: {
        height: 16,
        backgroundColor: '#334155',
        borderRadius: 8,
        width: '50%',
    },
    lineNarrow: {
        height: 8,
        backgroundColor: '#334155',
        borderRadius: 4,
        width: '25%',
    },
});
