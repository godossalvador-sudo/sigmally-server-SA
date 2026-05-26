#include <assert.h>
#include <math.h>
#include <memory.h>
#include <node_api.h>
#include <stdlib.h>

#include "bitgrid.h"
#include "ccore.h"

static napi_type_tag bitgrid_item_tag = { 0x5FDA6FE31A2E49C1, 0x85F6748A8ACD1A0A };
static napi_type_tag bitgrid_tag = { 0xB27DE58816434EFA, 0xA9A5CA64C923D7AD };

static void bitgrid_tile_insert(bitgrid_tile_t* tile, bitgrid_item_t* item, bool fast) {
	if (tile->next_item == tile->max_items) {
		bitgrid_item_t** new_items = malloc(tile->max_items * 2 * sizeof(bitgrid_item_t));
		int32_t new_i = 0;
		for (int32_t old_i = 0; old_i < tile->max_items; ++old_i) {
			if (tile->items[old_i] == 0) continue;
			new_items[new_i++] = tile->items[old_i];
		}

		free(tile->items);
		tile->items = new_items;
		tile->max_items *= 2;
		tile->next_item = new_i;
	}

	if (!fast) {
		for (int32_t i = 0; i < tile->next_item; ++i) {
			if (tile->items[i] == item) return;
		}
	}

	tile->items[tile->next_item++] = item;
}

static void bitgrid_tile_remove(bitgrid_tile_t* tile, bitgrid_item_t* item) {
	for (int32_t i = 0; i < tile->next_item; ++i) {
		if (tile->items[i] != item) continue;
		if (i == tile->next_item - 1) {
			--tile->next_item;
		}

		tile->items[i] = 0;
		return;
	}
}

static NAPI_CALLBACK(bitgrid_range_get_x) {
	bitgrid_item_t* item;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, 0, (void*)&item));
	napi_value result;
	NAPI_OK(napi_create_double(env, item->rect.x, &result));
	return result;
}

static NAPI_CALLBACK(bitgrid_range_get_y) {
	bitgrid_item_t* item;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, 0, (void*)&item));
	napi_value result;
	NAPI_OK(napi_create_double(env, item->rect.y, &result));
	return result;
}

static NAPI_CALLBACK(bitgrid_range_get_w) {
	bitgrid_item_t* item;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, 0, (void*)&item));
	napi_value result;
	NAPI_OK(napi_create_double(env, item->rect.w, &result));
	return result;
}

static NAPI_CALLBACK(bitgrid_range_get_h) {
	bitgrid_item_t* item;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, 0, (void*)&item));
	napi_value result;
	NAPI_OK(napi_create_double(env, item->rect.h, &result));
	return result;
}

static NAPI_CALLBACK(bitgrid_range_set_x) {
	bitgrid_item_t* item;
	size_t argc = 1;
	napi_value argv[1];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, 0, (void*)&item));
	NAPI_OK(napi_get_value_double(env, argv[0], &item->rect.x));
	return 0;
}

static NAPI_CALLBACK(bitgrid_range_set_y) {
	bitgrid_item_t* item;
	size_t argc = 1;
	napi_value argv[1];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, 0, (void*)&item));
	NAPI_OK(napi_get_value_double(env, argv[0], &item->rect.y));
	return 0;
}

static NAPI_CALLBACK(bitgrid_range_set_w) {
	bitgrid_item_t* item;
	size_t argc = 1;
	napi_value argv[1];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, 0, (void*)&item));
	NAPI_OK(napi_get_value_double(env, argv[0], &item->rect.w));
	return 0;
}

static NAPI_CALLBACK(bitgrid_range_set_h) {
	bitgrid_item_t* item;
	size_t argc = 1;
	napi_value argv[1];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, 0, (void*)&item));
	NAPI_OK(napi_get_value_double(env, argv[0], &item->rect.h));
	return 0;
}

