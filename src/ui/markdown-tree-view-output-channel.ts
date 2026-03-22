import { LogLevel, OutputChannel, window } from "vscode";

export class MarkdownTreeViewOutputChannel implements OutputChannel {
  private static instance: MarkdownTreeViewOutputChannel | null = null;
  name: string;
  debug: LogLevel = LogLevel.Off;

  private constructor(private outputChannelBase: OutputChannel) {
    this.name = outputChannelBase.name;
  }

  public static get Instance(): MarkdownTreeViewOutputChannel {
    if (MarkdownTreeViewOutputChannel.instance === null) {
      MarkdownTreeViewOutputChannel.instance = new MarkdownTreeViewOutputChannel(
        window.createOutputChannel("Markdown TreeView"),
      );
    }
    return MarkdownTreeViewOutputChannel.instance;
  }

  append(value: string, level?: LogLevel): void {
    if (this.debug > LogLevel.Off) {
      if (level !== undefined && this.debug >= level) {
        this.outputChannelBase.append(value);
      }
    }
  }
  appendLine(value: string, level?: LogLevel): void {
    if (this.debug > LogLevel.Off) {
      if (level !== undefined && this.debug <= level) {
        this.outputChannelBase.appendLine(`[${this.getTimestamp()}] ${value}`);
      }
    }
  }

  replace(value: string): void {
    if (this.debug) {
      this.outputChannelBase.replace(value);
    }
  }
  clear(): void {
    this.outputChannelBase.clear();
  }
  show(column?: unknown, preserveFocus?: boolean): void {
    this.outputChannelBase.show(preserveFocus);
  }
  hide(): void {
    this.outputChannelBase.hide();
  }
  dispose(): void {
    this.outputChannelBase.dispose();
  }

  private getTimestamp(): string {
    const d = new Date();
    const _m = +d.getMonth() < 10 ? `0${d.getMonth()}` : d.getMonth();
    const _d = +d.getDate() < 10 ? `0${d.getDate()}` : d.getDate();

    return `${d.getFullYear()}-${_m}-${_d} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
  }

  set LogLevel(value: LogLevel) {
    this.debug = value;
  }

  get LogLevel(): LogLevel {
    return this.debug;
  }
}
