let lastUpdateTime = 0;
let lastLat = null;
let lastLon = null;
let currentPosition = null;
const MIN_DISTANCE_METERS = 3;
const MIN_SPEED_KMH = 0.25;
const waypointList = [];

let anchorLat = null;
let anchorLon = null;
const ANCHOR_RADIUS = 30; // Meter

function handleError(error) {
    console.error('GPS Fehler:', error);
}

if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(updateSpeed, handleError, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
} else {
    alert('GPS wird nicht unterstützt.');
}

function updateSpeed(position) {
    currentPosition = position;

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < 5000) return;

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const speedMps = position.coords.speed;
    const heading = position.coords.heading;

    let distanceMoved = 0;
    if (lastLat !== null && lastLon !== null) {
        distanceMoved = getDistanceFromLatLonInMeters(lastLat, lastLon, lat, lon);
    }

    const speedKmh = speedMps !== null ? speedMps * 3.6 : 0;

    if (speedKmh < MIN_SPEED_KMH && distanceMoved < MIN_DISTANCE_METERS) return;

    lastUpdateTime = currentTime;
    lastLat = lat;
    lastLon = lon;

    document.getElementById('speedKmh').textContent = speedKmh.toFixed(2);
    document.getElementById('speedKnots').textContent = (speedKmh / 1.852).toFixed(2);

    if (heading !== null && heading >= 0) {
        document.getElementById('heading').textContent = heading.toFixed(0);
    } else {
        document.getElementById('heading').textContent = '–';
    }

    document.getElementById('latitude').textContent = lat.toFixed(6);
    document.getElementById('longitude').textContent = lon.toFixed(6);
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

document.getElementById('copyCoords').addEventListener('click', () => {
    const lat = document.getElementById('latitude').textContent;
    const lon = document.getElementById('longitude').textContent;
    const coords = `https://maps.google.com/?q=${lat},${lon}`;

    navigator.clipboard.writeText(coords).then(() => {
        document.getElementById('copyStatus').textContent = 'Koordinaten kopiert!';
        setTimeout(() => {
            document.getElementById('copyStatus').textContent = '';
        }, 2000);
    }).catch(err => {
        document.getElementById('copyStatus').textContent = 'Fehler beim Kopieren.';
    });
});

document.getElementById('mobButton').addEventListener('click', () => {
    const lat = document.getElementById('latitude').textContent;
    const lon = document.getElementById('longitude').textContent;

    document.getElementById('mobLat').textContent = lat;
    document.getElementById('mobLon').textContent = lon;
});

// Wegpunkte speichern alle 30 Sekunden
setInterval(() => {
    if (!currentPosition) return;

    const lat = currentPosition.coords.latitude.toFixed(6);
    const lon = currentPosition.coords.longitude.toFixed(6);
    const timestamp = new Date().toLocaleTimeString();

    waypointList.push({ lat, lon, time: timestamp });

    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = `https://maps.google.com/?q=${lat},${lon}`;
    link.target = "_blank";
    link.textContent = `${timestamp} → ${lat}, ${lon}`;
    listItem.appendChild(link);

    document.getElementById('waypointList').appendChild(listItem);
}, 30000);

// Anker setzen
document.getElementById('setAnchor').addEventListener('click', () => {
    if (!currentPosition) return;
    anchorLat = currentPosition.coords.latitude;
    anchorLon = currentPosition.coords.longitude;

    document.getElementById('anchorLat').textContent = anchorLat.toFixed(6);
    document.getElementById('anchorLon').textContent = anchorLon.toFixed(6);
    document.getElementById('anchorStatus').textContent = "Status: Anker sitzt";
    document.getElementById('anchorStatus').className = "anchor-safe";
});

// Ankerüberwachung
setInterval(() => {
    if (!anchorLat || !currentPosition) return;

    const lat = currentPosition.coords.latitude;
    const lon = currentPosition.coords.longitude;
    const distance = getDistanceFromLatLonInMeters(anchorLat, anchorLon, lat, lon);

    if (distance > ANCHOR_RADIUS) {
        document.getElementById('anchorStatus').textContent = `⚠️ Ankeralarm! (${distance.toFixed(1)} m entfernt)`;
        document.getElementById('anchorStatus').className = "anchor-alert";
    } else {
        document.getElementById('anchorStatus').textContent = "Status: Anker sitzt";
        document.getElementById('anchorStatus').className = "anchor-safe";
    }
}, 5000);