NAPI_CALLBACK(bitgrid_constructor) {
	napi_value this_arg;
	size_t argc = 1;
	napi_value argv[1];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, &this_arg, 0));

	rect_t rect;
	napi_value import;
	NAPI_OK(napi_get_named_property(env, argv[0], "x", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.x));
	NAPI_OK(napi_get_named_property(env, argv[0], "y", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.y));
	NAPI_OK(napi_get_named_property(env, argv[0], "w", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.w));
	NAPI_OK(napi_get_named_property(env, argv[0], "h", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.h));

	bitgrid_t* bg = malloc(sizeof(bitgrid_t));
	bg->rect = rect;
	bg->tiles_per_line = 32;

	bg->item_ca = circalloc(19, sizeof(bitgrid_item_t));
	bg->tiles = malloc(bg->tiles_per_line * bg->tiles_per_line * sizeof(bitgrid_tile_t));
	for (int32_t i = 0; i < bg->tiles_per_line * bg->tiles_per_line; ++i) {
		bg->tiles[i].max_items = 128;
		bg->tiles[i].items = malloc(bg->tiles[i].max_items * sizeof(bitgrid_item_t));
		bg->tiles[i].next_item = 0;
	}

	NAPI_OK(napi_wrap(env, this_arg, bg, 0, 0, 0));
	NAPI_OK(napi_type_tag_object(env, this_arg, &bitgrid_tag));

	napi_property_descriptor props[] = {
		{ "destroy", 0, bitgrid_destroy, 0, 0, 0, napi_default_method, 0 },
		{ "clean", 0, bitgrid_clean, 0, 0, 0, napi_default_method, 0 },
		{ "insert", 0, bitgrid_insert, 0, 0, 0, napi_default_method, 0 },
		{ "update", 0, bitgrid_update, 0, 0, 0, napi_default_method, 0 },
		{ "remove", 0, bitgrid_remove, 0, 0, 0, napi_default_method, 0 },
		{ "search", 0, bitgrid_search, 0, 0, 0, napi_default_method, 0 },
		{ "containsAny", 0, bitgrid_search, 0, 0, 0, napi_default_method, 0 },
	};
	NAPI_OK(napi_define_properties(env, this_arg, sizeof(props) / sizeof(napi_property_descriptor), props));

	return NULL;
}

NAPI_CALLBACK(bitgrid_destroy) {
	napi_value this_arg;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, &this_arg, 0));

	bool is_bitgrid;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	assert(is_bitgrid);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));

	for (int32_t i = 0; i < bg->tiles_per_line * bg->tiles_per_line; ++i) {
		bitgrid_tile_t tile = bg->tiles[i];
		for (int32_t j = 0; j < tile.next_item; ++j) {
			bitgrid_item_t* item = tile.items[j];
			if (!item || !item->js_object) continue;

			napi_value js_object;
			NAPI_OK(napi_get_reference_value(env, item->js_object, &js_object));
			NAPI_OK(napi_delete_reference(env, item->js_object));
			item->js_object = 0;

			napi_value js_range;
			NAPI_OK(napi_get_named_property(env, js_object, "range", &js_range));

			napi_value js_x, js_y, js_w, js_h;
			NAPI_OK(napi_create_double(env, item->rect.x, &js_x));
			NAPI_OK(napi_create_double(env, item->rect.y, &js_y));
			NAPI_OK(napi_create_double(env, item->rect.w, &js_w));
			NAPI_OK(napi_create_double(env, item->rect.h, &js_h));
			napi_property_descriptor range_props[] = {
				{ "x", 0, 0, 0, 0, js_x, napi_enumerable | napi_configurable, 0 },
				{ "y", 0, 0, 0, 0, js_y, napi_enumerable | napi_configurable, 0 },
				{ "w", 0, 0, 0, 0, js_w, napi_enumerable | napi_configurable, 0 },
				{ "h", 0, 0, 0, 0, js_h, napi_enumerable | napi_configurable, 0 },
			};
			NAPI_OK(napi_define_properties(env, js_range, sizeof(range_props) / sizeof(napi_property_descriptor), range_props));
		}
		free(bg->tiles[i].items);
	}
	free(bg->tiles);
	circalloc_destroy(&bg->item_ca);

	return 0;
}

