package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

func main() {
	flags := flag.NewFlagSet("migrate", flag.ExitOnError)
	dir := flags.String("dir", "./db/migrations", "directory with migration files")
	flags.Parse(os.Args[1:])
	args := flags.Args()

	if len(args) < 1 {
		fmt.Println("Usage: migrate <command> [args]")
		fmt.Println("Commands: up, down, redo, status, version")
		return
	}

	command := args[0]

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.Name, cfg.Database.SSLMode)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatal(err)
	}

	// arguments for goose command (e.g. up, down)
	if err := goose.Run(command, db, *dir, args[1:]...); err != nil {
		log.Fatalf("migrate %v: %v", command, err)
	}
}
