import path from 'node:path';
import fs from 'node:fs/promises';
import * as vscode from 'vscode';
import { glob } from 'glob';

type Variable = 'workspaceFolder';
type Replacements = Record<Variable, string>;

const replacer = (variable: Variable) => {
    const regex = new RegExp(String.raw`\{\$${variable}\}`, 'g');

    return (str: string, replacements: Replacements) =>
        str.replaceAll(regex, replacements[variable]);
};

const variableMap = [replacer('workspaceFolder')] as const;

const getWorkspaceFolder = (resource: vscode.Uri) => {
    const defaultFolder = vscode.workspace.workspaceFolders?.[0];
    return resource.scheme === 'untitled'
        ? defaultFolder
        : (vscode.workspace.getWorkspaceFolder(resource) ?? defaultFolder);
};

type PriorityResponse<T> = { val: T; pass: true } | { pass: false };
const firstPriority = async <T>(promises: Promise<PriorityResponse<T>>[]) => {
    for (const promise of promises) {
        const res = await promise
            .then<T | false>((val) => {
                if (val.pass) {
                    return val.val;
                }
                return false;
            })
            .catch<false>(() => false);

        if (res) {
            return res;
        }
    }

    return false;
};

/**
 * To explain what is actually going on here:
 * - each string has variables replaced
 * - each string is then glob'ed for
 * - for any given glob, the first match is then checked for access
 * - the first string which succeeds is the result
 */
export const findFilePriority = async (resource: vscode.Uri, mode: number, ranked: string[]) => {
    const replacements: Replacements = {
        workspaceFolder: getWorkspaceFolder(resource)?.uri.fsPath ?? '.',
    };

    return await firstPriority(
        ranked.map(async (target) => {
            variableMap.forEach((rep) => (target = rep(target, replacements)));
            target = path.normalize(target);

            return await glob(target)
                .then<PriorityResponse<string>>(async (res) =>
                    res[0]
                        ? {
                              val: res[0],
                              pass: await fs
                                  .access(res[0], mode)
                                  .then(() => true)
                                  .catch(() => false),
                          }
                        : { pass: false }
                )
                .catch<PriorityResponse<string>>(() => ({ pass: false }));
        })
    );
};
