import { text } from 'stream/consumers';
import { assert } from '../assert.js';
import { POSITION_ORDER } from '../constants.js';
import { Canvas } from './canvas.js';
import colors from './colors.js';
import { DisplayComponent } from './components/components.js';
import { ComponentStyle } from './ComponentStyles.js';
import { TextLayout } from './TextLayout/text.js';
import { LayoutBounds } from './layout/layoutStyle.js';

export class Renderer {
	static Create() {
		return new Renderer();
	}
	build(root: DisplayComponent, canvas: Canvas): Canvas {
		canvas.clear();
		this.paint(root, canvas);
		return canvas;
	}
	getComponents(root: DisplayComponent) {
		const components: DisplayComponent[] = [];

		const visit = (comp: DisplayComponent) => {
			if (!comp.visible()) {
				return;
			}
			components.push(comp);

			for (const child of comp.children()) {
				visit(child);
			}
		};

		visit(root);

		return components;
	}

	style: ComponentStyle = ComponentStyle.Create()
		.setBackgroundColor(colors.BACKGROUND_OFF)
		.setColor(colors.FOREGROUND_OFF);

	private paint(root: DisplayComponent, canvas: Canvas) {
		const components = this.getComponents(root);

		components.sort((a, b) => {
			if (this.isAncestor(a, b)) {
				return -1;
			}

			if (this.isAncestor(b, a)) {
				return 1;
			}

			return (
				a.index() - b.index() || POSITION_ORDER[a.positionMode()] - POSITION_ORDER[b.positionMode()]
			);
		});
		let defaultBlend = ComponentStyle.Create();

		for (const component of components) {
			assert(component.visible(), 'component should not be visible');

			this.paintBorder(component, canvas);

			defaultBlend.blend(component.styles(), component.parent()?.styles());
			canvas.fillRect(component.layout(), defaultBlend);
			defaultBlend.reset();

			component.onPrePaint(canvas);
			component.paint(canvas);

			defaultBlend.blend(component.styles(), component.parent()?.styles());
			this.paintContent(component, canvas, defaultBlend);
			defaultBlend.reset();
		}
	}
	private paintBorder(component: DisplayComponent, canvas: Canvas) {
		const bound: LayoutBounds = {
			height: 0,
			width: 0,
			x: 0,
			y: 0,
		};
		const border = component.border();

		const cl = component.paddingLayout();
		const out = border.styles().display();

		border.styles().setBackgroundColor(component.styles().backgroundColor());
		if (border.left() > 0) {
			bound.x = cl.x - border.left();
			bound.height = cl.height + border.top() + border.bottom();
			bound.width = border.left();
			bound.y = cl.y - border.top();

			border.styles().setDisplay(border.borderStyle().left);
			canvas.fillRect(bound, border.styles());
			border.styles().setDisplay(out);
		}

		if (border.right() > 0) {
			bound.x = cl.x + cl.width;
			bound.height = cl.height + border.top() + border.bottom();
			bound.width = border.right();
			bound.y = cl.y - border.top();
			border.styles().setDisplay(border.borderStyle().right);
			canvas.fillRect(bound, border.styles());
			border.styles().setDisplay(out);
		}

		if (border.top() > 0) {
			let width = cl.width + border.left() + border.right();

			let text = border.borderStyle().top.repeat(width);

			if (border.left() > 0 && border.right() > 0) {
				text = border.borderStyle().top_left + text.slice(1, -1) + border.borderStyle().top_right;
			}

			bound.x = cl.x - border.left();
			bound.height = border.top();
			bound.width = width;
			bound.y = cl.y - border.top();

			canvas.fillRect(bound, border.styles());
			canvas.drawText(bound, text, border.styles());
		}

		if (border.bottom() > 0) {
			let width = cl.width + border.left() + border.right();

			let text = border.borderStyle().bottom.repeat(width);

			if (border.left() > 0 && border.right() > 0) {
				text =
					border.borderStyle().bottom_left + text.slice(1, -1) + border.borderStyle().bottom_right;
			}

			bound.x = cl.x - border.left();
			bound.width = width;
			bound.y = cl.y + cl.height;
			bound.height = border.bottom();

			canvas.fillRect(bound, border.styles());
			canvas.drawText(bound, text, border.styles());
		}
	}

