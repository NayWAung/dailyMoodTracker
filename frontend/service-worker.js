/**
 * Daily Mood Tracker - Service Worker
 * Provides offline functionality, caching, and background sync
 * Constitutional Performance: Fast loading and offline access
 */

const CACHE_NAME = 'daily-mood-tracker-v1';
const OFFLINE_CACHE = 'offline-v1';
const API_CACHE = 'api-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// API endpoints to cache (for read operations)
const API_ENDPOINTS = [
    '/api/moods'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // Initialize offline cache
            caches.open(OFFLINE_CACHE).then((cache) => {
                console.log('Service Worker: Initializing offline cache');
                return cache.put('/offline', new Response(JSON.stringify({
                    message: 'You are offline',
                    timestamp: new Date().toISOString()
                }), {
                    headers: { 'Content-Type': 'application/json' }
                }));
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            // Force activation of new service worker
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== OFFLINE_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activation complete');
        })
    );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method === 'GET') {
        if (url.pathname.startsWith('/api/')) {
            // API GET requests - cache with network first strategy
            event.respondWith(handleApiGet(request));
        } else {
            // Static assets - cache first strategy
            event.respondWith(handleStaticAssets(request));
        }
    } else if (request.method === 'POST' && url.pathname.startsWith('/api/')) {
        // API POST requests - background sync
        event.respondWith(handleApiPost(request));
    } else if (request.method === 'DELETE' && url.pathname.startsWith('/api/')) {
        // API DELETE requests
        event.respondWith(handleApiDelete(request));
    }
});

// Background sync for offline POST requests
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered');
    
    if (event.tag === 'mood-entry-sync') {
        event.waitUntil(syncOfflineMoodEntries());
    }
});

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: Static asset fetch failed:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/index.html');
        }
        
        // Return generic offline response
        return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Handle API GET requests with network-first strategy
async function handleApiGet(request) {
    try {
        // Try network first for fresh data
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: API GET failed, trying cache:', error);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline indicator
        return new Response(JSON.stringify({
            error: 'Offline - cached data not available',
            moods: [],
            total: 0,
            isOffline: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle API POST requests with background sync
async function handleApiPost(request) {
    try {
        // Try immediate network request
        const networkResponse = await fetch(request);
        
        // Clear any cached GET requests for this endpoint
        const cache = await caches.open(API_CACHE);
        const keys = await cache.keys();
        keys.forEach(key => {
            if (key.url.includes('/api/moods') && key.method === 'GET') {
                cache.delete(key);
            }
        });
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: API POST failed, storing for sync:', error);
        
        // Store request for background sync
        const requestData = await request.json();
        await storeOfflineRequest(requestData);
        
        // Register background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                await self.registration.sync.register('mood-entry-sync');
            } catch (syncError) {
                console.log('Service Worker: Background sync registration failed:', syncError);
            }
        }
        
        // Return success response (data will be synced later)
        return new Response(JSON.stringify({
            id: `offline_${Date.now()}`,
            ...requestData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            isOffline: true
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle API DELETE requests
async function handleApiDelete(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Clear cached GET requests
        const cache = await caches.open(API_CACHE);
        const keys = await cache.keys();
        keys.forEach(key => {
            if (key.url.includes('/api/moods') && key.method === 'GET') {
                cache.delete(key);
            }
        });
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: API DELETE failed:', error);
        
        return new Response(JSON.stringify({
            error: 'Delete operation failed - please try again when online'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Store offline requests for later sync
async function storeOfflineRequest(data) {
    const offlineRequests = await getOfflineRequests();
    offlineRequests.push({
        data,
        timestamp: Date.now(),
        id: `offline_${Date.now()}`
    });
    
    return await setOfflineRequests(offlineRequests);
}

// Get stored offline requests
async function getOfflineRequests() {
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        const response = await cache.match('/offline-requests');
        
        if (response) {
            const data = await response.json();
            return data.requests || [];
        }
    } catch (error) {
        console.log('Service Worker: Error getting offline requests:', error);
    }
    
    return [];
}

// Store offline requests
async function setOfflineRequests(requests) {
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.put('/offline-requests', new Response(JSON.stringify({
            requests,
            timestamp: Date.now()
        }), {
            headers: { 'Content-Type': 'application/json' }
        }));
    } catch (error) {
        console.log('Service Worker: Error storing offline requests:', error);
    }
}

// Sync offline mood entries when back online
async function syncOfflineMoodEntries() {
    console.log('Service Worker: Syncing offline mood entries...');
    
    const offlineRequests = await getOfflineRequests();
    
    if (offlineRequests.length === 0) {
        console.log('Service Worker: No offline requests to sync');
        return;
    }
    
    const syncResults = [];
    
    for (const request of offlineRequests) {
        try {
            const response = await fetch('/api/moods', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request.data)
            });
            
            if (response.ok) {
                syncResults.push({ success: true, request });
                console.log('Service Worker: Synced offline entry:', request.data);
            } else {
                syncResults.push({ success: false, request, error: 'HTTP error' });
                console.log('Service Worker: Failed to sync entry:', request.data);
            }
            
        } catch (error) {
            syncResults.push({ success: false, request, error: error.message });
            console.log('Service Worker: Sync error for entry:', request.data, error);
        }
    }
    
    // Remove successfully synced requests
    const remainingRequests = offlineRequests.filter((request, index) => 
        !syncResults[index].success
    );
    
    await setOfflineRequests(remainingRequests);
    
    // Notify main thread about sync results
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_COMPLETE',
            synced: syncResults.filter(r => r.success).length,
            failed: syncResults.filter(r => !r.success).length,
            remaining: remainingRequests.length
        });
    });
    
    console.log(`Service Worker: Sync complete. ${syncResults.filter(r => r.success).length} synced, ${remainingRequests.length} remaining`);
}

// Handle push notifications (for future enhancement)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'Don\'t forget to log your mood today!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'mood-reminder',
            renotify: true,
            requireInteraction: false,
            actions: [
                {
                    action: 'log-mood',
                    title: 'Log Mood'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Daily Mood Tracker', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'log-mood') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Periodic background sync (experimental)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'daily-mood-reminder') {
            event.waitUntil(handlePeriodicSync());
        }
    });
}

async function handlePeriodicSync() {
    // Check if user hasn't logged mood today and send reminder
    // This is a placeholder for future notification functionality
    console.log('Service Worker: Periodic sync - mood reminder check');
}

console.log('Service Worker: Script loaded');