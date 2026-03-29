package auth

import (
	"fmt"
	"sync"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
)

type RateLimitResult struct {
	OK         bool
	RetryAfter int
}

type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]bucket
}

type bucket struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{buckets: make(map[string]bucket)}
}

func (r *RateLimiter) Check(keyPrefix string, key string, limit int, window time.Duration) *RateLimitResult {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := timekit.NowUTC()
	bucketKey := fmt.Sprintf("%s:%s", keyPrefix, key)
	current, ok := r.buckets[bucketKey]
	if !ok || now.After(current.resetAt) {
		current = bucket{count: 0, resetAt: now.Add(window)}
	}

	current.count++
	r.buckets[bucketKey] = current
	if current.count > limit {
		retryAfter := int(current.resetAt.Sub(now).Seconds())
		if retryAfter < 1 {
			retryAfter = 1
		}
		return &RateLimitResult{OK: false, RetryAfter: retryAfter}
	}

	return &RateLimitResult{OK: true}
}
