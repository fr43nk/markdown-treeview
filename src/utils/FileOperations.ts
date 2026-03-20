import { promises } from "fs";
import { MarkdownOperations } from "./MarkdownOperations";
import path = require("path");

export class FileOperations {
  public static async getTitleFromFile(file: string) {
    const content = await promises.readFile(file, "utf-8");

    /**
     * check if header information is available
     * ---
     * title: .*
     * date: YYYY-MM-dd HH:mm
     * ---
     *
     * If not, read the first Title from the file
     */
    let name = MarkdownOperations.extractHeaderInformation(content);
    if (name === "") {
      name = MarkdownOperations.extractFirstTitle(content);
      if (name === "") {
        return path.basename(file);
      }
    }
    return name;
  }
}
