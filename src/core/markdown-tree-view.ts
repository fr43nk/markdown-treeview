import { commands, ExtensionContext, LogLevel, TreeView, Uri, window } from "vscode";
import { MarkdownTreeViewItem } from "./markdown-tree-view-Item";
import { MarkdownTreeViewDataProvider } from "./markdown-tree-view-data-provider";
import { ConfigurationHandler } from "../configuration/configuration-handler";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";

export class MarkdownTreeView {
  private treeView: TreeView<MarkdownTreeViewItem>;
  private markdownTreeViewDataProvider: MarkdownTreeViewDataProvider;

  constructor(
    context: ExtensionContext,
    workspaceRoots: string[],
    configHandler: ConfigurationHandler,
  ) {
    this.markdownTreeViewDataProvider = new MarkdownTreeViewDataProvider(
      workspaceRoots,
      configHandler,
    );
    this.treeView = window.createTreeView("markdownTreeView", {
      treeDataProvider: this.markdownTreeViewDataProvider,
    });

    commands.registerCommand("markdownTreeView.refreshTree", () => {
      MarkdownTreeViewOutputChannel.Instance.appendLine("RefreshTree command");
      this.markdownTreeViewDataProvider.refresh();
    });
    commands.registerCommand("markdownTreeView.collapseNodes", () => {
      this.markdownTreeViewDataProvider.Expanded = false;
      this.markdownTreeViewDataProvider.refresh();
    });
    commands.registerCommand("markdownTreeView.expandNodes", () => {
      this.markdownTreeViewDataProvider.Expanded = true;
      this.markdownTreeViewDataProvider.refresh();
    });
    commands.registerCommand(
      "markdownTreeView.openTreeViewItem",
      async (node: MarkdownTreeViewItem) => {
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `OpenTreeViewItem - ${node}`,
          LogLevel.Debug,
        );
        await this.markdownTreeViewDataProvider.openDocument(node);
      },
    );
    commands.registerCommand(
      "markdownTreeView.refreshTreeItem",
      async (node: MarkdownTreeViewItem) => {
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `RefreshTreeItem - ${node}`,
          LogLevel.Debug,
        );
        await node.getItemInformation();
        this.markdownTreeViewDataProvider.onViewSelected(node);
      },
    );
  }

  async saveDocument(file: Uri) {
    await this.markdownTreeViewDataProvider.saveDocument(file);
  }
  public async reveal(docUri: Uri) {
    await this.markdownTreeViewDataProvider.itemsReady;
    const item = this.markdownTreeViewDataProvider.getItemFromUri(docUri);
    if (item) {
      this.treeView.reveal(item);
    }
  }
}
