import {
  commands,
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
  LogLevel,
  FileType,
} from "vscode";
import { MarkdownTreeViewItem } from "./markdown-tree-view-Item";
import { FolderTree } from "../types/folder-tree";
import { Options } from "../types/options";
import { ConfigurationHandler } from "../configuration/configuration-handler";
import { MarkdownTreeViewOutputChannel } from "../ui/markdown-tree-view-output-channel";
import { readdirSync, statSync } from "fs";
import { join } from "path";

export class MarkdownTreeViewDataProvider implements TreeDataProvider<MarkdownTreeViewItem> {
  private _onDidChangeTreeData: EventEmitter<MarkdownTreeViewItem | undefined> = new EventEmitter<
    MarkdownTreeViewItem | undefined
  >();
  onDidChangeTreeData: Event<MarkdownTreeViewItem | undefined> = this._onDidChangeTreeData.event;

  private _onDidSelectTreeItem: EventEmitter<MarkdownTreeViewItem> =
    new EventEmitter<MarkdownTreeViewItem>();
  onDidSelectTreeItem: Event<MarkdownTreeViewItem> = this._onDidSelectTreeItem.event;

  private itemTree: MarkdownTreeViewItem[] = [];
  // map open document to treeitem
  private documentToItemMap: Map<string, MarkdownTreeViewItem> = new Map();

  private expanded = true;

  public itemsReady!: Promise<boolean>;
  private itemsReadyResolve: ((v: boolean) => void) | undefined;

  constructor(
    private readonly workspaceRoots: string[],
    private readonly configHandler: ConfigurationHandler,
  ) {
    //this.loadMappings();
    configHandler.onDidChangeConfiguration(() => {
      if (this.configHandler.configuration.ExpandTreeView.changed) {
        this.expanded = this.configHandler.configuration.ExpandTreeView.value;
        this.refresh();
      }
    });
    this.expanded = this.configHandler.configuration.ExpandTreeView.value;
    // initialize itemsReady as a pending promise; will be resolved when items loaded
    this.createItemsReady();
  }

  private createItemsReady() {
    this.itemsReady = new Promise<boolean>((resolve) => {
      this.itemsReadyResolve = resolve;
    });
  }

  public updateContextResources() {
    commands.executeCommand("setContext", "markdownTreeView:Expanded", this.Expanded);
  }

  onViewSelected(markdownTreeViewItem: MarkdownTreeViewItem): void {
    markdownTreeViewItem.isReady.then(() => {
      this.refresh(markdownTreeViewItem); // Trigger a refresh of the tree view to update the labels
    });
    if (markdownTreeViewItem.type === FileType.Directory) {
      markdownTreeViewItem.collapsibleState =
        markdownTreeViewItem.collapsibleState === TreeItemCollapsibleState.Collapsed
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed;
    }
    this._onDidSelectTreeItem.fire(markdownTreeViewItem);
  }

  refresh(markdownTreeViewItem?: MarkdownTreeViewItem): void {
    MarkdownTreeViewOutputChannel.Instance.appendLine("Refresh in Provider", LogLevel.Debug);
    if (markdownTreeViewItem === undefined) {
      //this.createItemsReady(); // reset itemsReady for the next load
    }
    this._onDidChangeTreeData.fire(markdownTreeViewItem);
  }

  async openDocument(item: MarkdownTreeViewItem) {
    const uri = item.resourceUri; // or however you get the URI from your item

    if (uri) {
      // Store the mapping
      this.documentToItemMap.set(uri.toString(), item);
      // Open the document
      const document = await workspace.openTextDocument(uri);
      await window.showTextDocument(document);
    }
  }

  async saveDocument(file: Uri) {
    MarkdownTreeViewOutputChannel.Instance.appendLine(`Save Document ${file}`, LogLevel.Debug);
    const item = this.documentToItemMap.get(file.toString());
    if (item) {
      await item.getItemInformation();
      this.refresh(item);
    }
  }

  async closeDocument(item: MarkdownTreeViewItem) {}

