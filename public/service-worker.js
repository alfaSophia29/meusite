// Service Worker fallback for FacePhone
// This script forwards all lifecycle events directly to the compiled /sw.js which handles dynamic precaching.
importScripts('/sw.js');
