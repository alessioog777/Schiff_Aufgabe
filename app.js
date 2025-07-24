let map, userMarker, anchorMarker, mobMarker, anchorCircle;
const waypointList = document.getElementById("waypointList");
const speedKmh = document.getElementById("speedKmh");
const speedKnots = document.getElementById("speedKnots");
const headingDisplay = document.getElementById("heading");
const latDisplay = document.getElementById("latitude");
const lonDisplay = document.getElementById("longitude");
const mobLatDisplay = document.getElementById("mobLat");
const mobLonDisplay = document.getElementById("mobLon");
const anchorLatDisplay = document.getElementById("anchorLat");
const anchorLonDisplay = document.getElementById("anchorLon");
const anchorStatus = document.getElementById("anchorStatus");

let anchorLat = null;
let anchorLon = null;
const anchorRadius = 30;

let currentLat = null;
let currentLon = null;

function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
    }).addTo(map);

    userMarker = L.marker([lat, lon]).addTo(map).bindPopup("Du").openPopup();
}

function updateUserPosition(lat, lon) {
    if (!map) initMap(lat, lon);
    userMarker.setLatLng([lat, lon]);
    map.setView([lat, lon]);

    updateLink(latDisplay, lat, lon);
    updateLink(lonDisplay, lat, lon);
}

function toKnots(kmh) {
    return kmh * 0.539957;
}

function updateAnchorStatus(lat, lon) {
    if (anchorLat !== null && anchorLon !== null) {
        const distance = map.distance([lat, lon], [anchorLat, anchorLon]);
        if (distance > anchorRadius) {
            anchorStatus.textContent = "Status: Ankeralarm!";
            anchorStatus.classList.remove("anchor-safe");
            anchorStatus.classList.add("anchor-alert");
        } else {
            anchorStatus.textContent = "Status: Anker sitzt";
            anchorStatus.classList.remove("anchor-alert");
            anchorStatus.classList.add("anchor-safe");
        }
    }
}

function addWaypoint(lat, lon) {
    const timestamp = new Date().toLocaleTimeString("de-CH", { hour12: false });
    const li = document.createElement("li");
    li.innerHTML = `${timestamp} — <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>`;
    waypointList.prepend(li);
}

function updateLink(element, lat, lon) {
    element.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    element.href = `https://www.google.com/maps?q=${lat},${lon}`;
}

// MOB setzen
document.getElementById("mobButton").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        updateLink(mobLatDisplay, currentLat, currentLon);
        updateLink(mobLonDisplay, currentLat, currentLon);

        if (mobMarker) map.removeLayer(mobMarker);

        mobMarker = L.marker([currentLat, currentLon], {
            icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup("❌ MOB");
    }
});

// Anker setzen
document.getElementById("setAnchor").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        anchorLat = currentLat;
        anchorLon = currentLon;

        updateLink(anchorLatDisplay, anchorLat, anchorLon);
        updateLink(anchorLonDisplay, anchorLat, anchorLon);

        if (anchorMarker) map.removeLayer(anchorMarker);
        if (anchorCircle) map.removeLayer(anchorCircle);

        anchorMarker = L.marker([anchorLat, anchorLon], {
            icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/54/54736.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup("⚓️ Anker");

        anchorCircle = L.circle([anchorLat, anchorLon], {
            radius: anchorRadius,
            color: "blue",
            fillOpacity: 0.1,
        }).addTo(map);
    }
});

// Position überwachen
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
        alert("GPS-Fehler: " + error.message);
    },
    { enableHighAccuracy: true }
);

// Wegpunkte speichern alle 30 Sekunden
setInterval(() => {
    if (currentLat !== null && currentLon !== null) {
        addWaypoint(currentLat, currentLon);
    }
}, 30000);
