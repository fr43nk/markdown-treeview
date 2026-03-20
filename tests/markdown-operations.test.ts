import { describe, it, expect } from "vitest";
import { MarkdownOperations } from "../src/utils/MarkdownOperations";

describe("MarkdownOperations.extractHeaderInformation", () => {
  it('returns empty string for "--- ---"', () => {
    const content = "--- ---";
    const res = MarkdownOperations.extractHeaderInformation(content);
    expect(res).toBe("");
  });

  it('returns empty string for "---\n---"', () => {
    const content = "---\n---";
    const res = MarkdownOperations.extractHeaderInformation(content);
    expect(res).toBe("");
  });

  it("returns empty string for header with title key but no value", () => {
    const content = "---\ntitle:\n---";
    const res = MarkdownOperations.extractHeaderInformation(content);
    expect(res).toBe("");
  });

  it("parses quoted title value and returns Name", () => {
    const content = '---\ntitle: "Name"\n---';
    const res = MarkdownOperations.extractHeaderInformation(content);
    expect(res).toBe("Name");
  });

  it("parses unquoted title value and returns name", () => {
    const content = "---\ntitle: name\n---";
    const res = MarkdownOperations.extractHeaderInformation(content);
    expect(res).toBe("name");
  });
});
