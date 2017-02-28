import { Uri, OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import * as Websocket from 'ws';

export class CollaborationServer {

    private _serverEndpoint: Uri;
    private _connection: Websocket;
    private _channel: OutputChannel;

    /**
     * serverEndpoint: string;
     *    This is used to connect to the server that will host collaboration Session
     */
    constructor(serverEndpoint: Uri) {
        this._serverEndpoint = serverEndpoint;
        this._connection = new Websocket("ws://localhost:5000");
        this.setupConnection();
        this.setupLogging();
    }
    private setupLogging() {
        this._channel = vscode.window.createOutputChannel("collaboration");
    }

    private setupConnection() {
        this._connection.onopen = function () {
            vscode.window.showInformationMessage(`socket open!`);
        };
        this._connection.onmessage = function (evt) {
            if (evt.type == typeof (Events.ChangeEvent).toString()) {

            }
            vscode.window.showInformationMessage(`socket message: ${evt.data}`);
        };
        this._connection.onerror = function (evt) {
            vscode.window.showInformationMessage(`socket error: ${evt.message}`);
        };
        this._connection.onclose = function () {
            vscode.window.showInformationMessage(`socket closed`);
        };
    }

    public sendEvent(event: IEvent): void {

    }

    public send(data: any): void {

        if (this._connection.readyState == Websocket.OPEN) {
            this._connection.send(data, (err) => {
                this._channel.appendLine(`send error: ${err.name}, ${err.message}, ${err.stack}`);
            });
        }

    }
}
export default CollaborationServer;


export interface IEvent {
    by: string,
    data: any
}

export module Events {
    export class ChangeEvent implements IEvent {

        constructor(diff: Diff, by: string) {
            this.data = diff as any;
            this.by = by;
        }

        by: string;
        data: any;
        relativeFileName: string;
    }


    export interface Diff {
        delta: string;
        checksum: string;
    }
}


