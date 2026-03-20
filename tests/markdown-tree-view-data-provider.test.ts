import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fsPromises, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Mock vscode to provide minimal APIs used by the code under test
vi.mock("vscode", () => {
  class TreeItem {
    label: any;
    collapsibleState: any;
    command: any;
    constructor(label?: any, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }
  const TreeItemCollapsibleState = {
    Expanded: 1,
    Collapsed: 2,
    None: 0,
  };

  const Uri = {
    file: (p: string) => ({ fsPath: p, toString: () => p }),
  };

  const commands = { executeCommand: () => {} };
  const window = {
    showInformationMessage: () => {},
    showTextDocument: () => {},
    createOutputChannel: () => ({ appendLine: () => {} }),
  };
  const workspace = {
    openTextDocument: async (uri: any) => ({ uri }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    getConfiguration: () => ({ has: () => false, get: () => undefined }),
  };

  class EventEmitter {
    event: any;
    constructor() {
      this.event = () => () => ({ dispose: () => {} });
    }
    fire() {}
  }

  class OutputChannel {
    createOutputChannel() {
      return this;
    }
    appendLine() {}
  }

  return {
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    commands,
    window,
    workspace,
    EventEmitter,
    OutputChannel,
  };
});

import { MarkdownTreeViewDataProvider } from "../src/core/markdown-tree-view-data-provider";
import { Configuration } from "../src/configuration/configuration";
import { create } from "domain";

describe("MarkdownTreeViewDataProvider", () => {
  let tmp: string;
  let provider: any;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "mdtv-"));
    const config = new Configuration();
    // set expandTreeView default
    config.ExpandTreeView.value = true;
    const fakeConfigHandler: any = {
      onDidChangeConfiguration: (_cb: any) => ({ dispose: () => {} }),
      configuration: config,
    };
    provider = new MarkdownTreeViewDataProvider([tmp], fakeConfigHandler);
  });

  afterEach(() => {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch (e) {}
  });

  it("walkDir returns folders and files non-recursive", async () => {
    const sub = join(tmp, "sub");
    mkdirSync(sub);
    writeFileSync(join(tmp, "a.md"), "# A");
    writeFileSync(join(sub, "b.md"), "# B");

    const result = await provider.walkDir(tmp, { recursive: false });
    expect(result.dir).toBe(tmp);
    expect(result.files).toContain(join(tmp, "a.md"));
    expect(result.folders.length).toBe(1);
    expect(result.folders[0].dir).toBe(sub);
    // with non-recursive, files inside sub should not be listed at root
    expect(result.folders[0].files).toEqual([]);
  });

  it("walkDir returns nested structure when recursive", async () => {
    const sub = join(tmp, "sub");
    mkdirSync(sub);
    writeFileSync(join(tmp, "a.md"), "# A");
    writeFileSync(join(sub, "b.md"), "# B");

    const result = await provider.walkDir(tmp, { recursive: true });
    expect(result.dir).toBe(tmp);
    expect(result.files).toContain(join(tmp, "a.md"));
    expect(result.folders.length).toBe(1);
    expect(result.folders[0].dir).toBe(sub);
    // recursive true should include files in nested folders
    expect(result.folders[0].files).toContain(join(sub, "b.md"));
  });

  it("getItems returns only markdown files and directories as items", async () => {
    const sub = join(tmp, "sub");
    mkdirSync(sub);
    writeFileSync(join(tmp, "a.md"), "# A");
    writeFileSync(join(tmp, "ignore.txt"), "nope");
    writeFileSync(join(sub, "b.md"), "# B");

    const items = await provider.getItems(tmp);
    // should contain one directory item and at least one markdown file item for a.md
    const paths = items.map((it: any) => it.pathname);
    expect(paths).toContain(join(tmp, "a.md"));
    // directory should be present pointing to sub
    expect(paths).toContain(sub);
    // non-markdown file should not be present
    expect(paths).not.toContain(join(tmp, "ignore.txt"));
  });
});
