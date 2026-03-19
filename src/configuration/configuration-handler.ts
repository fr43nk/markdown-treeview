import { Event, EventEmitter, workspace, WorkspaceConfiguration } from "vscode";

import { Configuration } from "./configuration";
import { LogLevel } from "../types/log-level";
import { ConfigurationProperty } from "./configuration-property";
import { IDisposable } from "../interfaces/idisposable";

export class ConfigurationHandler implements IDisposable {
  private mConfigChanged = new EventEmitter<string[]>();
  private mConfiguration = new Configuration();
  private mChangeIdents: string[] = [];
  private mDisposables: IDisposable[] = [];

  constructor() {
    this.mDisposables.push(workspace.onDidChangeConfiguration(() => this.handleChangedConfig()));
    this.handleChangedConfig();
  }

  dispose(): void {
    this.mDisposables.forEach((d) => d.dispose());
  }

  get onDidChangeConfiguration(): Event<string[]> {
    return this.mConfigChanged.event;
  }

  get configuration(): Configuration {
    return this.mConfiguration;
  }

  private loadConfig(): boolean {
    const config = workspace.getConfiguration("markdown-treeview");
    if (config) {
      // reset change detection array
      this.mChangeIdents = [];

      this.setChangeConfigDate<boolean>(
        config,
        "expandTreeView",
        this.mConfiguration.ExpandTreeView,
      );
      this.setChangeConfigDate<LogLevel>(config, "logLevel", this.mConfiguration.LogLevel);

      return true;
    }
    return false;
  }

  private handleChangedConfig(): void {
    if (this.loadConfig()) {
      this.mConfigChanged.fire(this.mChangeIdents);
    }
  }

  private setChangeConfigDate<T>(
    config: WorkspaceConfiguration,
    descriptor: string,
    configValue: ConfigurationProperty<T>,
  ): boolean {
    if (config.has(descriptor)) {
      configValue.value = config.get(descriptor) as T;
      if (configValue.changed) {
        configValue.changed = true;
        this.mChangeIdents.push(descriptor);
        return true;
      }
    }
    return false;
  }
}
