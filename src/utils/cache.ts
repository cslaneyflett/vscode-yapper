import type * as vscode from 'vscode';

export const cache = async <T>(
    workspace: vscode.Memento,
    key: string,
    restore: () => T | Promise<T>
) => {
    let value = workspace.get<T>(key);
    if (undefined === value || null === value) {
        value = await Promise.resolve(restore());
        await workspace.update(key, value);
    }
    return value;
};

export const invalidate = async (workspace: vscode.Memento, key: string) => {
    await workspace.update(key, undefined);
};

export const cacheGenerator = (workspace: vscode.Memento, namespace: string) => {
    return {
        get: async <T>(key: string, restore: () => T | Promise<T>) =>
            await cache<T>(workspace, namespace + ':' + key, restore),
        invalidate: async (key: string) => {
            await invalidate(workspace, namespace + ':' + key);
        },
    };
};

export type Cache = ReturnType<typeof cacheGenerator>;
