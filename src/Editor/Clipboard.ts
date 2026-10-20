export class Clipboard {
    private _text: string = ''

    setText(str: string) {
        this._text = str
        return this
    }

    readText(): string {
        return this._text
    }
}