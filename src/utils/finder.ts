import fs from 'node:fs/promises';
import type * as vscode from 'vscode';

import { type Cache } from './cache';
import { getConfig } from './config';
import { getGlobalVendorDir } from './composer';
import { findFilePriority } from './finder-util';

const findFixerPath = async (resource: vscode.Uri) => {
    const workspacePaths = [
        '{$workspaceFolder}/tools/*/vendor/bin/php-cs-fixer',
        '{$workspaceFolder}/vendor/bin/php-cs-fixer',
    ];

    // global is always lowest priority
    const globalPaths: string[] = [];
    const globalVendor = getGlobalVendorDir();
    if (globalVendor) {
        globalPaths.push(`${globalVendor}/bin/php-cs-fixer`);
    }

    const preferWorkspace = getConfig<boolean>('prefer-workspace-fixer');
    const userFixerPaths = getConfig<string[]>('fixer-paths') ?? [];

    const paths = preferWorkspace
        ? [...workspacePaths, ...userFixerPaths, ...globalPaths]
        : [...userFixerPaths, ...workspacePaths, ...globalPaths];

    return await findFilePriority(resource, fs.constants.X_OK, paths);
};

export const getFixerBin = async (
    workspaceCache: Cache,
    document: vscode.TextDocument
): Promise<string> => {
    let fixerBin = await workspaceCache.get('fixer', () => findFixerPath(document.uri));
    if (!fixerBin) {
        await workspaceCache.invalidate('fixer');
        fixerBin = await workspaceCache.get('fixer', () => findFixerPath(document.uri));

        if (!fixerBin) {
            throw new Error('could not locate fixer bin');
        }
    }

    return await fs
        .access(fixerBin, fs.constants.X_OK)
        .then(() => fixerBin)
        .catch(async () => {
            await workspaceCache.invalidate('fixer');
            return await getFixerBin(workspaceCache, document);
        });
};

const findConfigPath = async (resource: vscode.Uri) => {
    const workspacePaths = [
        '{$workspaceFolder}/.php-cs-fixer.php',
        '{$workspaceFolder}/.php-cs-fixer.dist.php',
    ];

    const preferWorkspace = getConfig<boolean>('prefer-workspace-config');
    const userConfigPaths = getConfig<string[]>('config-paths') ?? [];

    const paths = preferWorkspace
        ? [...workspacePaths, ...userConfigPaths]
        : [...workspacePaths, ...userConfigPaths];

    return await findFilePriority(resource, fs.constants.R_OK, paths);
};

export const getConfigPath = async (
    workspaceCache: Cache,
    document: vscode.TextDocument
): Promise<string> => {
    let configPath = await workspaceCache.get('config', () => findConfigPath(document.uri));
    if (!configPath) {
        await workspaceCache.invalidate('config');
        configPath = await workspaceCache.get('config', () => findConfigPath(document.uri));

        if (!configPath) {
            throw new Error('could not locate config path');
        }
    }

    return await fs
        .access(configPath, fs.constants.R_OK)
        .then(() => configPath)
        .catch(async () => {
            await workspaceCache.invalidate('config');
            return await getConfigPath(workspaceCache, document);
        });
};
