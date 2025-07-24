const shipIcon = L.icon({
    iconUrl: 'https://images.emojiterra.com/google/noto-emoji/unicode-13.1/share/1f6a2.jpg',
    iconSize: [50, 50], // Größe des Icons
    iconAnchor: [25, 25], // Punkt in der Mitte des Icons
    popupAnchor: [0, -20] // Position des Popups über dem Icon
});

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
let waypointInterval = null;
let trackMarkers = [];

function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
    }).addTo(map);

    userMarker = L.marker([lat, lon], { icon: shipIcon }).addTo(map).bindPopup("⛴️ Du bist hier").openPopup();
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
    const timestamp = new Date().toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

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
                iconUrl: "https://th.bing.com/th/id/R.c0b044d6ad2ace6bfc326c641d301d0c?rik=gazx6aFE71AQcA&pid=ImgRaw&r=0",
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
                iconUrl: "https://image.emojipng.com/438/943438.jpg",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup("⚓️ Anker");

        anchorCircle = L.circle([anchorLat, anchorLon], {
            radius: anchorRadius,
            color: "red",
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


document.getElementById("startTracking").addEventListener("click", () => {
    if (!waypointInterval) {
        waypointInterval = setInterval(() => {
            if (currentLat !== null && currentLon !== null) {
                addWaypoint(currentLat, currentLon);
            }
        }, 30000);
    }
});

document.getElementById("stopTracking").addEventListener("click", () => {
    if (waypointInterval) {
        clearInterval(waypointInterval);
        waypointInterval = null;
    }
});

document.getElementById("generatePDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Wegpunkte", 10, 10);

    const listItems = document.querySelectorAll("#waypointList li");

    if (listItems.length === 0) {
        alert("Es gibt keine Wegpunkte zum Exportieren.");
        return;
    }

    let y = 20;
    listItems.forEach((li, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(`${index + 1}. ${li.innerText}`, 10, y);
        y += 10;
    });

    doc.save("wegpunkte.pdf");
});

document.getElementById("showTrack").addEventListener("click", () => {
    // Erst alte Marker entfernen, falls vorhanden
    trackMarkers.forEach(marker => map.removeLayer(marker));
    trackMarkers = [];

    const listItems = waypointList.querySelectorAll("li");
    const points = [];

    listItems.forEach((item, index) => {
        const link = item.querySelector("a");
        if (link) {
            const [latStr, lonStr] = link.textContent.split(", ");
            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);

            const marker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup(`📍 Punkt ${listItems.length - index}`);

            trackMarkers.push(marker);
            points.push([lat, lon]);
        }
    });

    // Karte zentrieren (optional)
    if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [30, 30] });
    }
});