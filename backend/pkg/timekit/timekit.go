package timekit

import (
	"fmt"
	"strings"
	"time"
)

// Clock provides Now() to get current time (UTC) — allows DI for tests.
type Clock interface {
	Now() time.Time
}

// UTCClock implements Clock using real time in UTC.
type UTCClock struct{}

func (UTCClock) Now() time.Time { return time.Now().UTC() }

// FakeClock can be used in tests.
type FakeClock struct{ T time.Time }

func (f FakeClock) Now() time.Time { return f.T }

var defaultClock Clock = UTCClock{}

// SetDefaultClock allows tests to inject a fake clock.
func SetDefaultClock(c Clock) { defaultClock = c }

// NowUTC returns current time in UTC using default clock.
func NowUTC() time.Time { return defaultClock.Now() }

// NormalizeUTC ensures t is in UTC.
func NormalizeUTC(t time.Time) time.Time { return t.UTC() }

// ParseRFC3339ToUTC parses a RFC3339/RFC3339Nano datetime and returns UTC time.
func ParseRFC3339ToUTC(s string) (time.Time, error) {
	// Try RFC3339Nano then RFC3339
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, &time.ParseError{Layout: time.RFC3339, Value: s, LayoutElem: "", ValueElem: ""}
}

// MustParseRFC3339ToUTC parses and panics on error — use in init/test constants if desired.
func MustParseRFC3339ToUTC(s string) time.Time {
	t, err := ParseRFC3339ToUTC(s)
	if err != nil {
		panic(err)
	}
	return t
}

// OffsetToLocation returns a fixed location for a numeric UTC offset in hours.
// Prefer storing IANA timezone names and using time.LoadLocation when possible.
func OffsetToLocation(offsetHours int) *time.Location {
	name := fmt.Sprintf("UTC%+d", offsetHours)
	return time.FixedZone(name, offsetHours*3600)
}

// ParseTimeOfDayToHHMMSS accepts time strings in "15:04" or "15:04:05" and
// returns a normalized "15:04:05" string. Empty input returns empty string.
func ParseTimeOfDayToHHMMSS(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return s, nil
	}

	// Try HH:MM
	if t, err := time.Parse("15:04", s); err == nil {
		return t.Format("15:04:05"), nil
	}

	// Try HH:MM:SS
	if t, err := time.Parse("15:04:05", s); err == nil {
		return t.Format("15:04:05"), nil
	}

	return "", &time.ParseError{Layout: "15:04[:05]", Value: s, LayoutElem: "", ValueElem: ""}
}

// ParseDateToUTC parses a date in YYYY-MM-DD or RFC3339 formats and returns the time at midnight UTC.
// Returns an error if parsing fails.
func ParseDateToUTC(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, &time.ParseError{Layout: "2006-01-02", Value: s, LayoutElem: "", ValueElem: ""}
	}
	// Try plain date YYYY-MM-DD
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	// Fallback to RFC3339 variants
	if t, err := ParseRFC3339ToUTC(s); err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, &time.ParseError{Layout: "2006-01-02 or RFC3339", Value: s, LayoutElem: "", ValueElem: ""}
}

// ParseTimeOfDayToTime parses time-of-day strings like "15:04" or "15:04:05"
// and returns a time.Time set to that time in UTC on the zero date (0000-01-01).
func ParseTimeOfDayToTime(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, &time.ParseError{Layout: "15:04[:05]", Value: s, LayoutElem: "", ValueElem: ""}
	}
	// Try HH:MM
	if t, err := time.Parse("15:04", s); err == nil {
		return time.Date(0, 1, 1, t.Hour(), t.Minute(), t.Second(), 0, time.UTC), nil
	}
	// Try HH:MM:SS
	if t, err := time.Parse("15:04:05", s); err == nil {
		return time.Date(0, 1, 1, t.Hour(), t.Minute(), t.Second(), 0, time.UTC), nil
	}
	return time.Time{}, &time.ParseError{Layout: "15:04[:05]", Value: s, LayoutElem: "", ValueElem: ""}
}

// ParsePaymentDate parses dates returned by the payment provider in format
// "02.01.2006 15:04:05" and returns UTC time.
func ParsePaymentDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, &time.ParseError{Layout: "02.01.2006 15:04:05", Value: s, LayoutElem: "", ValueElem: ""}
	}
	if t, err := time.Parse("02.01.2006 15:04:05", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, &time.ParseError{Layout: "02.01.2006 15:04:05", Value: s, LayoutElem: "", ValueElem: ""}
}
