package database

import (
	"database/sql"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/jmoiron/sqlx"
)

// TrackedDB обёртка над sqlx.DB для автоматического измерения времени запросов
type TrackedDB struct {
	*sqlx.DB
}

func NewTrackedDB(db *sqlx.DB) *TrackedDB {
	return &TrackedDB{DB: db}
}

func (db *TrackedDB) TrackedGet(dest interface{}, query string, args ...interface{}) error {
	start := timekit.NowUTC()
	err := db.DB.Get(dest, query, args...)
	record("select", query, start, err)
	return err
}

func (db *TrackedDB) TrackedSelect(dest interface{}, query string, args ...interface{}) error {
	start := timekit.NowUTC()
	err := db.DB.Select(dest, query, args...)
	record("select", query, start, err)
	return err
}

func (db *TrackedDB) TrackedExec(operation, query string, args ...interface{}) (sql.Result, error) {
	start := timekit.NowUTC()
	result, err := db.DB.Exec(query, args...)
	record(operation, query, start, err)
	return result, err
}

func (db *TrackedDB) TrackedInsert(query string, args ...interface{}) (sql.Result, error) {
	return db.TrackedExec("insert", query, args...)
}

func (db *TrackedDB) TrackedUpdate(query string, args ...interface{}) (sql.Result, error) {
	return db.TrackedExec("update", query, args...)
}

func (db *TrackedDB) TrackedDelete(query string, args ...interface{}) (sql.Result, error) {
	return db.TrackedExec("delete", query, args...)
}
