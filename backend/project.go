package backend

import "time"

// Project is a local Git repository tracked by DevHub.
type Project struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	RemoteURL string    `json:"remoteUrl"`
	Group     string    `json:"group"`
	AddedAt   time.Time `json:"addedAt"`
}
