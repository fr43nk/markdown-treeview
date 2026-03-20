export class MarkdownOperations {
  public static extractHeaderInformation(content: string) {
    if (content === "") {
      return "";
    }

    let info = "";
    // found header section in yaml format in file
    if (content.startsWith("---")) {
      const headerPos = content.indexOf("---", 3);
      const header = content.substring(3, headerPos);
      const grps = header.match(/title:\s*\"?([^\n]+)\"?\n/i);
      info = grps ? grps[1] : "";
      console.log("Header Info", grps, info);
    }
    return info;
  }

  public static extractFirstTitle(content: string) {
    if (content === "") {
      return "";
    }

    let info = "";
    const pos = content.indexOf("# ");
    if (pos !== -1) {
      const end = content.substring(pos + 2).indexOf("\n");
      if (end !== -1) {
        info = content.substring(pos + 2, pos + end + 2);
      }
    }
    return info;
  }
}
