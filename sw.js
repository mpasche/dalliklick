'use strict';

importScripts('./version.js');

const CACHE_PREFIX = `dalliklick:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;
const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './styles.css',
    './version.js',
    './icons/icon.svg',
    './js/app.js',
    './js/effects.js',
    './js/engine.js',
    './js/i18n.js',
    './js/notification.js',
    './js/pwa.js',
    './js/session.js',
].map((path) => new URL(path, self.registration.scope).href);
const CACHE_URLS = new Set(FILES_TO_CACHE);

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(FILES_TO_CACHE.map((url) => new Request(url, {cache: 'reload'})));
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    if (request.mode === 'navigate') {
        url.search = '';
    }
    if (!CACHE_URLS.has(url.href)) {
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url.href);
        return cached || fetch(request);
    })());
});
