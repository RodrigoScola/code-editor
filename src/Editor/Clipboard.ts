export class Clipboard {
  private _text: string = "";

  read(): string {
    return this._text;
  }
  write(str: string) {
    this._text = str;
    return this;
  }
}
