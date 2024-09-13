import { execFileSync } from 'node:child_process';

const composerArgs = [
    '--no-interaction',
    '--quiet',
    '--absolute',
    'global',
    'config',
    'vendor-dir',
] as const;

/**
 * Get the global composer vendor directory.
 *
 * This is retrieved via the `composer global config` command.
 */
export const getGlobalVendorDir = () => {
    try {
        const buffer = execFileSync('composer', composerArgs);
        return buffer.toString().trim();
    } catch (err: unknown) {
        return undefined;
    }
};
