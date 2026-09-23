import { assert } from '../../assert.js';
import { LayoutBounds } from '../layout/layoutStyle.js';
import { TextBuffer } from '../buffer/Buffer.js';

export type OverflowTypes = 'wrap' | 'clip' | 'visible';

type WrapTypes = 'character' | 'word';
type TextAlign = 'left' | 'right' | 'center';

class TextLayoutOptions {
	private _overflow: OverflowTypes = 'wrap';
	private _align: TextAlign = 'left';
	private _justify: boolean = false;

	private _lineWidth?: number;

	justify() {
		return this._justify;
	}
	setJustify(val: boolean) {
		this._justify = val;
		return this;
	}

	align() {
		return this._align;
	}
	setAlign(align: TextAlign) {
		this._align = align;
		return this;
	}

	overflow() {
		return this._overflow;
	}
	setOverflow(val: OverflowTypes) {
		this._overflow = val;
		return this;
	}
	lineWidth() {
		return this._lineWidth;
	}
	setLineWidth(val: number | undefined) {
		this._lineWidth = val;
		return this;
	}
}

class VisualLine {
	private _content: string = '';
	private _start: number = 0;
	private _end: number = 0;
	private _x: number = 0;
	private _y: number = 0;

	content() {
		return this._content;
	}
	setContent(str: string) {
		this._content = str;
		return this;
	}
	start() {
		return this._start;
	}
	setStart(val: number) {
		this._start = val;
		return this;
	}
	height() {
		return 1;
	}

	width() {
		return this.content().length;
	}
	y() {
		return this._y;
	}
	setY(val: number) {
		this._y = val;
		return this;
	}

	x() {
		return this._x;
	}
	setX(val: number) {
		this._x = val;
		return this;
	}

	end() {
		return this._end;
	}
	setEnd(val: number) {
		this._end = val;
		return this;
	}
}

export class TextLayout {
	private _options: TextLayoutOptions = new TextLayoutOptions();
	private _dirty: boolean = false;

	private _lines: VisualLine[] = [];

	options() {
		return this._options;
	}
	buffer: TextBuffer = new TextBuffer();

	measure(bounds: LayoutBounds) {
		const content = this.buffer;

		this._lines = [];

		if (content.count() === 0) {
			return;
		}

		const maxW = Math.min(this.lineWidth() ?? Infinity, bounds.width);

		// We cannot lay out anything without horizontal space.
		if (maxW <= 0) {
			return;
		}

		let at = 0;

		while (at < content.count()) {
			const currentLine = content.at(at) ?? '';

			// Empty buffer line still needs to produce a visual line.
			if (currentLine.length === 0) {
				const line = new VisualLine();

				line.setContent('').setStart(0).setEnd(0).setY(this._lines.length).setX(0);

				this._lines.push(line);
				at++;
				continue;
			}

			let startAt = 0;

			while (startAt < currentLine.length) {
				let endAt = startAt + Math.min(maxW, currentLine.length - startAt);

				// Don't wrap this line.
				if (this.overflow() === 'visible') {
					endAt = currentLine.length;
				}

				const line = new VisualLine();

				line.setContent(currentLine.slice(startAt, endAt));

				if (this.justify()) {
					this.justifyLine(line, this._lines.at(-1));
				}

				line.setY(this._lines.length).setStart(startAt).setEnd(endAt);

				if (this.align() === 'left') {
					line.setX(0);
				} else if (this.align() === 'center') {
					const width = this.lineWidth() ?? bounds.width;

					line.setX(Math.floor(width / 2) - Math.floor(line.width() / 2));
				} else if (this.align() === 'right') {
					const width = this.lineWidth() ?? bounds.width;

					line.setX(width - line.width());
				}

				this._lines.push(line);

				// `visible` means don't wrap.
				if (this.overflow() === 'visible') {
					break;
				}

				// `clip` means don't wrap either.
				// The renderer/viewport should handle clipping.
				if (this.overflow() === 'clip') {
					break;
				}

				// Make absolutely sure the loop progresses.
				if (endAt <= startAt) {
					throw new Error(`TextLayout failed to make progress: ${startAt} -> ${endAt}`);
				}

				startAt = endAt;
			}

			at++;
		}
	}
	justifyLine(line: VisualLine, previous: VisualLine | undefined) {
		if (!previous) return;

		const difference = previous.width() - line.width();

		const spaces = Math.max((line.content().match(/ /g) || []).length, 1);

		const each = Math.max(Math.round(difference / spaces), 1);

		line.setContent(line.content().replaceAll(' ', ' '.repeat(each)));
	}

	lines(): VisualLine[] {
		return this._lines;
	}

	layout(): LayoutBounds {
		let maxW = 0;

		for (const line of this.lines()) {
			const clamped = this.lineWidth();
			if ((this.overflow() === 'wrap' || this.overflow() === 'clip') && clamped) {
				assert(line.width() <= clamped, 'width cannot be greater than set max');
			}
			maxW = Math.max(maxW, line.width());
		}
		return {
			height: this.lines().length,
			width: maxW,
			x: this.lines().at(0)?.x() || 0,
			y: this.lines().at(0)?.y() || 0,
		};
	}

	getTextPosition(x: number, y: number): number {
		return 0;
	}

	getCoordinates(position: number): Point {
		return {
			x: 0,
			y: 0,
		};
	}

	getLineAt(y: number): VisualLine | undefined {
		for (const line of this.lines()) {
			if (line.y() === y) {
				return line;
			}
		}
	}

	getLineForPosition(position: number): VisualLine | undefined {
		return new VisualLine();
	}

	getColumnForPosition(position: number): number {
		return 0;
	}

	invalidate(): void {}

	isDirty(): boolean {
		return this._dirty;
	}
	overflow() {
		return this.options().overflow();
	}
	setOverflow(val: OverflowTypes) {
		this.options().setOverflow(val);
		return this;
	}
	lineWidth(): number | undefined {
		return this.options().lineWidth();
	}
	setLineWidth(val: number | undefined) {
		this.options().setLineWidth(val);
		return this;
	}

	setText(text: string) {
		this.buffer = new TextBuffer(text);
		return this;
	}
	align() {
		return this.options().align();
	}
	setAlign(t: TextAlign) {
		this.options().setAlign(t);
		return this;
	}
	justify() {
		return this.options().justify();
	}
	setJustify(val: boolean) {
		this.options().setJustify(val);
		return this;
	}
}
