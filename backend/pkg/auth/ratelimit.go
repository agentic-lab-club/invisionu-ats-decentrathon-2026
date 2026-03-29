package auth

import (
	"fmt"
	"sync"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/timekit"
)

type RateLimitBucket struct {
	Count   int
	ResetAt time.Time
}

type RateLimiter struct {
	buckets map[string]*RateLimitBucket
	mutex   sync.RWMutex
}

type RateLimitResult struct {
	OK         bool
	RetryAfter int
	ResetAt    time.Time
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*RateLimitBucket),
		mutex:   sync.RWMutex{},
	}
}

func (rl *RateLimiter) CheckAndIncrement(key string, maxCount int, windowSec int) *RateLimitResult {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := timekit.NowUTC()
	bucket, exists := rl.buckets[key]

	if !exists || bucket.ResetAt.Before(now) {
		bucket = &RateLimitBucket{
			Count:   0,
			ResetAt: now.Add(time.Duration(windowSec) * time.Second),
		}
		rl.buckets[key] = bucket
	}

	bucket.Count++

	if bucket.Count > maxCount {
		retryAfter := int(bucket.ResetAt.Sub(now).Seconds())
		if retryAfter < 1 {
			retryAfter = 1
		}
		return &RateLimitResult{
			OK:         false,
			RetryAfter: retryAfter,
			ResetAt:    bucket.ResetAt,
		}
	}

	return &RateLimitResult{
		OK:      true,
		ResetAt: bucket.ResetAt,
	}
}

func (rl *RateLimiter) CleanExpired() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := timekit.NowUTC()
	for key, bucket := range rl.buckets {
		if bucket.ResetAt.Before(now) {
			delete(rl.buckets, key)
		}
	}
}

// Rate limiting constants
const (
	OTPRequestLimit    = 3   // 3 requests per 60 seconds
	OTPRequestWindow   = 60  // seconds
	LoginAttemptLimit  = 5   // 5 attempts per 300 seconds
	LoginAttemptWindow = 300 // seconds
)

func (rl *RateLimiter) CheckOTPRequest(phone string) *RateLimitResult {
	key := fmt.Sprintf("req:%s", phone)
	return rl.CheckAndIncrement(key, OTPRequestLimit, OTPRequestWindow)
}

func (rl *RateLimiter) CheckLoginAttempt(phone string) *RateLimitResult {
	key := fmt.Sprintf("login:%s", phone)
	return rl.CheckAndIncrement(key, LoginAttemptLimit, LoginAttemptWindow)
}