  getItemFromUri(uri: Uri): MarkdownTreeViewItem | undefined {
    return this.documentToItemMap.get(uri.toString());
  }

  getTreeItem(markdownTreeViewItem: MarkdownTreeViewItem): TreeItem {
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `getTreeItem in Provider - ${markdownTreeViewItem.pathname}`,
      LogLevel.Debug,
    );
    return markdownTreeViewItem;
  }

  async getParent(
    markdownTreeViewItem: MarkdownTreeViewItem,
  ): Promise<MarkdownTreeViewItem | null> {
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `getParent in Provider - ${markdownTreeViewItem.pathname}`,
      LogLevel.Debug,
    );
    return markdownTreeViewItem.parent ?? null;
  }

  async getChildren(markdownTreeViewItem?: MarkdownTreeViewItem): Promise<MarkdownTreeViewItem[]> {
    MarkdownTreeViewOutputChannel.Instance.appendLine(
      `getChildren in Provider - ${markdownTreeViewItem?.pathname}`,
      LogLevel.Debug,
    );

    if (!this.workspaceRoots) {
      window.showInformationMessage("No markdown files found in your workspace");
      return [];
    }
    if (markdownTreeViewItem && markdownTreeViewItem.type == FileType.Directory) {
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `getChildren in Provider - Directory getting listed- ${markdownTreeViewItem?.pathname}`,
        LogLevel.Debug,
      );
      return markdownTreeViewItem.childNodes ?? [];
    }
    if (markdownTreeViewItem && markdownTreeViewItem.type == FileType.File) {
      return [];
    }

    let readyItems: MarkdownTreeViewItem[] = [];
    for (let f of this.workspaceRoots) {
      const items = await this.getItems(f);
      readyItems = [...readyItems, ...items];
      MarkdownTreeViewOutputChannel.Instance.appendLine(
        `getChildren in Provider - reading Workspace folders - ${markdownTreeViewItem?.pathname}`,
        LogLevel.Debug,
      );
    }
    this.itemTree = [...readyItems];
    if (this.itemsReadyResolve) {
      this.itemsReadyResolve(true);
      this.itemsReadyResolve = undefined; // reset the resolver for future refreshes
    }
    return readyItems;
  }

  async getItems(path: string, item?: MarkdownTreeViewItem) {
    const fso = await this.walkDir(item?.pathname || path);
    const folders = [];

    for (const _folder of fso.folders) {
      const _item = new MarkdownTreeViewItem(
        _folder.dir,
        Uri.file(_folder.dir),
        item ?? null,
        this.Expanded,
        FileType.Directory,
      );
      const childs = await this.getItems(_folder.dir, _item);
      _item.childNodes = childs;
      folders.push(_item);
    }

    const files = [];
    for (const _file of fso.files) {
      if (_file.endsWith(".md")) {
        const fileItem = new MarkdownTreeViewItem(
          _file,
          Uri.file(_file),
          item ?? null,
          this.Expanded,
          FileType.File,
          [],
          {
            command: "markdownTreeView.openTreeViewItem",
            title: "",
            arguments: [this],
          },
        );
        MarkdownTreeViewOutputChannel.Instance.appendLine(
          `Add Item to Tree: ${fileItem.label} - ${fileItem.resourceUri}`,
          LogLevel.Debug,
        );
        this.documentToItemMap.set(fileItem.resourceUri.toString(), fileItem);
        files.push(fileItem);
      }
    }
    const itemsFlat = [...folders, ...files];
    const readyItems = await Promise.all(itemsFlat.map((item) => item.isReady));
    return readyItems;
  }

  async walkDir(root: string, options?: Options) {
    const o = options ?? { recursive: false };
    const fsObjects = readdirSync(root);
    let files: FolderTree = { dir: root, folders: [], files: [] };

    for (const fsObject of fsObjects) {
      const fso = join(root, fsObject);
      if (statSync(fso).isDirectory() && fsObject !== ".git") {
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
