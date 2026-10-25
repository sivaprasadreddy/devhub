package backend

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const appIconSize = "64"

// appIconCacheDir is where converted app icons are cached.
func appIconCacheDir() string {
	dir, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	return filepath.Join(dir, "devhub", "icons")
}

// appIconDataURL returns the app's icon as a PNG data URL, or "" if it cannot
// be read. Icons are converted with sips once and cached, keyed by the app path
// and its modification time so updates pick up new icons.
func appIconDataURL(appPath, cacheDir string) string {
	icns := appIconFile(appPath)
	if icns == "" || cacheDir == "" {
		return ""
	}
	info, err := os.Stat(icns)
	if err != nil {
		return ""
	}
	sum := sha1.Sum([]byte(fmt.Sprintf("%s|%d|%s", appPath, info.ModTime().UnixNano(), appIconSize)))
	cached := filepath.Join(cacheDir, hex.EncodeToString(sum[:])+".png")

	if _, err := os.Stat(cached); err != nil {
		if err := os.MkdirAll(cacheDir, 0o755); err != nil {
			return ""
		}
		cmd := exec.Command("sips", "-s", "format", "png", "-Z", appIconSize, icns, "--out", cached)
		if err := cmd.Run(); err != nil {
			return ""
		}
	}
	data, err := os.ReadFile(cached)
	if err != nil {
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data)
}

// appIconFile locates the .icns file named by CFBundleIconFile in Info.plist.
func appIconFile(appPath string) string {
	out, err := exec.Command("plutil", "-extract", "CFBundleIconFile", "raw", "-o", "-",
		filepath.Join(appPath, "Contents", "Info.plist")).Output()
	if err != nil {
		return ""
	}
	name := strings.TrimSpace(string(out))
	if name == "" {
		return ""
	}
	if !strings.HasSuffix(name, ".icns") {
		name += ".icns"
	}
	return filepath.Join(appPath, "Contents", "Resources", name)
}