	private isAncestor(ancestor: DisplayComponent, component: DisplayComponent) {
		let parent = component.parent();

		while (parent) {
			if (parent === ancestor) {
				return true;
			}

			parent = parent.parent();
		}

		return false;
	}

	paintContent(component: DisplayComponent, canvas: Canvas, styles?: ComponentStyle) {
		const cl = component.contentLayout();
		const viewport = component.viewport();

		const layout = component.content().layout();

		if (layout.height <= 0) {
			return;
		}

		const firstLine = viewport.firstLine;
		const lastLine = firstLine + viewport.visibleLines;

		for (let lineNumber = firstLine; lineNumber < lastLine; lineNumber++) {
			const line = component.content().lines().at(lineNumber);
			if (!line) {
				continue;
			}

			const screenY = cl.y + (lineNumber - firstLine);

			canvas.drawText(
				{
					height: cl.height,
					width: cl.width,
					x: cl.x + line.x(),
					y: screenY,
				},
				line.content(),
				styles,
			);
		}
	}

	render(canvas: Canvas) {
		const rows: string[] = [];
		// i know theres some optimization that we can do here
		for (let i = canvas.startY(); i < canvas.startY() + canvas.height(); i++) {
			let row = '';
			for (let j = canvas.startX(); j < canvas.startX() + canvas.width(); j++) {
				const tile = canvas.getCell(j, i);

				assert(tile, `invalid tile came out at x:${j}, y:${i}`);
				assert(tile.styles.display().length == 1, 'cannot display more things on one cell');
				if (this.style.backgroundColor() !== tile.styles.backgroundColor()) {
					this.style.setBackgroundColor(tile.styles.backgroundColor());
					row += tile.styles.backgroundColor();
				}

				if (this.style.color() !== tile.styles.color()) {
					this.style.setColor(tile.styles.color());
					row += tile.styles.color();
				}

				if (this.style.isDim() !== tile.styles.isDim()) {
					this.style.setDim(tile.styles.isDim());
					row += tile.styles.isDim() ? '\x1b[2m' : '\x1b[22m';
				}

				if (this.style.isItalic() !== tile.styles.isItalic()) {
					this.style.setItalic(tile.styles.isItalic());
					row += tile.styles.isItalic() ? '\x1b[3m' : '\x1b[23m';
				}

				if (this.style.isUnderline() !== tile.styles.isUnderline()) {
					this.style.setUnderline(tile.styles.isUnderline());
					row += tile.styles.isUnderline() ? '\x1b[4m' : '\x1b[24m';
				}

				if (this.style.isStrikeThrough() !== tile.styles.isStrikeThrough()) {
					this.style.setStrikeThrough(tile.styles.isStrikeThrough());
					row += tile.styles.isStrikeThrough() ? '\x1b[9m' : '\x1b[29m';
				}

				if (this.style.isInverse() !== tile.styles.isInverse()) {
					this.style.setInverse(tile.styles.isInverse());
					row += tile.styles.isInverse() ? '\x1b[7m' : '\x1b[27m';
				}

				if (this.style.isBlink() !== tile.styles.isBlink()) {
					this.style.setBlink(tile.styles.isBlink());
					row += tile.styles.isBlink() ? '\x1b[5m' : '\x1b[25m';
				}

				if (this.style.isHidden() !== tile.styles.isHidden()) {
					this.style.setHidden(tile.styles.isHidden());
					row += tile.styles.isHidden() ? '\x1b[8m' : '\x1b[28m';
				}

				if (this.style.isBold() !== tile.styles.isBold()) {
					this.style.setBold(tile.styles.isBold());
					row += tile.styles.isBold() ? '\x1b[1m' : '\x1b[22m';
				}
				row += tile.styles.display();
			}
			rows.push(row);
		}
		return rows.join('\r\n');
	}
}
