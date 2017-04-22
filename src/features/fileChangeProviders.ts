import { Disposable, workspace, TextDocument, TextDocumentChangeEvent, Uri, OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import { CollaborationServer, Events } from '../collaborationServer';
import { diff_match_patch } from 'diff-match-patch';
import setText from '../utils/setText';
import * as crypto from 'crypto';
import * as path from 'path';
import constants from '../utils/constants';
import * as uuid from 'uuid/v4';

let username = vscode.workspace.getConfiguration(`${constants.ExtensionName}`).get('userId', uuid());
let updateTime = 500;
let documents: { [id: string]: DocumentCache } = {};
let changeCache: Events.ChangeEvent[] = [];
let documentQueue = {};
let updateTimer = null;
let _server: CollaborationServer = null;

function getChecksum(text: string) {
    return crypto.createHash('sha1').update(text).digest('hex');
}

function forwardDocumentChanges(server: CollaborationServer, _channel: OutputChannel): Disposable {
    _server = server;
    let minChange: number = 2;
    let count: number = 0;
    let originalDocument: string;

    //We should load all active documents into cache

    workspace.onDidOpenTextDocument(cacheFile);

    workspace.onDidCloseTextDocument((e) => {
        if (!e.isUntitled) {
            //delete documents[workspace.asRelativePath(e.fileName)];
        }
    });

    // Cache all open documents
    vscode.workspace.textDocuments.forEach(cacheFile)

    updateTimer = setTimeout(runUpdate, updateTime);

    return workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId != "Log") {
            let { document } = event;
            var documentPath = workspace.asRelativePath(document.fileName);
            documentQueue[documentPath] = document.getText();
        }
    });
}

function runUpdate() {
    for (var file in documentQueue) {
        if (documentQueue.hasOwnProperty(file)) {
            var text = documentQueue[file];
            var doc = documents[file];
            if (doc == null) continue;
            let isSimpleMatch = documents[file].shadow.text == text;
            if (isSimpleMatch) continue;

            const dmp = new diff_match_patch();
            const diffs = dmp.diff_main(documents[file].shadow.text, text);
            const delta = dmp.diff_toDelta(diffs);
            const checksum = getChecksum(text);

            // Create change event and cache
            var event = new Events.ChangeEvent(
                {
                    relativeFileName: file,
                    delta: delta,
                    checksum: checksum,
                    version: documents[file].shadow.version,
                    lastRecievedVersion: doc.remoteVersion
                }, username);
            changeCache.push(event);

            // Update the copy with the changes
            documents[file].shadow.version += 1;
            documents[file].shadow.text = text;
        }
    }
    // empty the queue
    documentQueue = {};

    // Send what is in the cache
    if (changeCache.length > 0 && _server != null) {
        _server.sendEvents(changeCache);
    }

    updateTimer = setTimeout(runUpdate, updateTime);
}

export function applyChanges(event: Events.ChangeEvent) {
    if (event.by == username) {
        return;
    }

    var relativeFileName = event.data.relativeFileName;
    var diffData = event.data;

    let absoluteFilePath = path.join(vscode.workspace.rootPath, relativeFileName);
    var doc = documents[relativeFileName];

    // Get rid of events that we know have been recieved
    changeCache = changeCache.filter((x, index) => {
        x.data.version < diffData.lastRecievedVersion;
    });

    if (doc == null) {
        vscode.workspace.openTextDocument(absoluteFilePath).then((z) => {
            documents[relativeFileName] = doc = {
                remoteVersion: 0,
                shadow: { text: z.getText(), version: 0 },
                shadowBackup: { text: z.getText(), version: 0 }
            }
        });
    }

    if (doc.remoteVersion > diffData.version) {
        // We've already seen this change so just discard it.
        return;
    }

    const dmp = new diff_match_patch()
    const docPatch = dmp.patch_make(doc.shadow.text, diffData.delta);
    const patchedDoc = dmp.patch_apply(docPatch, doc.shadow.text)[0]
    const patchedChecksum = getChecksum(patchedDoc);

    if (patchedChecksum != diffData.checksum) {
        // failed to update properly
        return;
    }

    // Update shadow with changes
    documents[relativeFileName].remoteVersion += 1;
    documents[relativeFileName].shadow.text = patchedDoc;

    // Copy to shadow backup
    documents[relativeFileName].shadowBackup.text = patchedDoc;
    documents[relativeFileName].shadowBackup.version = documents[relativeFileName].shadow.version;

    // attempt to patch actual file;
    var isActiveFile = (vscode.window.activeTextEditor.document.uri.fsPath == absoluteFilePath);

    if (isActiveFile) {
        setDocumentChanges(vscode.window.activeTextEditor.document.getText(), diffData.delta);
    } else {
        vscode.workspace.openTextDocument(absoluteFilePath).then((z) => {
            vscode.window.showTextDocument(z, null, false).then(x => {
                setDocumentChanges(z.getText(), diffData.delta, x);
            });

        }, (b) => {
            console.log(b);
        });
    }
}

function cacheFile(file: TextDocument) {
    if (!file.isUntitled) {
        let text = file.getText();
        let copy = { text: text, version: 0, checksum: getChecksum(text) }
        documents[workspace.asRelativePath(file.fileName)] = {
            shadow: copy,
            remoteVersion: 0,
            shadowBackup: copy
        }
    }
}

function setDocumentChanges(text: string, delta: string, editor?: any) {
    try {
        const dmp = new diff_match_patch();
        const docPatch = dmp.patch_make(text, delta);
        const patchedText = dmp.patch_apply(docPatch, text)[0];
        setText(patchedText, editor);
    } catch (ex) {
        console.log(ex);
    }
}

export interface DocumentCache {
    shadow: DocumentCopy
    shadowBackup: DocumentCopy
    remoteVersion: number
}

export interface DocumentCopy {
    text: string
    version: number
}


function forwardFileChanges(server: CollaborationServer, a: OutputChannel): Disposable {

    function onFileSystemEvent(uri: Uri): void {

        //a.appendLine(uri.fsPath);
        let req = { Filename: uri.fsPath };


    }

    const watcher = workspace.createFileSystemWatcher('**/*.*');
    let d1 = watcher.onDidCreate(onFileSystemEvent);
    let d2 = watcher.onDidChange(onFileSystemEvent);
    let d3 = watcher.onDidDelete(onFileSystemEvent);

    return Disposable.from(watcher, d1, d2, d3);
}

export default function forwardChanges(server: CollaborationServer, c: OutputChannel): Disposable {

    return Disposable.from(
        forwardDocumentChanges(server, c),
        forwardFileChanges(server, c));
}