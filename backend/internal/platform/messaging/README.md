# Platform Messaging Adapter Documentation

## Purpose and Scope

Provides the domain event publishing abstraction used by application submission flows.

## Business Rules

- Business modules depend only on the `Bus` interface.
- When messaging or LLM integration is disabled, backend must use the stub bus.
- RabbitMQ adapter is used only when messaging is enabled and LLM pipeline is enabled.

## Public Interface

- `Publish(ctx, routingKey, payload) error`

## Config and Env Keys Used

- `messaging.enabled`
- `messaging.mode`
- `messaging.url`
- `messaging.exchange`
- `messaging.application_submitted_key`
- `llm.enabled`

## Module Tests

```bash
go test ./internal/platform/messaging/...
```
