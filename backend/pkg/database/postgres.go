package database

import (
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

func InitDB(cfg *config.Config) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Name,
		cfg.Database.SSLMode,
	)

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Postgres: %v", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("unable to ping database: %v", err)
	}

	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	migrationsDir := "./db/migrations"
	if err := InitMigrations(db, migrationsDir, false); err != nil {
		return nil, err
	}

	return db, nil
}

func InitMigrations(db *sqlx.DB, dir string, turnDown bool) error {
	err := goose.SetDialect("postgres")
	if err != nil {
		return err
	}
	if turnDown {
		err := goose.Down(db.DB, dir)
		if err != nil {
			return err
		}
	}
	if err := goose.Up(db.DB, dir); err != nil {
		return err
	}

	return nil
}
