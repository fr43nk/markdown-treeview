import { FileOperations } from "../utils/FileOperations";
import { Command, FileType, LogLevel, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";
import { basename } from "path";

export class MarkdownTreeViewItem extends TreeItem {
  public isReady: Promise<MarkdownTreeViewItem>;

  constructor(
    public readonly pathname: string,
    public readonly resourceUri: Uri,
    public parent: MarkdownTreeViewItem | null,
    public expandView: boolean,
    public type: FileType,
    public childNodes?: MarkdownTreeViewItem[],
    public command?: Command,
  ) {
    const bn = basename(pathname);
    super(
      bn,
      type === FileType.Directory
        ? expandView
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None,
    );
    this.label = bn;
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `Creating TreeView Item for ${pathname}`,
      LogLevel.Debug,
    );
    this.isReady = this.getItemInformation();
  }

  public async getItemInformation(): Promise<MarkdownTreeViewItem> {
    const bn = basename(this.pathname);
    try {
      if (this.type === FileType.Directory) {
        this.label = bn;
        this.command = undefined;
      } else {
        this.label = await FileOperations.getTitleFromFile(this.pathname);
        this.command = {
          command: "markdownTreeView.openTreeViewItem",
          title: this.label as string,
          arguments: [this],
        };
      }
      return this;
    } catch (err) {
      this.label = bn; // a default value
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `Error getting information of Item ${err}`,
        LogLevel.Debug,
      );
      return this;
    }
  }
}
