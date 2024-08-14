import * as vscode from 'vscode';

export const getConfig = <T>(key: string) => {
    return vscode.workspace.getConfiguration('yapper').get<T>(key);
};
