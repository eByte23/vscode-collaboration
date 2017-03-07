let consts: Constants = {
    ExtensionName: "vscode-collaboration",
    OutputChannel: "collaboration"
};

export default consts;

export interface Constants {
    ExtensionName: string;
    OutputChannel: string;
}