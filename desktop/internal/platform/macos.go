//go:build darwin

package platform

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Foundation
#import <Foundation/Foundation.h>
#include <stdlib.h>

static char* sweptTrash(const char* path) {
    @autoreleasepool {
        NSURL *url = [NSURL fileURLWithPath:[NSString stringWithUTF8String:path]];
        NSError *error = nil;
        if ([[NSFileManager defaultManager] trashItemAtURL:url resultingItemURL:nil error:&error]) {
            return NULL;
        }
        return strdup([[error localizedDescription] UTF8String]);
    }
}
*/
import "C"

import (
	"fmt"
	"syscall"
	"unsafe"
)

func Trash(path string) error {
	name := C.CString(path)
	defer C.free(unsafe.Pointer(name))
	message := C.sweptTrash(name)
	if message == nil {
		return nil
	}
	defer C.free(unsafe.Pointer(message))
	return fmt.Errorf("move to Trash: %s", C.GoString(message))
}

func DiskSpace(path string) (total, available int64, err error) {
	var stat syscall.Statfs_t
	if err = syscall.Statfs(path, &stat); err != nil {
		return 0, 0, err
	}
	return int64(stat.Blocks) * int64(stat.Bsize), int64(stat.Bavail) * int64(stat.Bsize), nil
}
