package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

func Connect(ctx context.Context, url string) (*redis.Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opt)
	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, err
	}
	return client, nil
}

// countScript bumps a counter and gives it its expiry in one atomic step. A
// separate EXPIRE after INCR can be skipped (client gone, Redis blip) and leave
// a counter that never resets: a permanent lockout for that IP or phone, and
// behind a carrier NAT one IP is thousands of buyers. A counter found without
// an expiry gets one here, so one that was already stuck heals on its next hit.
var countScript = redis.NewScript(`local n = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return n`)

// Count adds one to a counter that resets window after its first hit, and
// returns the new count. Rate limits, OTP sends and tries, and trial caps use it.
func Count(ctx context.Context, rdb *redis.Client, key string, window time.Duration) (int64, error) {
	return countScript.Run(ctx, rdb, []string{key}, window.Milliseconds()).Int64()
}
