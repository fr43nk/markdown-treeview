import { FileOperations } from "../utils/FileOperations";
import { FsObjectTypes } from "../types/fs-object-types";
import { Command, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";
import { basename } from "path";

export class MarkdownTreeViewAsyncItem extends TreeItem {
  public isReady: Promise<MarkdownTreeViewAsyncItem>;

  constructor(
    public readonly pathname: string,
    public readonly resourceUri: Uri,
    public expandView: boolean,
    public readonly type: FsObjectTypes,
    public readonly childNodes?: MarkdownTreeViewAsyncItem[],
    public command?: Command,
  ) {
    const bn = basename(pathname);
    super(
      bn,
      type === FsObjectTypes.Directory
        ? expandView
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None,
    );
    this.label = bn;

    this.isReady = this.getItemInformation();
  }

  public async getItemInformation(): Promise<MarkdownTreeViewAsyncItem> {
    const bn = basename(this.pathname);
    try {
      this.label =
        this.type === FsObjectTypes.Directory
          ? bn
          : await FileOperations.getTitleFromFile(this.pathname);
      if (this.type === FsObjectTypes.Directory) {
        this.command = undefined;
      } else {
        this.command = {
          command: "markdownTreeView.openTreeViewItem",
          title: this.label as string,
          arguments: [this],
        };
      }
      return this;
    } catch (err) {
      this.label = bn; // a default value
      MarkdownTreeViewOutputChannel.Instance.appendLine(`Error getting information of Item ${err}`);
      return this;
    }
  }
}
