#pragma once
#include <node_api.h>

#include "circalloc.h"
#include "ccore.h"

typedef struct bitgrid_range_t {
	int32_t left;
	int32_t right;
	int32_t top;
	int32_t bottom;
} bitgrid_range_t;

typedef struct bitgrid_item_t {
	napi_ref js_object;
	rect_t rect;
	bitgrid_range_t bg_range;
} bitgrid_item_t;

typedef struct bitgrid_tile_t {
	bitgrid_item_t** items;
	int32_t max_items;
	int32_t next_item;
} bitgrid_tile_t;

typedef struct bitgrid_t {
	circalloc_t item_ca;
	bitgrid_tile_t* tiles;
	rect_t rect;
	int32_t tiles_per_line;
} bitgrid_t;

NAPI_CALLBACK(bitgrid_constructor);
NAPI_CALLBACK(bitgrid_destroy);
NAPI_CALLBACK(bitgrid_clean);
NAPI_CALLBACK(bitgrid_insert);
NAPI_CALLBACK(bitgrid_update);
NAPI_CALLBACK(bitgrid_remove);
NAPI_CALLBACK(bitgrid_search);
NAPI_CALLBACK(bitgrid_contains_any);
