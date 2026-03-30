# Makefile for Directus with ENV support

BACKEND_SERVICE_NAME=golang
#DATABASE_SERVICE_NAME=postgres

# for localhost usage!
NAMED_COMPOSE_FILE = docker-compose.yml


## -------------------------
## Base Commands
## -------------------------

up: ## Start Container's
	@docker compose -f $(NAMED_COMPOSE_FILE) up -d

down: ## Stop Container's
	@docker compose -f $(NAMED_COMPOSE_FILE) down

build: ## Build Container's
	@docker compose -f $(NAMED_COMPOSE_FILE) build
#	@docker compose -f $(NAMED_COMPOSE_FILE) build --no-cache

logs: ## Show logs
	@docker compose -f $(NAMED_COMPOSE_FILE) logs -f

rebuild: ## Rebuild Container's
	@docker compose -f $(NAMED_COMPOSE_FILE) up --build -d

# docker compose run --rm --no-deps golang-test go test ./internal/healthcheck
# go test -v (for detailed log)
test: ## Run Go tests inside docker
	@docker compose -f $(NAMED_COMPOSE_FILE) run --rm --no-deps golang-test go test ./...

test-build: ## Build the test image (after deps changes)
	@docker compose -f $(NAMED_COMPOSE_FILE) build golang-test

sh:
	@docker compose -f $(NAMED_COMPOSE_FILE) exec -it $(BACKEND_SERVICE_NAME) sh

# TODO: генерировать swagger outside docker (внутрь /docs как спека и коммитить его! в каждом изменений)
# Swagger/OpenAPI-спека должна быть доступна вне контейнера (в репозитории или по URL).
swagger:
	@go install github.com/swaggo/swag/cmd/swag@v1.8.1
	@swag init -g cmd/server/main.go

# docker compose -f docker-compose.infrastructure.yml exec -it postgres psql -d mydb -U myuser
#psql:
#	@docker compose -f $(NAMED_COMPOSE_FILE) exec -it $(DATABASE_SERVICE_NAME) psql -d mydb -U myuser

.PHONY: up down build logs rebuild sh swagger test test-build yc-push-staging yc-push-prod yc-setup yc-list-images verify-build install-hooks
