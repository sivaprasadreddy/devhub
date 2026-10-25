package backend

import (
	"fmt"
	"slices"
	"strconv"
)

const settingRefreshInterval = "refresh_interval_seconds"

// DefaultRefreshInterval is used until the user chooses an interval.
const DefaultRefreshInterval = 300

// RefreshIntervals are the supported auto-refresh intervals in seconds;
// 0 means manual refresh only.
var RefreshIntervals = []int{0, 60, 300, 900, 1800}

// SettingsService stores general application settings.
type SettingsService struct {
	store *Store
}

// NewSettingsService creates a service that stores settings in store.
func NewSettingsService(store *Store) *SettingsService {
	return &SettingsService{store: store}
}

// GetRefreshInterval returns the auto-refresh interval in seconds (0 = manual).
func (s *SettingsService) GetRefreshInterval() (int, error) {
	value, err := s.store.GetSetting(settingRefreshInterval)
	if err != nil {
		return 0, err
	}
	seconds, err := strconv.Atoi(value)
	if err != nil || !slices.Contains(RefreshIntervals, seconds) {
		return DefaultRefreshInterval, nil
	}
	return seconds, nil
}

// SetRefreshInterval stores the auto-refresh interval in seconds (0 = manual).
func (s *SettingsService) SetRefreshInterval(seconds int) error {
	if !slices.Contains(RefreshIntervals, seconds) {
		return fmt.Errorf("unsupported refresh interval %d", seconds)
	}
	return s.store.SetSetting(settingRefreshInterval, strconv.Itoa(seconds))
}
