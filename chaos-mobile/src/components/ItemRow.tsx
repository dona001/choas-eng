/**
 * ItemRow Component — Renders a single item from the registry
 * Matches web frontend's item display with fade-in animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Item } from '../services/api';

interface ItemRowProps {
    item: Item;
    index: number;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, index }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim, index]);

    return (
        <Animated.View
            testID={`item-row-${item.id || index}`}
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.id}>ID: {item.id || 'N/A'}</Text>
            </View>
            <Text style={styles.value}>+{item.value}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(30,41,59,0.4)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    name: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    id: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 2,
    },
    value: {
        color: '#34d399',
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: '700',
    },
});
