import { MarkdownTreeViewAsyncItem } from "./core/markdown-tree-view-async-Item";
import { MarkdownTreeViewDataProvider } from "./core/markdown-tree-view-data-provider";
import { ConfigurationHandler } from "./configuration/configuration-handler";
import { commands, ExtensionContext, TextDocument, window, workspace } from "vscode";
import { MarkdownTreeViewOutputChannel } from "./ui/markdown-tree-view-output-channel";
import { LogLevel } from "./types/log-level";

export function activate(context: ExtensionContext): void {
  const workspaceRoot =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  if (workspaceRoot) {
    const configHandler = new ConfigurationHandler();

    const workspaceRootUris = workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];

    const markdownViewTreeDataProvider = new MarkdownTreeViewDataProvider(
      workspaceRootUris,
      configHandler,
    );

    configHandler.onDidChangeConfiguration(() => {
      if (configHandler.configuration.LogLevel.changed) {
        MarkdownTreeViewOutputChannel.Instance.logLevel =
          configHandler.configuration.LogLevel.value;
      }
    });

    window.registerTreeDataProvider("markdownTreeView", markdownViewTreeDataProvider);

    commands.registerCommand("markdownTreeView.refreshTree", () => {
      MarkdownTreeViewOutputChannel.Instance.appendLine("RefreshTree command");
      markdownViewTreeDataProvider.refresh();
    });
    commands.registerCommand("markdownTreeView.collapseNodes", () => {
      markdownViewTreeDataProvider.Expanded = false;
      markdownViewTreeDataProvider.refresh();
    });
    commands.registerCommand("markdownTreeView.expandNodes", () => {
      markdownViewTreeDataProvider.Expanded = true;
      markdownViewTreeDataProvider.refresh();
    });
    commands.registerCommand(
      "markdownTreeView.openTreeViewItem",
      async (node: MarkdownTreeViewAsyncItem) => {
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `OpenTreeViewItem - ${node}`,
          LogLevel.Debug,
        );
        await markdownViewTreeDataProvider.openDocument(node);
      },
    );
    commands.registerCommand(
      "markdownTreeView.refreshTreeItem",
      async (node: MarkdownTreeViewAsyncItem) => {
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `RefreshTreeItem - ${node}`,
          LogLevel.Debug,
        );
        await node.getItemInformation();
        markdownViewTreeDataProvider.onViewSelected(node);
      },
    );

    workspace.onDidOpenTextDocument((doc: TextDocument) => {
      MarkdownTreeViewOutputChannel.Instance.appendLine(`Open Document ${doc.uri}`, LogLevel.Debug);
    });

    workspace.onDidSaveTextDocument((doc: TextDocument) => {
      markdownViewTreeDataProvider.saveDocument(doc.uri);
    });
  }
}
