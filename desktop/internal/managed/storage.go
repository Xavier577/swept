package managed

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

type StorageFile struct {
	Provider     string `json:"provider"`
	Kind         string `json:"kind"`
	Path         string `json:"path"`
	Bytes        int64  `json:"bytes"`
	LogicalBytes int64  `json:"logicalBytes"`
}

type StorageReport struct {
	Files    []StorageFile `json:"files"`
	Warnings []string      `json:"warnings"`
}

// ReadStorage only stats known host files. It never mounts an image, starts an
// engine, or offers the image as a cleanup target. Allocated blocks, rather than
// the sparse file's logical capacity, represent its current host footprint.
func ReadStorage(home string) StorageReport {
	report := StorageReport{Files: []StorageFile{}, Warnings: []string{}}
	locations := []struct{ provider, kind, relative string }{
		{"Docker Desktop", "Data disk", "Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"},
		{"Docker Desktop", "Data disk", "Library/Containers/com.docker.docker/Data/vms/0/data/Docker.qcow2"},
		{"OrbStack", "Data disk · containers and Linux machines", "Library/Group Containers/HUAQ24HBR6.dev.orbstack/data/data.img.raw"},
		{"OrbStack", "Data disk · containers and Linux machines", "Library/Group Containers/HUAQ24HBR6.dev.orbstack/data/data.img"},
		{"OrbStack", "Virtual machine swap", "Library/Group Containers/HUAQ24HBR6.dev.orbstack/data/swap.img"},
	}
	seen := make(map[[2]uint64]bool)
	for _, location := range locations {
		path := filepath.Join(home, location.relative)
		info, err := os.Stat(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			report.Warnings = append(report.Warnings, fmt.Sprintf("%s: %v", path, err))
			continue
		}
		if !info.Mode().IsRegular() {
			report.Warnings = append(report.Warnings, path+": expected a disk-image file")
			continue
		}
		stat := info.Sys().(*syscall.Stat_t)
		key := [2]uint64{uint64(stat.Dev), stat.Ino}
		if seen[key] {
			continue
		}
		seen[key] = true
		report.Files = append(report.Files, StorageFile{
			Provider: location.provider, Kind: location.kind, Path: path,
			Bytes: stat.Blocks * 512, LogicalBytes: info.Size(),
		})
	}
	return report
}
