/**
 * API Configuration
 * Reads from environment or defaults for development/testing
 */

// In Expo, we use process.env or expo-constants
// For chaos tests, these can be overridden via .detoxrc.js launch args
const getApiBaseUrl = (): string => {
    // Priority: Environment variable > Default
    if (process.env.EXPO_PUBLIC_API_BASE_URL) {
        return process.env.EXPO_PUBLIC_API_BASE_URL;
    }
    // Default: connect to local Spring Boot microservice
    return 'http://localhost:8080';
};

export const API_CONFIG = {
    BASE_URL: getApiBaseUrl(),
    TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10),
    RETRY_COUNT: parseInt(process.env.EXPO_PUBLIC_API_RETRY_COUNT || '3', 10),
    RETRY_DELAY: parseInt(process.env.EXPO_PUBLIC_API_RETRY_DELAY || '1000', 10),
};

export default API_CONFIG;
