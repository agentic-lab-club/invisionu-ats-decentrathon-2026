package timekit

import (
	"testing"
	"time"
)

func TestFakeClockNowUTC(t *testing.T) {
	fc := FakeClock{T: time.Date(2020, 1, 2, 15, 4, 5, 0, time.UTC)}
	SetDefaultClock(fc)
	got := NowUTC()
	if !got.Equal(fc.T) {
		t.Fatalf("NowUTC() = %v; want %v", got, fc.T)
	}
	// restore default
	SetDefaultClock(UTCClock{})
}

func TestParseTimeOfDayToHHMMSS(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"08:30", "08:30:00", true},
		{"23:59:59", "23:59:59", true},
		{"07:05", "07:05:00", true},
		{"", "", true},
		{"invalid", "", false},
	}

	for _, c := range cases {
		got, err := ParseTimeOfDayToHHMMSS(c.in)
		if c.ok && err != nil {
			t.Fatalf("ParseTimeOfDayToHHMMSS(%q) unexpected error: %v", c.in, err)
		}
		if !c.ok && err == nil {
			t.Fatalf("ParseTimeOfDayToHHMMSS(%q) expected error, got nil", c.in)
		}
		if got != c.want {
			t.Fatalf("ParseTimeOfDayToHHMMSS(%q) = %q; want %q", c.in, got, c.want)
		}
	}
}
