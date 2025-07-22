self.addEventListener('install', function(event) {
    console.log('Service Worker installiert');
});

self.addEventListener('fetch', function(event) {
    // Standardmäßiges Verhalten – du kannst später hier Cache-Funktionalität einbauen
});
