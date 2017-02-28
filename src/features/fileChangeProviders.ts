import { Disposable, workspace, TextDocument, TextDocumentChangeEvent, Uri, OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import { CollaborationServer, Events } from '../collaborationServer';
import * as diff from 'component-diff';
import * as patch from 'component-patch';
import setText from '../utils/setText';


function forwardDocumentChanges(server: CollaborationServer, _channel: OutputChannel): Disposable {
    let minChange: number = 10;
    let count: number = 0;
    let originalDocument: string;
    let documents : {[id:string]: string} = {};

    var a = workspace.onDidOpenTextDocument((e)=>{
        if(!e.isUntitled){
            documents[workspace.asRelativePath(e.fileName)] = e.getText();
        }
    })

    var b = workspace.onDidCloseTextDocument((e)=>{
        //var a = "";
        if(!e.isUntitled){
            delete documents[workspace.asRelativePath(e.fileName)];
        }
    });

    return workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId != "Log") {
            let { document } = event;
            var documentPath = workspace.asRelativePath(document.fileName);

            count += 1;
            _channel.appendLine(count.toString());
            if (count >= minChange) {

                count = 0;
                _channel.append(`${document.fileName}: `);
                var a = event.contentChanges.forEach(x => {
                    _channel.append(`Start: (${x.range.start.line},${x.range.start.character}) End: (${x.range.end.line},${x.range.end.character}) Length: ${x.rangeLength} Text: ${x.text}`);
                });
                _channel.appendLine("\nbefore diff");

                var out = diff(documents[documentPath], document.getText());
                var delta = diff.toDelta(out);

                applyChanges("/d:/Non_work_projects/ebyte23/riot-boilplate/test.1.tag",{
                    checksum:"",
                    delta: delta
                });

                documents[documentPath] = document.getText();

            }
        }



        //check server up or return

        //fire server event
    });
}

function forwardFileChanges(server: CollaborationServer, a: OutputChannel): Disposable {

    function onFileSystemEvent(uri: Uri): void {

        a.appendLine(uri.fsPath);
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


export function applyChanges(releativeFileName: string, diff: Events.Diff) {
    let a = "";
    var document = vscode.workspace.openTextDocument(releativeFileName).then((z) => {
        let currentDocumentText = z.getText();
        var documentPatch = patch(currentDocumentText, diff.delta);

        vscode.window.showTextDocument(z,null,false).then(x=>{
            var patchedText = patch.apply(documentPatch, currentDocumentText);
            setText(patchedText, x);
        });

    },(b)=>{
        var a = "";
    });

}
