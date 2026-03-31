# Platform Messaging Module Contract

## Purpose

Provide the domain event publishing abstraction used by backend workflows such as application submission.

## Responsibilities

- Define the `Bus` interface consumed by feature modules.
- Provide a stub bus for local/disabled integrations.
- Provide a RabbitMQ-backed publisher in the `rabbitmq` subpackage.

## Out Of Scope

- Message consumption.
- Event schema versioning beyond current payload structs.
- Retry/outbox semantics.
- Queue topology management beyond current exchange declaration.

## Domain Concepts / Entities

### `Bus`

Interface:

```go
Publish(ctx context.Context, routingKey string, payload any) error
```

### `StubBus`

- marshals payload to JSON
- logs routing key and payload
- returns success unless JSON marshal fails

### `rabbitmq.Bus`

- opens AMQP connection and channel
- declares a topic exchange
- publishes JSON payload with content type `application/json`

## Endpoint Overview

- No HTTP endpoints.

## Auth / Roles

- Not applicable.

## Request / Response Conventions

- Callers provide routing key plus arbitrary payload struct.
- Payload is JSON-marshaled before publish.
- Success is represented by `nil` error only.

## Business Flows

Runtime selection happens in `cmd/server/main.go`:

- if `messaging.enabled == false` -> use `StubBus`
- if `llm.enabled == false` -> use `StubBus`
- else if `messaging.mode == rabbitmq` -> use `rabbitmq.New(...)`
- otherwise -> use `StubBus`

RabbitMQ publish flow:
1. Marshal payload to JSON.
2. Publish to configured exchange with supplied routing key.

Stub publish flow:
1. Marshal payload to JSON.
2. Log it.
3. Return success.

## Validation Rules

- This module does not validate routing key values.
- Payload must be JSON-marshalable.
- RabbitMQ URL/exchange correctness is assumed by constructor inputs.

## Lifecycle / State Transitions

- Stub bus is effectively stateless.
- RabbitMQ bus owns a long-lived connection and channel after construction.
- `rabbitmq.Bus` exposes `Close()`, but lifecycle management is outside this package contract.

## Error Handling

- marshal failures surface from both stub and RabbitMQ implementations
- RabbitMQ constructor can fail on:
  - connection
  - channel creation
  - exchange declaration
- RabbitMQ publish can fail on AMQP publish call

## Security Notes

- Stub bus logs payload bytes; do not treat it as private transport.
- RabbitMQ publish sends raw JSON payloads to the configured exchange.

## Frontend Integration Notes

- Frontend does not call this module directly.
- This module affects user-visible behavior indirectly: if downstream async processing is disabled, application submission still succeeds but no real broker publish occurs.

## Known Limitations / TODO

- No outbox / transactional publish support.
- No consumer API in this package.
- No retry/backoff layer.
- No publisher confirms or delivery acknowledgements exposed.

## Related Files / Modules

- `internal/platform/messaging/messaging.go`
- `internal/platform/messaging/stub.go`
- `internal/platform/messaging/rabbitmq/rabbitmq.go`
- `internal/applications`
- `cmd/server/main.go`
