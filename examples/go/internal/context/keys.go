// Request-scoped context values — Principle F2 / F6.
// Use these helpers instead of raw context.WithValue + magic string keys.
package appctx

import "context"

type ctxKey int

const (
	keyRequestID ctxKey = iota
	keyUserID
	keyProvider
)

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyRequestID, id)
}

func RequestID(ctx context.Context) string {
	v, _ := ctx.Value(keyRequestID).(string)
	return v
}

func WithUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyUserID, id)
}

func UserID(ctx context.Context) string {
	v, _ := ctx.Value(keyUserID).(string)
	return v
}

func WithProvider(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, keyProvider, name)
}

func Provider(ctx context.Context) string {
	v, _ := ctx.Value(keyProvider).(string)
	return v
}
