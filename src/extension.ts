// Moved AsyncZettelViewTreeItem and ZettelViewTreeDataProvider to separate modules

import { MarkdownTreeViewAsyncItem } from "./core/markdown-tree-view-async-Item";
import { MarkdownTreeViewDataProvider } from "./core/markdown-tree-view-data-provider";
import { ConfigurationHandler } from "./configuration/configuration-handler";
import { commands, ExtensionContext, TextDocument, window, workspace } from "vscode";
import { MarkdownTreeViewOutputChannel } from "./ui/markdown-tree-view-output-channel";
import { LogLevel } from "./types/log-level";

async function selectMarkdownTreeViewItem(
  item: MarkdownTreeViewAsyncItem,
  treeViewProvider: MarkdownTreeViewDataProvider,
) {
  await item.isReady; // Wait for the async operation to complete
  treeViewProvider.onViewSelected(item);
}

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
      markdownViewTreeDataProvider.openDocument(doc.uri);
    });

    workspace.onDidSaveTextDocument((doc: TextDocument) => {
      markdownViewTreeDataProvider.saveDocument(doc.uri);
    });

    //registerRenameCommand(markdownViewTreeDataProvider, workspaceRoot);
    /*
    context.subscriptions.push(
      commands.registerCommand(
        "zettelkasten.openZettel",
        (fileUri: Uri, treeItem: MarkdownTreeViewAsyncItem) => {
          // Open the file
          commands.executeCommand("open", fileUri);

          selectMarkdownTreeViewItem(treeItem, markdownViewTreeDataProvider);
        },
      ),
    ); */
  }
}

/*
function registerRenameCommand(provider: markdownTreeViewDataProvider, workspaceRoot: string) {
  commands.registerCommand("zettelView.renameEntry", async (node) => {
    // Prompt the user for the new name
    const newID = await window.showInputBox({ prompt: "Enter the new ID" });
    if (newID && node) {
      // Validate the new ID against the regex
      MyLogger.logMsg(`New name: ${newID}`);
      if (!idRegex.idRegExp.test(newID)) {
        window.showErrorMessage(
          `The new ID ${newID} does not match ${idRegex.idRegExpStr}. Please try again.`,
        );
        return;
      }

      // Assume node.fsPath is the file path of the file to be renamed
      const oldPath = node.fsPath;
      //concatenate the new ID with the extension ".md"
      const newName = `${newID}.md`;
      const newPath = path.join(path.dirname(oldPath), newName);

      try {
        // Rename the file
        await fs.promises.rename(oldPath, newPath);
      } catch (error) {
        MyLogger.logMsg(`Failed to rename file: ${error}`);
      }

      // Now find and replace all the links in the workspace
      const oldID = path.basename(oldPath, ".md"); // Extract old ID from oldPath without '.md'

      // Call replaceIncomingLinks function
      await replaceIncomingIDs(oldID, newID, workspaceRoot);

      // Refresh the tree view
      provider.refresh();
    }
  });
}*/
