import { device } from 'detox';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper to interface with jest-html-reporters
 */
export const reportHelper = {
    /**
     * Attach a file to the current test report
     */
    async attach(filePath: string, description: string) {
        try {
            // @ts-ignore - addAttach is injected by jest-html-reporters/helper
            const { addAttach } = require('jest-html-reporters/helper');
            if (addAttach && fs.existsSync(filePath)) {
                await addAttach({
                    attach: fs.readFileSync(filePath),
                    description,
                    bufferFormat: path.extname(filePath).replace('.', ''),
                });
            }
        } catch (e) {
            console.error('Failed to attach to report:', e);
        }
    },

    /**
     * Log info to the report context
     */
    async log(message: string) {
        try {
            // @ts-ignore
            const { addMsg } = require('jest-html-reporters/helper');
            if (addMsg) {
                await addMsg({ message });
            }
        } catch (e) {
            // Ignore
        }
    },

    /**
     * Capture and attach execution metadata
     */
    async attachMetadata() {
        const metadata = {
            Device: device.name,
            Platform: device.getPlatform(),
            Timestamp: new Date().toISOString(),
            DetoxVersion: require('detox/package.json').version,
        };

        await this.log(`Execution Metadata: ${JSON.stringify(metadata, null, 2)}`);
    }
};
