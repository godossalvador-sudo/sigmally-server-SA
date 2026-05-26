const { clampBits, intersects } = require("../primitives/Misc");

const bitRangeKey = Symbol();

/** @template {{ range: Rect, bitRange?: BitRange }} T */
class BitGrid {
	/**
	 * @param {Rect} range
	 */
	constructor(range) {
		this.range = range;

		/** @type {Set<T>[]} */
		this.tiles = [];
		for (let i = 0; i < 32 * 32; ++i) this.tiles.push(new Set());
	}

	/** @param {Rect} range */
	bitRange(range) {
		const leftmostBit = ((range.x - range.w) - (this.range.x - this.range.w)) / (this.range.w * 2) * 32;
		const rightmostBit = ((range.x + range.w) - (this.range.x - this.range.w)) / (this.range.w * 2) * 32;
		const topmostBit = ((range.y - range.h) - (this.range.y - this.range.h)) / (this.range.h * 2) * 32;
		const bottommostBit = ((range.y + range.h) - (this.range.y - this.range.h)) / (this.range.h * 2) * 32;

		return {
			leftmost: clampBits(Math.floor(leftmostBit)),
			rightmost: clampBits(Math.ceil(rightmostBit)),
			topmost: clampBits(Math.floor(topmostBit)),
			bottommost: clampBits(Math.ceil(bottommostBit))
		};
	}

	/** @param {T} item */
	insert(item) {
		const bitRange = this.bitRange(item.range);
		item[bitRangeKey] = bitRange;
		for (let x = bitRange.leftmost; x <= bitRange.rightmost; x++) {
			for (let y = bitRange.topmost; y <= bitRange.bottommost; y++) {
				this.tiles[y * 32 + x].add(item);
			}
		}
	}

	/** @param {T} item */
	update(item) {
		const bitRange = this.bitRange(item.range);
		const oldBitRange = item[bitRangeKey];
		item[bitRangeKey] = bitRange;

		const biggerBitRange = {
			leftmost: Math.min(bitRange.leftmost, oldBitRange.leftmost),
			rightmost: Math.max(bitRange.rightmost, oldBitRange.rightmost),
			topmost: Math.min(bitRange.topmost, oldBitRange.topmost),
			bottommost: Math.max(bitRange.bottommost, oldBitRange.bottommost),
		};

		// trim item from old tiles
		for (let x = biggerBitRange.leftmost; x <= biggerBitRange.rightmost; x++) {
			const xWithinNew = bitRange.leftmost <= x && x <= bitRange.rightmost;
			const xWithinOld = oldBitRange.leftmost <= x && x <= oldBitRange.rightmost;
			for (let y = biggerBitRange.topmost; y <= biggerBitRange.bottommost; y++) {
				const yWithinNew = bitRange.topmost <= y && y <= bitRange.bottommost;
				const yWithinOld = oldBitRange.topmost <= y && y <= oldBitRange.bottommost;
				const withinNew = xWithinNew && yWithinNew;
				const withinOld = xWithinOld && yWithinOld;
				if (withinNew && !withinOld) this.tiles[y * 32 + x].add(item);
				else if (!withinNew && withinOld) this.tiles[y * 32 + x].delete(item);
			}
		}
	}

	/** @param {T} item */
	remove(item) {
		const { leftmost, rightmost, topmost, bottommost } = item[bitRangeKey];
		for (let x = leftmost; x <= rightmost; x++) {
			for (let y = topmost; y <= bottommost; y++) {
				this.tiles[y * 32 + x].delete(item);
			}
		}
		delete item[bitRangeKey];
	}

	/**
	 * @param {Range} bitRange
	 * @param {(item: T) => void} callback
	 */
	search(range, callback, fast) {
		const { leftmost, rightmost, topmost, bottommost } = this.bitRange(range);
		for (let x = leftmost; x <= rightmost; x++) {
			for (let y = topmost; y <= bottommost; y++) {
				for (const item of this.tiles[y * 32 + x]) {
					// don't process items more than once
					if (!item[bitRangeKey]) {
						console.log('!item[bitRangeKey] triggered!!!!!');
						// this happens very rarely, and i'm not sure why, but this is a temporary fix
						this.tiles[y * 32 + x].delete(item);
						continue;
					}
					if ((leftmost <= item[bitRangeKey].leftmost && item[bitRangeKey].leftmost < x)
							|| (topmost <= item[bitRangeKey].topmost && item[bitRangeKey].topmost < y)) continue;
					if (fast || intersects(item.range, range)) callback(item);
				}
			}
		}
	}

	/**
	 * @param {Range} range
	 * @param {(item: T) => boolean} selector
	 */
	containsAny(range, selector) {
		const { leftmost, rightmost, topmost, bottommost } = this.bitRange(range);
		for (let x = leftmost; x <= rightmost; x++) {
			for (let y = topmost; y <= bottommost; y++) {
				for (const item of this.tiles[y * 32 + x]) {
					if (!item[bitRangeKey]) {
						console.log('!item[bitRangeKey] triggered!!!!! 22');
						// this happens very rarely, and i'm not sure why, but this is a temporary fix
						this.tiles[y * 32 + x].delete(item);
						continue;
					}
					if (intersects(item.range, range) && (!selector || selector(item))) return true;
				}
			}
		}

		return false;
	}
}

module.exports = BitGrid;
