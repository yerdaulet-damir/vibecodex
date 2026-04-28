package providers

import "os"

// osLookupEnv is split into its own file so falai.go reads cleanly
// and so we can stub it in tests without monkey-patching os.
func osLookupEnv(key string) string {
	return os.Getenv(key)
}
