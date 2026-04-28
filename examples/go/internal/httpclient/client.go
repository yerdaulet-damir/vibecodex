// Per-provider isolated HTTP clients — Principle F4 (bulkhead).
package httpclient

import (
	"net/http"
	"sync"
	"time"
)

var (
	mu      sync.Mutex
	clients = map[string]*http.Client{}
)

// Get returns a *http.Client dedicated to a single downstream provider.
// Each provider gets its own connection pool so a hung downstream
// can't exhaust the file descriptors of unrelated services.
func Get(provider string) *http.Client {
	mu.Lock()
	defer mu.Unlock()

	if c, ok := clients[provider]; ok {
		return c
	}

	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxConnsPerHost:     50, // critical — Go default is 2.
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	}
	c := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}
	clients[provider] = c
	return c
}
