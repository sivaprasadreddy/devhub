package backend

import (
	"path/filepath"
	"testing"
)

func TestRefreshInterval(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	s := NewSettingsService(store)

	if got, _ := s.GetRefreshInterval(); got != DefaultRefreshInterval {
		t.Fatalf("default = %d, want %d", got, DefaultRefreshInterval)
	}
	if err := s.SetRefreshInterval(0); err != nil {
		t.Fatal(err)
	}
	if got, _ := s.GetRefreshInterval(); got != 0 {
		t.Fatalf("got %d, want 0", got)
	}
	if err := s.SetRefreshInterval(42); err == nil {
		t.Fatal("expected error for unsupported interval")
	}
}
