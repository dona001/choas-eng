/**
 * StatusCard Component — Matches web frontend's StatusCard
 * Shows system health indicators with animated pulse for active states
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface StatusCardProps {
    title: string;
    status: 'operational' | 'stable' | 'degraded' | 'busy';
    testID: string;
}

const statusConfig = {
    operational: { color: '#10b981', text: 'Operational' },
    stable: { color: '#10b981', text: 'Stable' },
    degraded: { color: '#eab308', text: 'Degraded' },
    busy: { color: '#3b82f6', text: 'Syncing...' },
};

export const StatusCard: React.FC<StatusCardProps> = ({ title, status, testID }) => {
    const config = statusConfig[status] || statusConfig.operational;
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (status === 'busy') {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            animation.start();
            return () => animation.stop();
        }
    }, [status, pulseAnim]);

    return (
        <View testID={testID} style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.statusRow}>
                <Animated.View
                    style={[
                        styles.dot,
                        { backgroundColor: config.color, opacity: pulseAnim },
                    ]}
                />
                <Text style={styles.statusText}>{config.text}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 16,
        flex: 1,
    },
    title: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