NAPI_CALLBACK(bitgrid_clean) {
	napi_value this_arg;
	NAPI_OK(napi_get_cb_info(env, info, 0, 0, &this_arg, 0));

	bool is_bitgrid;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	assert(is_bitgrid);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));

	for (int32_t x = 0; x < bg->tiles_per_line; ++x) {
		for (int32_t y = 0; y < bg->tiles_per_line; ++y) {
			bitgrid_tile_t* tile = &bg->tiles[y * bg->tiles_per_line + x];
			int32_t new_i = 0;
			for (int32_t i = 0; i < tile->next_item; ++i) {
				if (!tile->items[i]) continue;
				tile->items[new_i++] = tile->items[i];
			}
			tile->next_item = new_i;
		}
	}

	return 0;
}

#define CLAMP(x,low,high) low < x ? x < high ? x : high : low;

void rect_to_bg_range(bitgrid_t* bg, rect_t* rect, bitgrid_range_t* bg_range) {
	int32_t left = floor(((rect->x - rect->w) - (bg->rect.x - bg->rect.w)) / (bg->rect.w * 2.0) * bg->tiles_per_line);
	int32_t right = ceil(((rect->x + rect->w) - (bg->rect.x - bg->rect.w)) / (bg->rect.w * 2.0) * bg->tiles_per_line);
	int32_t top = floor(((rect->y - rect->h) - (bg->rect.y - bg->rect.h)) / (bg->rect.h * 2.0) * bg->tiles_per_line);
	int32_t bottom = ceil(((rect->y + rect->h) - (bg->rect.y - bg->rect.h)) / (bg->rect.h * 2.0) * bg->tiles_per_line);

	bg_range->left = CLAMP(left, 0, bg->tiles_per_line - 1);
	bg_range->right = CLAMP(right, 0, bg->tiles_per_line - 1);
	bg_range->top = CLAMP(top, 0, bg->tiles_per_line - 1);
	bg_range->bottom = CLAMP(bottom, 0, bg->tiles_per_line - 1);
}

NAPI_CALLBACK(bitgrid_insert) {
	napi_value this_arg, js_object;
	size_t argc = 1;
	NAPI_OK(napi_get_cb_info(env, info, &argc, &js_object, &this_arg, 0));

	bool is_bitgrid, is_bitgrid_item;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	NAPI_OK(napi_check_object_type_tag(env, js_object, &bitgrid_item_tag, &is_bitgrid_item));
	assert(is_bitgrid && !is_bitgrid_item);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));

	bitgrid_item_t* item = circalloc_alloc(&bg->item_ca);
	NAPI_OK(napi_type_tag_object(env, js_object, &bitgrid_item_tag));
	NAPI_OK(napi_wrap(env, js_object, item, 0, 0, 0));
	NAPI_OK(napi_create_reference(env, js_object, 1, &item->js_object));

	napi_value js_range;
	NAPI_OK(napi_get_named_property(env, js_object, "range", &js_range));
	napi_value import;
	NAPI_OK(napi_get_named_property(env, js_range, "x", &import));
	NAPI_OK(napi_get_value_double(env, import, &item->rect.x));
	NAPI_OK(napi_get_named_property(env, js_range, "y", &import));
	NAPI_OK(napi_get_value_double(env, import, &item->rect.y));
	NAPI_OK(napi_get_named_property(env, js_range, "w", &import));
	NAPI_OK(napi_get_value_double(env, import, &item->rect.w));
	NAPI_OK(napi_get_named_property(env, js_range, "h", &import));
	NAPI_OK(napi_get_value_double(env, import, &item->rect.h));

	napi_property_descriptor range_props[] = {
		{ "x", 0, 0, bitgrid_range_get_x, bitgrid_range_set_x, 0, napi_enumerable | napi_configurable, item },
		{ "y", 0, 0, bitgrid_range_get_y, bitgrid_range_set_y, 0, napi_enumerable | napi_configurable, item },
		{ "w", 0, 0, bitgrid_range_get_w, bitgrid_range_set_w, 0, napi_enumerable | napi_configurable, item },
		{ "h", 0, 0, bitgrid_range_get_h, bitgrid_range_set_h, 0, napi_enumerable | napi_configurable, item },
	};
	NAPI_OK(napi_define_properties(env, js_range, sizeof(range_props) / sizeof(napi_property_descriptor), range_props));

	rect_to_bg_range(bg, &item->rect, &item->bg_range);
	for (int32_t x = item->bg_range.left; x <= item->bg_range.right; ++x) {
		for (int32_t y = item->bg_range.top; y <= item->bg_range.bottom; ++y) {
			bitgrid_tile_insert(&bg->tiles[y * bg->tiles_per_line + x], item, false);
		}
	}

	return 0;
}

