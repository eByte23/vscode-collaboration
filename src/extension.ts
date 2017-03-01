'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import CollaborationServer from './collaborationServer';
import fileChangeProvider from './features/fileChangeProviders';

const commands = {
    startSession: "collaboration.start",
    saveSession: "collaboration.save",
    endSession: "collaboration.end",
    connectToSession: "collaboration.connect"
};


interface settings {
    syncActiveDocument: boolean,


}

export interface Status {
    setMessage: (text: string) => Status;
    setDetail: (text: string) => Status;
    setCommand: (command: string) => Status;
    show: () => void;
}

export { commands };

export function activate(context: vscode.ExtensionContext) {

    let _channel = vscode.window.createOutputChannel("collaboration");
    let statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    let status: Status = {
        show: () => {
            statusItem.show();
        },
        setMessage: text => {
            statusItem.text = text;
            return status;
        },
        setDetail: text => {
            statusItem.tooltip = text;
            return status;
        },
        setCommand: command => {
            statusItem.command = command;
            return status;
        }
    };

    status.setMessage("$(organization) Collaborate")
        .setCommand(commands.startSession)
        .show();

    let disposable = vscode.commands.registerCommand(commands.startSession, () => {
        _channel.show(true);

        var a = fileChangeProvider(new CollaborationServer(Uri.parse("http://uri.com"),_channel), _channel);

        context.subscriptions.push(a);

        //vscode.window.showInformationMessage('Hello World!');

    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

// export class CollaborationStatusBarItem implements vscode.StatusBarItem
// {
//     alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Right
//     priority: number;
//     text: string = "(organization) Collaborate"
//     tooltip: string = "Click to start a session"
//     color: string = "#fff"
//     command: string = commands.startSession
//     show(): void {

//         //throw new Error('Method not implemented.');
//     }
//     hide(): void {
//         throw new Error('Method not implemented.');
//     }
//     dispose(): void {
//         throw new Error('Method not implemented.');
//     }


// }