#include <assert.h>
#include <stdlib.h>

#include "circalloc.h"

circalloc_t circalloc(size_t capacity_exponent, size_t item_size) {
	size_t capacity = 1 << capacity_exponent;
	void* data = malloc(item_size * capacity);
	void** pointers = malloc(sizeof(void*) * capacity);

	for (size_t i = 0; i < capacity; ++i) {
		pointers[i] = data + i * item_size;
	}

	circalloc_t ca = { pointers, data, item_size, capacity - 1, 0, capacity - 1 };
	return ca;
}

void circalloc_destroy(circalloc_t* ca) {
	free(ca->data);
	free(ca->pointers);
}

void* circalloc_alloc(circalloc_t* ca) {
	assert(ca->pointers_front != ca->pointers_back);

	void* item = ca->pointers[ca->pointers_front++];
	ca->pointers_front &= ca->capacity_mask;
	return item;
}

void circalloc_free(circalloc_t* ca, void* item) {
	++ca->pointers_back;
	ca->pointers_back &= ca->capacity_mask;

	assert(ca->pointers_front != ca->pointers_back);

	ca->pointers[ca->pointers_back] = item;
}
