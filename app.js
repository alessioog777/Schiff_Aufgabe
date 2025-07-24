let map, userMarker, anchorMarker, mobMarker, anchorCircle;
let waypointList = document.getElementById("waypointList");
let speedKmh = document.getElementById("speedKmh");
let speedKnots = document.getElementById("speedKnots");
let headingDisplay = document.getElementById("heading");
let latDisplay = document.getElementById("latitude");
let lonDisplay = document.getElementById("longitude");
let mobLatDisplay = document.getElementById("mobLat");
let mobLonDisplay = document.getElementById("mobLon");
let anchorLatDisplay = document.getElementById("anchorLat");
let anchorLonDisplay = document.getElementById("anchorLon");
let anchorStatus = document.getElementById("anchorStatus");

let anchorLat = null;
let anchorLon = null;
const anchorRadius = 30; // Meter

function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(map);

    userMarker = L.marker([lat, lon]).addTo(map).bindPopup("Du bist hier").openPopup();
}

function updateUserPosition(lat, lon) {
    if (!map) initMap(lat, lon);

    userMarker.setLatLng([lat, lon]);
    map.setView([lat, lon]);

    latDisplay.textContent = lat.toFixed(6);
    lonDisplay.textContent = lon.toFixed(6);
}

function toKnots(kmh) {
    return kmh * 0.539957;
}

function updateAnchorStatus(lat, lon) {
    if (anchorLat !== null && anchorLon !== null) {
        const distance = map.distance([lat, lon], [anchorLat, anchorLon]);

        if (distance > anchorRadius) {
            anchorStatus.textContent = "Status: Ankeralarm!";
            anchorStatus.style.color = "red";
        } else {
            anchorStatus.textContent = "Status: Anker sitzt";
            anchorStatus.style.color = "green";
        }
    }
}

function addWaypoint(lat, lon) {
    const timestamp = new Date().toLocaleTimeString("de-CH", { hour12: false });
    const li = document.createElement("li");
    li.textContent = `${timestamp} — ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    waypointList.prepend(li);
}

document.getElementById("setAnchor").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        anchorLat = currentLat;
        anchorLon = currentLon;

        anchorLatDisplay.textContent = anchorLat.toFixed(6);
        anchorLonDisplay.textContent = anchorLon.toFixed(6);

        if (anchorMarker) map.removeLayer(anchorMarker);
        if (anchorCircle) map.removeLayer(anchorCircle);

        anchorMarker = L.marker([anchorLat, anchorLon], { icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/54/54736.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
            .addTo(map).bindPopup("Anker");

        anchorCircle = L.circle([anchorLat, anchorLon], {
            radius: anchorRadius,
            color: 'blue',
            fillOpacity: 0.1
        }).addTo(map);
    }
});

document.getElementById("mobButton").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        mobLatDisplay.textContent = currentLat.toFixed(6);
        mobLonDisplay.textContent = currentLon.toFixed(6);

        if (mobMarker) map.removeLayer(mobMarker);

        mobMarker = L.marker([currentLat, currentLon], { icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
            .addTo(map).bindPopup("📍 MOB");
    }
});

let currentLat = null;
let currentLon = null;

navigator.geolocation.watchPosition(
    (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const speed = position.coords.speed ?? 0;
        const heading = position.coords.heading ?? 0;

        currentLat = lat;
        currentLon = lon;

        updateUserPosition(lat, lon);

        speedKmh.textContent = (speed * 3.6).toFixed(1);
        speedKnots.textContent = toKnots(speed * 3.6).toFixed(1);
        headingDisplay.textContent = heading.toFixed(0);

        updateAnchorStatus(lat, lon);
    },
    (error) => {
        alert("GPS konnte nicht aktiviert werden: " + error.message);
    },
    { enableHighAccuracy: true }
);

// Wegpunkte alle 30 Sekunden speichern
setInterval(() => {
    if (currentLat !== null && currentLon !== null) {
        addWaypoint(currentLat, currentLon);
    }
}, 30000);