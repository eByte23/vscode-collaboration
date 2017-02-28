import { TextEditor } from 'vscode';
import * as vscode from 'vscode';

export default function setText(text: string, editor?: TextEditor): Thenable<void>{
    editor = editor || vscode.window.activeTextEditor;
    if (editor == null) {
        return Promise.resolve();
    }

    return new Promise<void>(function (resolve) {
        editor.edit(function (builder) {
            var document = editor.document;
            var lastLine = document.lineAt(document.lineCount -1);
            var start = new vscode.Position(0, 0);
            var end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
            builder.replace(new vscode.Range(start, end), text);
            resolve();
        });
    });
}



