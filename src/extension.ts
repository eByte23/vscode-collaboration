'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import CollaborationServer, { Events } from './collaborationServer';
import fileChangeProvider from './features/fileChangeProviders';
import * as request from 'request';
import constants from './utils/constants';
var concat = require('concat-stream');
import * as uuid from 'uuid/v4';


const commands = {
    startSession: `${constants.ExtensionName}.start`,
    saveSession: `${constants.ExtensionName}.save`,
    endSession: `${constants.ExtensionName}.end`,
    connectToSession: `${constants.ExtensionName}.connect`,
    createUser: `${constants.ExtensionName}.createUser`
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
    let _username = null;
    let _server: CollaborationServer = null;
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

    context.subscriptions.push(vscode.commands.registerCommand(commands.startSession, () => {
        _channel.show(true);
        var config = vscode.workspace.getConfiguration(constants.ExtensionName);
        var url = config.get<string>("endpoint", "http://127.0.0.1:3000");
        var userId = config.get<string>("userId", _username);

        if (userId == null) {
            vscode.window.showErrorMessage("You must first create an account before collaborating");
            return;
        }

        _server = new CollaborationServer(url, _channel);
        _server._connection.on('connect', () => {
            context.subscriptions.push(fileChangeProvider(_server, _channel));
            var sessionId = uuid();
            _server.sendEvent(new Events.StartSession(sessionId, userId));
            vscode.window.showInformationMessage(`To let your friends connect to your ssession share this id: ${sessionId}`);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand(commands.connectToSession, () => {
        var config = vscode.workspace.getConfiguration(constants.ExtensionName);
        var url = config.get<string>("endpoint", "ws://127.0.0.1:3000");
        var userId = config.get<string>("userId", _username);

        vscode.window.showInputBox({
            placeHolder: "123456vbhhb",
            prompt: "Enter the session id you wish to connect to",
        })
            .then((e) => {
                if (_server == null) {
                    _server = new CollaborationServer(url, _channel);
                }

                _server._connection.on('connect', () => {
                    _server.sendEvent(new Events.JoinSession(e, userId));
                });
            });

    }));


    context.subscriptions.push(vscode.commands.registerCommand(commands.createUser, () => {
        let username: string;
        //let password: string = null;
        //let userId: string = null;

        vscode.window.showInputBox({
            placeHolder: "exampleuser@domain.com",
            prompt: "Enter a user or email",
        })
            .then((e) => {
                username = e;
                var config = vscode.workspace.getConfiguration(constants.ExtensionName);
                var userId = config.get<string>("userId", null);
            });
        //         vscode.window.showInputBox({ placeHolder: "password", prompt: "Enter a password", password: true })
        //             .then((e) => {
        //                 password = e;
        //                 request.post("http://127.0.0.1:3000/user/create",
        //                     {
        //                         body: JSON.stringify({ username: username, password: password }),
        //                         port:3000,
        //                     }, (err, res: request.RequestResponse, body) => {
        //                             if (res.statusCode == 200) {
        //                             var parsed = JSON.parse(body);

        //                                 userId = parsed.userId;
        //                             }

        //                     }).on('error', (err) => {
        //                         console.log(err);
        //                     });
        //             });
        //     });





        // _channel.appendLine(userId);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}