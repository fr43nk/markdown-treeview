import { MarkdownTreeViewItem } from "./core/markdown-tree-view-Item";
import { MarkdownTreeViewDataProvider } from "./core/markdown-tree-view-data-provider";
import { ConfigurationHandler } from "./configuration/configuration-handler";
import {
  LogLevel,
  commands,
  ExtensionContext,
  TextDocument,
  window,
  workspace,
  FileType,
} from "vscode";
import { MarkdownTreeViewOutputChannel } from "./ui/markdown-tree-view-output-channel";
import { MarkdownTreeView } from "./core/markdown-tree-view";

export function activate(context: ExtensionContext): void {
  const workspaceRoot =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  if (workspaceRoot) {
    const configHandler = new ConfigurationHandler();

    const workspaceRootUris = workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];

    const mdtv = new MarkdownTreeView(context, workspaceRootUris, configHandler);

    // const markdownViewTreeDataProvider = new MarkdownTreeViewDataProvider(
    //   workspaceRootUris,
    //   configHandler,
    // );
    MarkdownTreeViewOutputChannel.Instance.LogLevel = configHandler.configuration.LogLevel.value;
    configHandler.onDidChangeConfiguration(() => {
      if (configHandler.configuration.LogLevel.changed) {
        MarkdownTreeViewOutputChannel.Instance.LogLevel =
          configHandler.configuration.LogLevel.value;
      }
    });

    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const doc = editor.document;
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `Active Editor changed - ${doc.uri}`,
          LogLevel.Debug,
        );
        mdtv.reveal(doc.uri);
      }
    });

    workspace.onDidOpenTextDocument((doc: TextDocument) => {
      MarkdownTreeViewOutputChannel.Instance.appendLine(`Open Document ${doc.uri}`, LogLevel.Debug);
      mdtv.reveal(doc.uri);
    });

    workspace.onDidOpenTextDocument((doc: TextDocument) => {
      MarkdownTreeViewOutputChannel.Instance.appendLine(`Open Document ${doc.uri}`, LogLevel.Debug);
      mdtv.reveal(doc.uri);
    });

    workspace.onDidSaveTextDocument((doc: TextDocument) => {
      mdtv.saveDocument(doc.uri);
    });

    if (window.activeTextEditor?.document) {
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `Reveal active document on activation - ${window.activeTextEditor.document.uri}`,
        LogLevel.Debug,
      );
      mdtv.reveal(window.activeTextEditor.document.uri);
    }
  }
}
