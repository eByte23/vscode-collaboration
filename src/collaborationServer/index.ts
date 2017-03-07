import { Uri, OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import * as socket from 'socket.io-client';
import * as fP from '../features/fileChangeProviders';


export class CollaborationServer {
    private _serverEndpoint: string;
    public _connection: SocketIOClient.Socket;
    private _channel: OutputChannel;

    /**
     * serverEndpoint: string;
     *    This is used to connect to the server that will host collaboration Session
     */
    constructor(serverEndpoint: string, channel: OutputChannel) {
        this._channel = channel;
        this._serverEndpoint = serverEndpoint || "ws://127.0.0.1:3000";
        this._connection = socket(this._serverEndpoint, { autoConnect: true});
        //this.setupLogging();
        this.setupConnection();
    }
    private setupLogging() {
        //this._channel = vscode.window.createOutputChannel("collaboration");
    }

    private setupConnection() {
        this._connection.on('connect', (e) => {
            this._channel.appendLine(`socket open!`);
        });

        this._connection.on('message', (evt) => {
            var $ievent = JSON.parse(evt.data);
            this._channel.appendLine(`socket message<${$ievent.type}>:  ${evt.data}`);
        });

        this._connection.on('JoinSession', ($event: Events.JoinSession) => {
             this._channel.appendLine(`hey look ${$event.by} joined your session`);
        });

        this._connection.on("ChangeEvent", ($event: Events.ChangeEvent) => {
            this._channel.appendLine(`Recieved chanages (${$event.by}), delta: ${$event.data.delta}, lastVersion: ${$event.data.lastRecievedVersion}, version: ${$event.data.version}`);
            fP.applyChanges($event);
        });

        this._connection.on('error', (evt) => {
            this._channel.appendLine(`socket error: ${JSON.stringify(evt)}`);
        });

        this._connection.on('close', () => {
            this._channel.appendLine(`socket closed`);
        });
    }

    public sendEvent($event: IEvent): void {
        this.sendEvents([$event]);
    }

    public sendEvents($events: IEvent[]): void {
        $events.forEach(event => {
            this.send(event);
        });
    }

    public send($event: IEvent): void {
        if (this._connection.connected) {
            this._connection.emit($event.type, $event, (err) => {
                if (err != null) {
                    this._channel.appendLine(`send error: ${err.name}, ${err.message}, ${err.stack}`);
                } else {
                    this._channel.appendLine(`sent: ${JSON.stringify($event)}`);
                }
            });
        } else {
            this._channel.appendLine(`send error readyState: ${this._connection.connected}`);
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

        constructor(diff: Diff, by: string) {
            this.data = diff;
            this.by = by;
        }

        by: string; // TODO: This could change to an ID given when connecting to session
        data: Diff;
        type: string = "ChangeEvent";
    }


    export interface Diff {
        relativeFileName: string;
        delta: string;
        checksum: string;
        version: number;
        lastRecievedVersion: number;
    }

    export class JoinSession implements IEvent {
        constructor(sessionId: string, by: string) {
            this.by = by;
            this.sessionId = sessionId;
        }

        by: string;
        data: any;
        type: string = "JoinSession";
        sessionId: string;
    }

    export class StartSession implements IEvent {
        constructor(sessionId: string, by: string) {
            this.by = by;
            this.sessionId = sessionId;
        }

        by: string;
        data: any;
        type: string = "StartSession";
        sessionId: string;
    }
}
