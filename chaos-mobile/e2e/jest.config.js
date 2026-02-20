/** @type {import('jest').Config} */
module.exports = {
    rootDir: '..',
    testMatch: ['<rootDir>/e2e/**/*.test.ts'],
    testTimeout: 120000,
    maxWorkers: 1,
    globalSetup: 'detox/runners/jest/globalSetup',
    globalTeardown: 'detox/runners/jest/globalTeardown',
    reporters: [
        'default',
        ['<rootDir>/e2e/reporters/extent-reporter.js', {}],
    ],
    testEnvironment: 'detox/runners/jest/testEnvironment',
    verbose: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/e2e/setup.ts'],
};
