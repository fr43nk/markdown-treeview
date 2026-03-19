import { FileOperations } from "../utils/FileOperations";
import path = require("path");
import { FsObjectTypes } from "../types/fs-object-types";
import { Command, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";

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
    const bn = path.basename(pathname);
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

    // since we cannot make an asynchronous call to a constructor
    // and we want to consume a stream line-by-line, we return
    // an IIAFE: immediately invoked Asynchronous Function Expression
    // See: https://stackoverflow.com/questions/43431550/async-await-class-constructor/50885340#50885340

    // this.isReady = (async (): Promise<MarkdownTreeViewAsyncItem> => {
    //   try {
    //     this.label =
    //       this.type === FsObjectTypes.Directory
    //         ? bn
    //         : await FileOperations.getTitleFromFile(pathname);
    //     if (this.type === FsObjectTypes.Directory) {
    //       this.command = undefined;
    //     } else {
    //       this.command = {
    //         command: "vscode.open",
    //         title: this.label as string,
    //         arguments: [Uri.file(this.pathname)],
    //       };
    //     }
    //     return this;
    //   } catch (err) {
    //     this.label = bn; // a default value
    //     console.error(err);
    //     return this;
    //   }
    // })() as unknown as Promise<MarkdownTreeViewAsyncItem>;
  }

  public async getItemInformation(): Promise<MarkdownTreeViewAsyncItem> {
    const bn = path.basename(this.pathname);
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
