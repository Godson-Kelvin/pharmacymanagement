/**
 * Wraps a Firebase promise with a timeout to prevent long hangs
 * when Firebase is not available (demo mode).
 */
export function withTimeout(promise, ms = 3000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firebase request timed out")), ms)
        ),
    ]);
}