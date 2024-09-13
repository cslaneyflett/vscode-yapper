import path from 'node:path';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import * as vscode from 'vscode';
import * as tmp from 'tmp';

import { cacheGenerator } from './utils/cache';
import { getConfig } from './utils/config';
import { getFixerBin, getConfigPath } from './utils/finder';

// hooks
let format: vscode.Disposable;
let workspaceCache: ReturnType<typeof cacheGenerator>;

export function activate(context: vscode.ExtensionContext) {
    format = vscode.languages.registerDocumentFormattingEditProvider('php', {
        provideDocumentFormattingEdits: registerDocumentProvider,
    });
    context.subscriptions.push(format);

    workspaceCache = cacheGenerator(context.workspaceState, 'yapper');
}

export function deactivate() {
    format.dispose();
}
// /hooks

const handleError = (fixerBin: string, err: cp.ExecFileException) => {
    if (err.code === 'ENOENT') {
        // TODO: debug the search here
        void vscode.window.showErrorMessage(
            `Unable to find the php-cs-fixer binary. (${fixerBin})`
        );
    } else {
        void vscode.window.showErrorMessage(err.message);
    }

    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw err;
};

const formatDocument = async (document: vscode.TextDocument) => {
    const phpBin = getConfig<string>('php-binary') ?? 'php';
    const fixerBin = await getFixerBin(workspaceCache, document);
    const configPath = await getConfigPath(workspaceCache, document);

    const args: string[] = [];
    const opts: cp.ExecFileOptions = {
        cwd: path.dirname(document.fileName),
        shell: true,
    };

    if (getConfig<boolean>('ignore-env')) {
        opts.env = { PHP_CS_FIXER_IGNORE_ENV: '1' };
    }

    args.push(fixerBin);
    args.push('fix');
    args.push('--no-interaction');

    if (!getConfig<boolean>('use-cache')) {
        args.push('--using-cache=no');
    }

    if (getConfig<boolean>('allow-risky')) {
        args.push('--allow-risky=yes');
    }

    args.push('--config=' + configPath);

    const tmpFile = tmp.fileSync();
    await fs.writeFile(tmpFile.name, document.getText());
    args.push(tmpFile.name);

    return new Promise<string>(function (resolve, reject) {
        // void vscode.window.showInformationMessage(phpBin + ' ' + args.join(' '));
        cp.execFile(phpBin, args, opts, (err) => {
            if (err) {
                tmpFile.removeCallback();
                handleError(fixerBin, err);
            }

            fs.readFile(tmpFile.name, 'utf-8')
                .finally(() => {
                    tmpFile.removeCallback();
                })
                .then((text) => {
                    resolve(text);
                })
                .catch((err: unknown) => {
                    reject(err);
                });
        });
    });
};

const registerDocumentProvider = async (
    document: vscode.TextDocument
): Promise<vscode.TextEdit[]> => {
    return await formatDocument(document)
        .then(function (text) {
            const range = new vscode.Range(
                new vscode.Position(0, 0),
                document.lineAt(document.lineCount - 1).range.end
            );
            return [new vscode.TextEdit(range, text)];
        })
        .catch((err: unknown) => {
            void vscode.window.showErrorMessage(`php-cs-fixer: ${String(err)}`);
            throw err;
        });
};
