import fs from "fs";

export class DiskFile implements EditorFile {
  private p: string;

  constructor(path: string) {
    this.p = path;
  }
  path(): string {
    return this.p;
  }
  write(content: string): void {
    fs.writeFileSync(this.path(), content);
  }

  read() {
    try {
      const content = fs.readFileSync(this.path(), { encoding: "utf-8" });
      return content;
    } catch (err) {
      throw new Error("invalid file");
    }
  }
}

export class MemoryFile implements EditorFile {
  constructor(
    private readonly filename: string,
    private content: string,
  ) {}
  path(): string {
    return this.filename;
  }
  read(): string {
    return this.content;
  }
  write(content: string): void {
    this.content = content;
  }
}

export class Textdocument {
  readonly file: EditorFile;

  dirty = false;
  constructor(file: EditorFile) {
    this.file = file;
  }
  read() {
    return this.file.read();
  }
  save(buffer: string) {
    this.file.write(buffer);
  }
}
