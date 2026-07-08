import { inflateRawSync } from "node:zlib";

const MAX_KNOWLEDGE_SOURCE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_KNOWLEDGE_SOURCE_TEXT_LENGTH = 200_000;
const DOCX_DOCUMENT_PATH = "word/document.xml";

type KnowledgeSourceFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type ExtractedKnowledgeSourceFile = {
  fileName: string;
  text: string;
};

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function ensureAllowedKnowledgeSourceFile(file: KnowledgeSourceFile) {
  const extension = getFileExtension(file.name);

  if (extension === ".pdf" || file.type === "application/pdf") {
    throw new Error(
      "ナレッジソースにPDFは使えません。.md、.txt、.docxのいずれかを選択してください。"
    );
  }

  if (![".md", ".txt", ".docx"].includes(extension)) {
    throw new Error(
      "ナレッジソースファイルは.md、.txt、.docxのいずれかを選択してください。"
    );
  }

  if (file.size > MAX_KNOWLEDGE_SOURCE_FILE_SIZE) {
    throw new Error("ナレッジソースファイルは2MB以下にしてください。");
  }
}

function ensureTextLength(text: string) {
  if (text.length > MAX_KNOWLEDGE_SOURCE_TEXT_LENGTH) {
    throw new Error(
      "ナレッジソースファイルの本文が長すぎます。内容を短くしてからアップロードしてください。"
    );
  }
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);

  for (let offset = buffer.length - 22; offset >= minOffset; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("docxファイルの形式を読み取れませんでした。");
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("docxファイルの中央ディレクトリを読み取れませんでした。");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("docxファイルの本文データを読み取れませんでした。");
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressedData = buffer.subarray(
    dataStart,
    dataStart + entry.compressedSize
  );

  if (entry.compressionMethod === 0) {
    return compressedData;
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressedData);
  }

  throw new Error("このdocxファイルの圧縮形式には対応していません。");
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function docxXmlToText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:(?:br|cr)\b[^>]*\/>/g, "\n")
      .replace(/<w:tab\b[^>]*\/>/g, "\t")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDocxText(buffer: Buffer): string {
  const documentEntry = readZipEntries(buffer).find(
    (entry) => entry.name === DOCX_DOCUMENT_PATH
  );

  if (!documentEntry) {
    throw new Error("docxファイル内に本文が見つかりませんでした。");
  }

  const xmlBuffer = readZipEntry(buffer, documentEntry);
  if (xmlBuffer.length > MAX_KNOWLEDGE_SOURCE_TEXT_LENGTH * 10) {
    throw new Error("docxファイルの本文が大きすぎます。");
  }

  const text = docxXmlToText(xmlBuffer.toString("utf8"));
  if (!text) {
    throw new Error("docxファイルからテキストを読み取れませんでした。");
  }

  return text;
}

export async function extractKnowledgeSourceFile(
  file: KnowledgeSourceFile
): Promise<ExtractedKnowledgeSourceFile> {
  ensureAllowedKnowledgeSourceFile(file);

  const extension = getFileExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const text =
    extension === ".docx"
      ? extractDocxText(buffer)
      : new TextDecoder("utf-8").decode(buffer).trim();

  if (!text) {
    throw new Error("ナレッジソースファイルの本文が空です。");
  }

  ensureTextLength(text);

  return {
    fileName: file.name,
    text,
  };
}

export function mergeKnowledgeSourceText(
  manualText: string | null,
  extractedFile: ExtractedKnowledgeSourceFile | null
): string | null {
  if (!extractedFile) {
    return manualText;
  }

  const fileSection = `# 添付ファイル: ${extractedFile.fileName}\n\n${extractedFile.text}`;
  if (!manualText) {
    return fileSection;
  }

  return `${manualText}\n\n---\n\n${fileSection}`;
}
