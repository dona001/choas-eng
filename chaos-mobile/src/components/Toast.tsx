/**
 * Toast Component — Matches web frontend's AnimatePresence toast system
 * Displays success/error notifications with slide-up animation
 * testID="toast-msg" for Detox chaos assertions
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { ToastMessage } from '../hooks/useItems';

interface ToastProps {
    toast: ToastMessage | null;
    onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (toast) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 100,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [toast, translateY, opacity]);

    if (!toast) return null;

    const isSuccess = toast.type === 'success';

    return (
        <Animated.View
            testID="toast-msg"
            style={[
                styles.container,
                isSuccess ? styles.successBorder : styles.errorBorder,
                {
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <TouchableOpacity
                onPress={onDismiss}
                style={styles.inner}
                activeOpacity={0.8}
            >
                <View
                    style={[
                        styles.dot,
                        { backgroundColor: isSuccess ? '#10b981' : '#ef4444' },
                    ]}
                />
                <Text
                    testID="toast-text"
                    style={[
                        styles.text,
                        { color: isSuccess ? '#34d399' : '#f87171' },
                    ]}
                    numberOfLines={2}
                >
                    {toast.msg}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        right: 16,
        left: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    successBorder: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    errorBorder: {
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    text: {
        fontWeight: '700',
        fontSize: 14,
        flex: 1,
    },
});