NAPI_CALLBACK(bitgrid_update) {
	napi_value this_arg, js_object;
	size_t argc = 1;
	NAPI_OK(napi_get_cb_info(env, info, &argc, &js_object, &this_arg, 0));

	bool is_bitgrid, is_bitgrid_item;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	NAPI_OK(napi_check_object_type_tag(env, js_object, &bitgrid_item_tag, &is_bitgrid_item));
	assert(is_bitgrid && is_bitgrid_item);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));
	bitgrid_item_t* item;
	NAPI_OK(napi_unwrap(env, js_object, (void**)&item));

	bitgrid_range_t new_bg_range;
	rect_to_bg_range(bg, &item->rect, &new_bg_range);

	for (int32_t x = item->bg_range.left; x < new_bg_range.left; ++x) {
		for (int32_t y = item->bg_range.top; y <= item->bg_range.bottom; ++y) {
			bitgrid_tile_remove(&bg->tiles[y * bg->tiles_per_line + x], item);
		}
	}
	for (int32_t x = item->bg_range.right; x > new_bg_range.right; --x) {
		for (int32_t y = item->bg_range.top; y <= item->bg_range.bottom; ++y) {
			bitgrid_tile_remove(&bg->tiles[y * bg->tiles_per_line + x], item);
		}
	}
	for (int32_t y = item->bg_range.top; y < new_bg_range.top; ++y) {
		for (int32_t x = item->bg_range.left; x <= item->bg_range.right; ++x) {
			bitgrid_tile_remove(&bg->tiles[y * bg->tiles_per_line + x], item);
		}
	}
	for (int32_t y = item->bg_range.bottom; y > new_bg_range.bottom; --y) {
		for (int32_t x = item->bg_range.left; x <= item->bg_range.right; ++x) {
			bitgrid_tile_remove(&bg->tiles[y * bg->tiles_per_line + x], item);
		}
	}

	for (int32_t x = new_bg_range.left; x < item->bg_range.left; ++x) {
		for (int32_t y = new_bg_range.top; y <= new_bg_range.bottom; ++y) {
			bitgrid_tile_insert(&bg->tiles[y * bg->tiles_per_line + x], item, false);
		}
	}
	for (int32_t x = new_bg_range.right; x > item->bg_range.right; --x) {
		for (int32_t y = new_bg_range.top; y <= new_bg_range.bottom; ++y) {
			bitgrid_tile_insert(&bg->tiles[y * bg->tiles_per_line + x], item, false);
		}
	}
	for (int32_t y = new_bg_range.top; y < item->bg_range.top; ++y) {
		for (int32_t x = new_bg_range.left; x <= new_bg_range.right; ++x) {
			bitgrid_tile_insert(&bg->tiles[y * bg->tiles_per_line + x], item, false);
		}
	}
	for (int32_t y = new_bg_range.bottom; y > item->bg_range.bottom; --y) {
		for (int32_t x = new_bg_range.left; x <= new_bg_range.right; ++x) {
			bitgrid_tile_insert(&bg->tiles[y * bg->tiles_per_line + x], item, false);
		}
	}

	item->bg_range = new_bg_range;

	return 0;
}

