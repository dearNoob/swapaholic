// Service Worker for offline caching and PWA support
const CACHE_NAME = 'swapaholic-v1';
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
    '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseClone = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // If no cache, show offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline');
                    }

                    return new Response('Network error', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-bids') {
        event.waitUntil(syncBids());
    }
});

async function syncBids() {
    // Sync any pending bids when back online
    const pendingBids = await getFromIndexedDB('pending-bids');

    for (const bid of pendingBids) {
        try {
            await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bid)
            });
            await removeFromIndexedDB('pending-bids', bid.id);
        } catch (error) {
            console.error('Failed to sync bid:', error);
        }
    }
}

// Helper functions for IndexedDB
async function getFromIndexedDB(storeName) {
    // Implementation would go here
    return [];
}

async function removeFromIndexedDB(storeName, id) {
    // Implementation would go here
}
