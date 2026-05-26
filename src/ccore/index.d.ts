export class BitGrid<T extends { range: Rect }> {
	constructor(range: Rect);
	destroy(): void;
	clean(): void;
	insert(item: T): void;
	update(item: T): void;
	remove(item: T): void;
	search(range: Rect, callback: (item: T) => void): void;
	containsAny(range: Rect, callback: (item: T) => boolean): boolean;
}