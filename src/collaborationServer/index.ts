import { Uri, OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import * as Websocket from 'ws';
import * as fP from '../features/fileChangeProviders';

export class CollaborationServer {


    private _serverEndpoint: Uri;
    private _connection: Websocket;
    private _channel: OutputChannel;

    /**
     * serverEndpoint: string;
     *    This is used to connect to the server that will host collaboration Session
     */
    constructor(serverEndpoint: Uri, channel: OutputChannel) {
        this._serverEndpoint = serverEndpoint || Uri.parse("ws://127.0.0.1:3000")
        this._connection = new Websocket("ws://127.0.0.1:3000");
        this._channel = channel;
        //this.setupLogging();
        this.setupConnection();
    }
    private setupLogging() {
        //this._channel = vscode.window.createOutputChannel("collaboration");
    }

    private setupConnection() {
        this._connection.onopen = () => {
            this._channel.appendLine(`socket open!`);
        };

        this._connection.onmessage = (evt) => {
            var $ievent = JSON.parse(evt.data);

            if ($ievent.type == "ChangeEvent") {
                let $event = JSON.parse(evt.data) as Events.ChangeEvent;
                this.onChange($event);
            }

            this._channel.appendLine(`socket message<${$ievent.type}>:  ${evt.data}`);
        };
        this._connection.onerror = (evt) => {
            this._channel.appendLine(`socket error: ${evt.message}`);
        };
        this._connection.onclose = () => {
            this._channel.appendLine(`socket closed`);
        };
    }

    public sendEvent($event: IEvent): void {
        this.send(JSON.stringify($event));
    }

    public onChange(event: Events.ChangeEvent) :void {
        this._channel.appendLine(`Recieved chanages from:${event.by} ${JSON.stringify(event)}`);
        fP.applyChanges(event.relativeFileName, event.data);
    }

    // public setOn(a: (event: Events.ChangeEvent) => void): void {
    //     this._onChange = a;
    // }

    //public on: () => void;

    public send(data: string): void {

        if (this._connection.readyState == Websocket.OPEN) {
            this._connection.send(data, (err) => {
                if (err != null) {
                    this._channel.appendLine(`send error: ${err.name}, ${err.message}, ${err.stack}`);
                } else {
                    this._channel.appendLine(`sent: ${data}`);
                }
            });
        } else {
            this._channel.appendLine(`send error readState: ${this._connection.readyState}`);
        }

    }
}
export default CollaborationServer;


export interface IEvent {
    by: string,
    data: any,
    type: string
}

export module Events {
    export class ChangeEvent implements IEvent {

        constructor(relativeFilePath: string, diff: Diff, by: string) {
            this.relativeFileName = relativeFilePath;
            this.data = diff as any;
            this.by = by;
        }

        by: string;
        data: any;
        relativeFileName: string;
        type: string = "ChangeEvent";
    }


    export interface Diff {
        delta: string;
        checksum: string;
    }
}


