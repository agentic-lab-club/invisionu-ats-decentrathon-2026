package main

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/seeder"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	db, err := database.InitDB(cfg)
	if err != nil {
		panic(err)
	}

	if err := seeder.SeedDefaults(db); err != nil {
		panic(err)
	}

	fmt.Println("seed completed")
}
