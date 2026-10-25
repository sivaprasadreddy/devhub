package backend

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// ErrProjectExists is returned when a project with the same path is already tracked.
var ErrProjectExists = errors.New("project is already added")

const schema = `
CREATE TABLE IF NOT EXISTS projects (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	name       TEXT    NOT NULL,
	path       TEXT    NOT NULL UNIQUE,
	remote_url TEXT    NOT NULL DEFAULT '',
	grp        TEXT    NOT NULL DEFAULT '',
	added_at   INTEGER NOT NULL
);`

// Store persists projects in a SQLite database.
type Store struct {
	db *sql.DB
}

// OpenStore opens (creating if needed) the SQLite database at path.
func OpenStore(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate database: %w", err)
	}
	return &Store{db: db}, nil
}

// Close closes the database.
func (s *Store) Close() error {
	return s.db.Close()
}

// ListProjects returns all projects ordered by name.
func (s *Store) ListProjects() ([]Project, error) {
	rows, err := s.db.Query(`SELECT id, name, path, remote_url, grp, added_at FROM projects ORDER BY name COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := []Project{}
	for rows.Next() {
		var p Project
		var addedAt int64
		if err := rows.Scan(&p.ID, &p.Name, &p.Path, &p.RemoteURL, &p.Group, &addedAt); err != nil {
			return nil, err
		}
		p.AddedAt = time.Unix(addedAt, 0)
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

// InsertProject stores p and fills in its ID and AddedAt.
func (s *Store) InsertProject(p *Project) error {
	p.AddedAt = time.Now().Truncate(time.Second)
	res, err := s.db.Exec(
		`INSERT INTO projects (name, path, remote_url, grp, added_at) VALUES (?, ?, ?, ?, ?)`,
		p.Name, p.Path, p.RemoteURL, p.Group, p.AddedAt.Unix(),
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrProjectExists
		}
		return err
	}
	p.ID, err = res.LastInsertId()
	return err
}

// DeleteProject removes the project with the given ID.
func (s *Store) DeleteProject(id int64) error {
	_, err := s.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}
