#include <assert.h>
#include <node_api.h>
#include <stdlib.h>

#include "bitgrid.h"
#include "ccore.h"

bool rect_intersects(rect_t a, rect_t b) {
	return a.x - a.w <= b.x + b.w &&
        a.x + a.w >= b.x - b.w &&
        a.y - a.h <= b.y + b.h &&
        a.y + a.h >= b.y - b.h;
}

static napi_value init(napi_env env, napi_value exports) {
	napi_property_descriptor properties[] = {
		{ "BitGrid", 0, bitgrid_constructor, 0, 0, 0, napi_enumerable, 0 },
	};

	NAPI_OK(napi_define_properties(env, exports, sizeof(properties) / sizeof(napi_property_descriptor), properties));
	return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
