import { LogLevel } from "vscode";
import { ConfigurationProperty } from "./configuration-property";

export class Configuration {
  private readonly expandTreeView = new ConfigurationProperty<boolean>(false);
  private readonly logLevel = new ConfigurationProperty<LogLevel>(LogLevel.Off);

  get ExpandTreeView(): ConfigurationProperty<boolean> {
    return this.expandTreeView;
  }

  get LogLevel(): ConfigurationProperty<LogLevel> {
    return this.logLevel;
  }
}
