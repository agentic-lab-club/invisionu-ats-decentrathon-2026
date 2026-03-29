package messaging

import "context"

type Bus interface {
	Publish(ctx context.Context, routingKey string, payload any) error
}