NAPI_CALLBACK(bitgrid_remove) {
	napi_value this_arg, js_object;
	size_t argc = 1;
	NAPI_OK(napi_get_cb_info(env, info, &argc, &js_object, &this_arg, 0));

	bool is_bitgrid, is_bitgrid_item;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	NAPI_OK(napi_check_object_type_tag(env, js_object, &bitgrid_item_tag, &is_bitgrid_item));
	assert(is_bitgrid && is_bitgrid_item);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));
	bitgrid_item_t* item;
	NAPI_OK(napi_unwrap(env, js_object, (void**)&item));

	NAPI_OK(napi_delete_reference(env, item->js_object));

	napi_value js_range;
	NAPI_OK(napi_get_named_property(env, js_object, "range", &js_range));

	napi_value js_x, js_y, js_w, js_h;
	NAPI_OK(napi_create_double(env, item->rect.x, &js_x));
	NAPI_OK(napi_create_double(env, item->rect.y, &js_y));
	NAPI_OK(napi_create_double(env, item->rect.w, &js_w));
	NAPI_OK(napi_create_double(env, item->rect.h, &js_h));
	napi_property_descriptor range_props[] = {
		{ "x", 0, 0, 0, 0, js_x, napi_enumerable | napi_configurable, 0 },
		{ "y", 0, 0, 0, 0, js_y, napi_enumerable | napi_configurable, 0 },
		{ "w", 0, 0, 0, 0, js_w, napi_enumerable | napi_configurable, 0 },
		{ "h", 0, 0, 0, 0, js_h, napi_enumerable | napi_configurable, 0 },
	};
	NAPI_OK(napi_define_properties(env, js_range, sizeof(range_props) / sizeof(napi_property_descriptor), range_props));

	for (int32_t x = item->bg_range.left; x <= item->bg_range.right; ++x) {
		for (int32_t y = item->bg_range.top; y <= item->bg_range.bottom; ++y) {
			bitgrid_tile_remove(&bg->tiles[y * bg->tiles_per_line + x], item);
		}
	}

	circalloc_free(&bg->item_ca, item);

	return 0;
}

NAPI_CALLBACK(bitgrid_search) {
	napi_value this_arg;
	size_t argc = 2;
	napi_value argv[2];
	NAPI_OK(napi_get_cb_info(env, info, &argc, argv, &this_arg, 0));

	bool is_bitgrid;
	NAPI_OK(napi_check_object_type_tag(env, this_arg, &bitgrid_tag, &is_bitgrid));
	assert(is_bitgrid);

	bitgrid_t* bg;
	NAPI_OK(napi_unwrap(env, this_arg, (void**)&bg));

	rect_t rect;
	napi_value import;
	NAPI_OK(napi_get_named_property(env, argv[0], "x", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.x));
	NAPI_OK(napi_get_named_property(env, argv[0], "y", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.y));
	NAPI_OK(napi_get_named_property(env, argv[0], "w", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.w));
	NAPI_OK(napi_get_named_property(env, argv[0], "h", &import));
	NAPI_OK(napi_get_value_double(env, import, &rect.h));

	bitgrid_range_t bg_range;
	rect_to_bg_range(bg, &rect, &bg_range);

	napi_value js_undefined;
	NAPI_OK(napi_get_undefined(env, &js_undefined));

	for (int32_t x = bg_range.left; x <= bg_range.right; ++x) {
		for (int32_t y = bg_range.top; y <= bg_range.bottom; ++y) {
			bitgrid_tile_t* tile = &bg->tiles[y * bg->tiles_per_line + x];
			napi_handle_scope scope;
			napi_open_handle_scope(env, &scope);
			for (int32_t i = 0; i < tile->next_item; ++i) {
				if (!tile->items[i]) continue;
				// don't process items twice
				if ((bg_range.left <= tile->items[i]->bg_range.left && tile->items[i]->bg_range.left < x) ||
					(bg_range.top <= tile->items[i]->bg_range.top && tile->items[i]->bg_range.top < y)) continue;
				if (!rect_intersects(rect, tile->items[i]->rect)) continue;

				napi_value js_object, return_val;
				NAPI_OK(napi_get_reference_value(env, tile->items[i]->js_object, &js_object));
				NAPI_OK(napi_call_function(env, js_undefined, argv[1], 1, &js_object, &return_val));
				bool should_return;
				NAPI_OK(napi_coerce_to_bool(env, return_val, &return_val));
				NAPI_OK(napi_get_value_bool(env, return_val, &should_return));
				if (should_return) {
					napi_close_handle_scope(env, scope);
					return js_object;
				}
			}
			napi_close_handle_scope(env, scope);
		}
	}

	return 0;
}
