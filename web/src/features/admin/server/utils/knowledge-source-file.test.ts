import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  extractKnowledgeSourceFile,
  mergeKnowledgeSourceText,
} from "./knowledge-source-file";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createZipWithDeflatedFile(fileName: string, content: string): Buffer {
  const fileNameBuffer = Buffer.from(fileName);
  const contentBuffer = Buffer.from(content);
  const compressedBuffer = deflateRawSync(contentBuffer);
  const localHeader = Buffer.alloc(30 + fileNameBuffer.length);

  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(compressedBuffer.length, 18);
  localHeader.writeUInt32LE(contentBuffer.length, 22);
  localHeader.writeUInt16LE(fileNameBuffer.length, 26);
  localHeader.writeUInt16LE(0, 28);
  fileNameBuffer.copy(localHeader, 30);

  const centralDirectoryOffset = localHeader.length + compressedBuffer.length;
  const centralDirectory = Buffer.alloc(46 + fileNameBuffer.length);

  centralDirectory.writeUInt32LE(0x02014b50, 0);
  centralDirectory.writeUInt16LE(20, 4);
  centralDirectory.writeUInt16LE(20, 6);
  centralDirectory.writeUInt16LE(0, 8);
  centralDirectory.writeUInt16LE(8, 10);
  centralDirectory.writeUInt16LE(0, 12);
  centralDirectory.writeUInt16LE(0, 14);
  centralDirectory.writeUInt32LE(0, 16);
  centralDirectory.writeUInt32LE(compressedBuffer.length, 20);
  centralDirectory.writeUInt32LE(contentBuffer.length, 24);
  centralDirectory.writeUInt16LE(fileNameBuffer.length, 28);
  centralDirectory.writeUInt16LE(0, 30);
  centralDirectory.writeUInt16LE(0, 32);
  centralDirectory.writeUInt16LE(0, 34);
  centralDirectory.writeUInt16LE(0, 36);
  centralDirectory.writeUInt32LE(0, 38);
  centralDirectory.writeUInt32LE(0, 42);
  fileNameBuffer.copy(centralDirectory, 46);

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(1, 8);
  endOfCentralDirectory.writeUInt16LE(1, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    localHeader,
    compressedBuffer,
    centralDirectory,
    endOfCentralDirectory,
  ]);
}

function createDocxFile(paragraphs: string[]) {
  const body = paragraphs
    .map(
      (paragraph) => `<w:p><w:r><w:t>${escapeXml(paragraph)}</w:t></w:r></w:p>`
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
  const buffer = createZipWithDeflatedFile("word/document.xml", xml);

  return new File([new Uint8Array(buffer)], "source.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("extractKnowledgeSourceFile", () => {
  it("reads text from .txt files", async () => {
    const file = new File(["  本文テキスト  \n"], "source.txt", {
      type: "text/plain",
    });

    await expect(extractKnowledgeSourceFile(file)).resolves.toEqual({
      fileName: "source.txt",
      text: "本文テキスト",
    });
  });

  it("reads text from .md files", async () => {
    const file = new File(["# 見出し\n\n本文"], "source.md", {
      type: "text/markdown",
    });

    await expect(extractKnowledgeSourceFile(file)).resolves.toEqual({
      fileName: "source.md",
      text: "# 見出し\n\n本文",
    });
  });

  it("reads paragraph text from .docx files", async () => {
    const file = createDocxFile(["第一段落", "第二段落 & 補足"]);

    await expect(extractKnowledgeSourceFile(file)).resolves.toEqual({
      fileName: "source.docx",
      text: "第一段落\n第二段落 & 補足",
    });
  });

  it("rejects pdf files", async () => {
    const file = new File(["%PDF"], "source.pdf", {
      type: "application/pdf",
    });

    await expect(extractKnowledgeSourceFile(file)).rejects.toThrow(
      "ナレッジソースにPDFは使えません"
    );
  });
});

describe("mergeKnowledgeSourceText", () => {
  it("returns manual text when no file was uploaded", () => {
    expect(mergeKnowledgeSourceText("手入力", null)).toBe("手入力");
  });

  it("uses file text when manual text is empty", () => {
    expect(
      mergeKnowledgeSourceText(null, {
        fileName: "source.txt",
        text: "ファイル本文",
      })
    ).toBe("# 添付ファイル: source.txt\n\nファイル本文");
  });

  it("appends file text after manual text", () => {
    expect(
      mergeKnowledgeSourceText("手入力", {
        fileName: "source.txt",
        text: "ファイル本文",
      })
    ).toBe("手入力\n\n---\n\n# 添付ファイル: source.txt\n\nファイル本文");
  });
});
