#pragma once
#include <stdlib.h>

typedef struct circalloc_t {
	void** pointers;
	void* data;
	size_t item_size;
	size_t capacity_mask;
	size_t pointers_front; // index of the next element to be allocated
	size_t pointers_back; // index of the last element to be allocated
} circalloc_t;

circalloc_t circalloc(size_t capacity_exponent, size_t item_size);
void circalloc_destroy(circalloc_t* ca);
void* circalloc_alloc(circalloc_t* ca);
void circalloc_free(circalloc_t* ca, void* item);
