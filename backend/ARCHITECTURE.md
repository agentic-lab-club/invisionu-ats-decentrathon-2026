# Backend Development Rules

## Architecture

### Modular Monolith
- Each feature is a separate module in `internal/`
- Modules MUST NOT import or depend on each other
- Each module has its own: `handler.go`, `service.go`, `repository.go`, `domain.go`, `module.go`, `queries.go`
- Optional: `helper.go` for utility functions within the module
- Clean 3-layer architecture: `handler → service → repository`
- NO shortcuts for simple CRUD - always follow the full pattern

### Module Structure
```
internal/
  module_name/
    queries/           # SQL files only
      query_name.sql
    domain.go          # Types, constants, DTOs
    handler.go         # HTTP handlers
    service.go         # Business logic
    repository.go      # Database operations
    module.go          # Route registration
    queries.go         # Embedded SQL variables
    helper.go          # (Optional) Utility functions
```

## Naming Conventions

### Files
- Use singular form: `domain.go` (NOT `domains.go`)
- SQL files: `snake_case.sql` (e.g., `get_booking_by_id.sql`)
- All module files in singular

### Variables
- SQL query variables: `GetBookingById` (NOT `GetBookingByIdSQL`)
- No SQL suffix needed

### Imports
- Middleware import alias: `md` (e.g., `import md "pkg/http/middlewares"`)
- Responder import: `respond` (e.g., `import respond "pkg/http/responder"`)

## SQL Queries

### CRITICAL RULES
- ALL SQL queries MUST be in separate `.sql` files in `queries/` folder
- ALWAYS use `?` placeholders (NEVER `$1`, `$2`, etc.)
- ALWAYS wrap queries with `r.db.Rebind()` in repository
- `SELECT *` is FORBIDDEN - always explicitly list columns

### Example
```sql
-- queries/get_booking_by_id.sql
SELECT id, session_id, status, user_created
FROM "Bookings"
WHERE id = ? AND user_created = ?
```

```go
// queries.go
//go:embed queries/get_booking_by_id.sql
var GetBookingById string

// repository.go
func (r *Repository) GetBookingById(id, userId uuid.UUID) (*Booking, error) {
    var booking Booking
    err := r.db.Get(&booking, r.db.Rebind(GetBookingById), id, userId)
    return &booking, err
}
```

## Domain Models

- Duplicate types between modules - DO NOT create shared types
- Use pointers for nullable database fields
- Use `db` and `json` tags on all struct fields

```go
type Booking struct {
    ID          uuid.UUID  `json:"id" db:"id"`
    Status      string     `json:"status" db:"status"`
    UserCreated *uuid.UUID `json:"user_created,omitempty" db:"user_created"`
}
```

## Handlers

### Rules
- ALWAYS use middleware: `md.AuthRole`, `md.ValidateParam`, `md.BindAndValidate`
- NEVER handle auth/validation manually if middleware exists
- ALL responses through `respond` shortcuts

### Middleware Usage
```go
// module.go
g.Post("/sessions/:sessionId/book",
    md.AuthRole(cfg, db, md.RoleUser, md.RoleAdmin),
    md.ValidateParam[uuid.UUID]("sessionId"),
    h.BookToSession)

g.Patch("/bookings/:id",
    md.AuthRole(cfg, db, md.RoleUser),
    md.ValidateParam[uuid.UUID]("id"),
    md.BindAndValidate[UpdateBookingDTO](),
    h.UpdateBooking)
```

### Responder Shortcuts
```go
// Success with data
return respond.OK(ctx, data, err)
return respond.Created(ctx, data, err)

// Success without data
return respond.EmptyOK(ctx, err)
return respond.NoContent(ctx, err)

// Errors
return respond.ErrorStatus(ctx, err, fiber.StatusBadRequest)
return respond.WithStatus(ctx, data, err, fiber.StatusNotFound)
```

## API Versioning

- All API routes: `/api/v1/...`
- Exception: health checks at root level (`/health`, `/database-health`)

## Error Handling

- Standard format: `fmt.Errorf("failed to <action>: %w", err)`
- Always wrap errors with context
- Let responder handle HTTP status codes

```go
if err != nil {
    return fmt.Errorf("failed to create booking: %w", err)
}
```

## Responsibility Separation

### Handler
- Extract params from context (set by middleware)
- Call service methods
- Return response via responder
- NO business logic

### Service
- ALL business logic here
- Orchestrate repository calls
- Validate business rules
- Transform data for response

### Repository
- ONLY database operations
- NO business logic
- Return raw data or errors

## Code Quality Issues to Fix

### Current Problems
- Business logic scattered between handlers and repositories
- Huge service and repository files
- `SELECT *` still used in queries
- Unused functions in modules

### When Refactoring
- Move business logic from handlers to services
- Move business logic from repositories to services
- Split large files by feature/domain
- Remove unused code
- Eliminate helpers

## Module Registration

```go
// module.go
func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config) {
    RegisterRoutes(server, db, cfg)
}

func RegisterRoutes(server *fiber.App, db *database.TrackedDB, cfg *config.Config) {
    g := server.Group("/api/v1")
    s := NewService(db)
    h := NewHandler(s)
    
    // Register routes with middleware
}
```
