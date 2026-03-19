import {
  commands,
  Event,
  EventEmitter,
  ExtensionContext,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from "vscode";
import * as fs from "fs";
import * as path from "path";
import { MarkdownTreeViewAsyncItem } from "./markdown-tree-view-async-Item";
import { FsObjectTypes } from "../types/fs-object-types";
import { FolderTree } from "../types/folder-tree";
import { Options } from "../types/options";
import { ConfigurationHandler } from "../configuration/configuration-handler";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";
import { LogLevel } from "../types/log-level";

export class MarkdownTreeViewDataProvider implements TreeDataProvider<MarkdownTreeViewAsyncItem> {
  private _onDidChangeTreeData: EventEmitter<MarkdownTreeViewAsyncItem | undefined> =
    new EventEmitter<MarkdownTreeViewAsyncItem | undefined>();
  onDidChangeTreeData: Event<MarkdownTreeViewAsyncItem | undefined> =
    this._onDidChangeTreeData.event;

  private _onDidSelectTreeItem: EventEmitter<MarkdownTreeViewAsyncItem> =
    new EventEmitter<MarkdownTreeViewAsyncItem>();
  onDidSelectTreeItem: Event<MarkdownTreeViewAsyncItem> = this._onDidSelectTreeItem.event;

  // map open document to treeitem
  private documentToItemMap: Map<string, MarkdownTreeViewAsyncItem> = new Map();

  private expanded = true;

  constructor(
    private readonly workspaceRoots: string[],
    private readonly configHandler: ConfigurationHandler,
    private context: ExtensionContext,
  ) {
    this.loadMappings();
    configHandler.onDidChangeConfiguration(() => {
      if (this.configHandler.configuration.ExpandTreeView.changed) {
        this.expanded = this.configHandler.configuration.ExpandTreeView.value;
        this.refresh();
      }
    });
    this.expanded = this.configHandler.configuration.ExpandTreeView.value;
  }

  private loadMappings(): void {
    const saved = this.context.workspaceState.get<Record<string, MarkdownTreeViewAsyncItem>>(
      "documentToItemMap",
      {},
    );
    this.documentToItemMap = new Map(Object.entries(saved));
    console.log(`Restored ${this.documentToItemMap.size} document mappings`);
  }

  private async saveMappings(): Promise<void> {
    const obj = Object.fromEntries(this.documentToItemMap);
    await this.context.workspaceState.update("documentToItemMap", obj);
  }

  public updateContextResources() {
    commands.executeCommand("setContext", "markdownTreeView:Expanded", this.Expanded);
  }

  onViewSelected(markdownTreeViewItem: MarkdownTreeViewAsyncItem): void {
    markdownTreeViewItem.isReady.then(() => {
      this.refresh(markdownTreeViewItem); // Trigger a refresh of the tree view to update the labels
    });
    if (markdownTreeViewItem.type === FsObjectTypes.Directory) {
      markdownTreeViewItem.collapsibleState =
        markdownTreeViewItem.collapsibleState === TreeItemCollapsibleState.Collapsed
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed;
    }

    this._onDidSelectTreeItem.fire(markdownTreeViewItem);
  }

  refresh(markdownTreeViewItem?: MarkdownTreeViewAsyncItem): void {
    MarkdownTreeViewOutputChannel.Instance.appendLine("Refresh in Provider", LogLevel.Debug);
    this._onDidChangeTreeData.fire(markdownTreeViewItem);
  }

  async openDocument(item: MarkdownTreeViewAsyncItem | Uri) {
    if (item instanceof Uri) {
      // this.documentToItemMap.set(uri.toString(), item);
    } else {
      const uri = item.resourceUri; // or however you get the URI from your item

      if (uri) {
        // Store the mapping
        this.documentToItemMap.set(uri.toString(), item);

        // Persist to workspace state
        await this.saveMappings();

        // Open the document
        const document = await workspace.openTextDocument(uri);
        await window.showTextDocument(document);
      }
    }
  }

  async saveDocument(file: Uri) {
    const item = this.documentToItemMap.get(file.toString());
    if (item) {
      await item.getItemInformation();
      this.refresh(item);
    }
  }

  async closeDocument(item: MarkdownTreeViewAsyncItem) {}

  getTreeItem(markdownTreeViewItem: MarkdownTreeViewAsyncItem): TreeItem {
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `getTreeItem in Provider - ${markdownTreeViewItem.pathname}`,
      LogLevel.Debug,
    );
    return markdownTreeViewItem;
  }

  async getChildren(
    markdownTreeViewItem?: MarkdownTreeViewAsyncItem,
  ): Promise<MarkdownTreeViewAsyncItem[]> {
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `getChildren in Provider - ${markdownTreeViewItem?.pathname}`,
      LogLevel.Debug,
    );

    if (!this.workspaceRoots) {
      window.showInformationMessage("No markdown files found in your workspace");
      return [];
    }
    if (markdownTreeViewItem && markdownTreeViewItem.type == FsObjectTypes.Directory) {
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `getChildren in Provider - Directory getting listed- ${markdownTreeViewItem?.pathname}`,
        LogLevel.Debug,
      );
      return await this.getItems(markdownTreeViewItem.pathname);
    }
    if (markdownTreeViewItem && markdownTreeViewItem.type == FsObjectTypes.File) {
      return [];
    }

    let readyItems: MarkdownTreeViewAsyncItem[] = [];
    for (let f of this.workspaceRoots) {
      const items = await this.getItems(f);
      readyItems = [...readyItems, ...items];
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `getChildren in Provider - reading Workspace folders - ${markdownTreeViewItem?.pathname}`,
        LogLevel.Debug,
      );
    }
    return readyItems;
  }

  async getItems(basePath: string) {
    const fso = await this.walkDir(basePath);
    const folders = fso.folders.map((folder: FolderTree) => {
      return new MarkdownTreeViewAsyncItem(
        folder.dir,
        Uri.file(folder.dir),
        this.Expanded,
        FsObjectTypes.Directory,
      );
    });

    const files = fso.files
      .filter((file) => file.endsWith(".md"))
      .map((file: string) => {
        const fileItem = new MarkdownTreeViewAsyncItem(
          file,
          Uri.file(file),
          this.Expanded,
          FsObjectTypes.File,
          [],
          {
            command: "markdownTreeView.openTreeViewItem",
            title: "",
            arguments: [this],
          },
        );
        return fileItem;
      });
    const itemsFlat = [...folders, ...files];
    const readyItems = await Promise.all(itemsFlat.map((item) => item.isReady));
    return readyItems;
  }

  async walkDir(root: string, options?: Options) {
    const o = options ?? { recursive: false };
    const fsObjects = await fs.promises.readdir(root);
    let files: FolderTree = { dir: root, folders: [], files: [] };

    for (const fsObject of fsObjects) {
      const fso = path.join(root, fsObject);
      if (fs.statSync(fso).isDirectory() && fsObject !== ".git") {
        if (o.recursive === true) {
          files.folders.push(await this.walkDir(fso, o));
        } else {
          files.folders.push({ dir: fso, folders: [], files: [] });
        }
      } else {
        files.files.push(fso);
      }
    }
    return files;
  }

  get Expanded(): boolean {
    return this.expanded;
  }

  set Expanded(value: boolean) {
    this.expanded = value;
  }
}
