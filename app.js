const shipIcon = L.icon({
    iconUrl: 'icons8-boat-48.png',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -20]
});

let map, userMarker, anchorMarker, mobMarker, anchorCircle;
const waypointList = document.getElementById("waypointList");
const speedKmh = document.getElementById("speedKmh");
const speedKnots = document.getElementById("speedKnots");
const headingDisplay = document.getElementById("heading");
const coordLink = document.getElementById("coordLink");
const mobCoords = document.getElementById("mobCoords");
const anchorCoords = document.getElementById("anchorCoords");
const anchorStatus = document.getElementById("anchorStatus");
const trackCoordinates = [];
let anchorLat = null;
let anchorLon = null;
const anchorRadius = 30;
let currentLat = null;
let currentLon = null;
let waypointInterval = null;
let trackMarkers = [];
let shipMarker = null;

function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    crossOrigin: true
}).addTo(map);


    userMarker = L.marker([lat, lon], { icon: shipIcon }).addTo(map).bindPopup("⛵ Du bist hier").openPopup();
}

function updateUserPosition(lat, lon) {
    if (!map) initMap(lat, lon);
    userMarker.setLatLng([lat, lon]);
    map.setView([lat, lon]);

    updateLink(coordLink, lat, lon);
}

function toKnots(kmh) {
    return kmh * 0.539957;
}

function updateAnchorStatus(lat, lon) {
    if (anchorLat === null || anchorLon === null) {
        anchorStatus.textContent = "Status: Anker nicht gesetzt";
        anchorStatus.classList.remove("anchor-safe", "anchor-alert");
        return;
    }

    const distance = map.distance([lat, lon], [anchorLat, anchorLon]);
    if (distance > anchorRadius) {
        anchorStatus.textContent = "Status: Ankeralarm!";
        anchorStatus.classList.remove("anchor-safe");
        anchorStatus.classList.add("anchor-alert");

        // Alarm abspielen
        const alarm = document.getElementById("alarmSound");
        if (alarm) {
            alarm.currentTime = 0; // von vorne starten
            alarm.play().catch(err => console.log("Audio-Fehler:", err));
        }

        // Vibration starten (falls unterstützt)
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 1000]);
        }

    } else {
        anchorStatus.textContent = "Status: Anker sitzt";
        anchorStatus.classList.remove("anchor-alert");
        anchorStatus.classList.add("anchor-safe");
    }
}

function addWaypoint(lat, lon, type) {
    const timestamp = new Date().toLocaleString("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const waypointNumber = waypointList.children.length + 1;
    let emoji = '';
    if (type === 'mob') emoji = ' 🛟';
    else if (type === 'anchor') emoji = ' ⚓️';

    const currentLatLng = L.latLng(lat, lon);

    let distanceText = "";
    if (trackMarkers.length >= 1) {
        const prevLatLng = trackMarkers[trackMarkers.length - 1].getLatLng();
        const dist = calculateDistance(prevLatLng.lat, prevLatLng.lng, lat, lon);
        distanceText = ` <span style="float:right; color:gray;">${dist.toFixed(1)} m</span>`;
    }

    const li = document.createElement("li");
    li.innerHTML = `${waypointNumber}; ${timestamp.replace(",", ";")} — <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>${emoji}${distanceText}`;
    waypointList.prepend(li);

    if (trackMarkers.length > 0) {
        const lastMarker = trackMarkers[trackMarkers.length - 1];
        lastMarker.setStyle({ color: "blue", fillColor: "blue" });
    }

    let color = "blue";
    if (trackMarkers.length === 0) {
        color = "green";
    }

    const marker = L.circleMarker(currentLatLng, {
        radius: 6,
        color: color,
        fillColor: color,
        fillOpacity: 1,
    }).addTo(map);

    marker.bindPopup(`Wegpunkt ${waypointNumber}:<br>📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    trackMarkers.push(marker);

    trackCoordinates.push({ lat, lon });
    if (!shipMarker) {
    // Erstes Mal → Schiff setzen
    shipMarker = L.marker([lat, lon], { icon: shipIcon }).addTo(map);
} else {
    // Schon vorhanden → Schiff zum neuen Punkt fahren lassen
    const oldLatLng = shipMarker.getLatLng();
    animateShip(oldLatLng.lat, oldLatLng.lng, lat, lon);
}


let totalDistance = 0;
for (let i = 1; i < trackCoordinates.length; i++) {
    const prev = trackCoordinates[i - 1];
    const curr = trackCoordinates[i];
    totalDistance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
}
const totalNm = totalDistance * 0.539957;
document.getElementById("totalDistance").innerText =
    `Gesamtweg: ${totalDistance.toFixed(2)} km / ${totalNm.toFixed(2)} nm`;
}


function toRad(value) {
    return value * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function checkAnchorAlarm(currentLat, currentLon) {
    if (anchorLat !== null && anchorLon !== null) {
        const dist = calculateDistance(currentLat, currentLon, anchorLat, anchorLon) * 1000; // in Meter

        if (dist > anchorRadius) {
            // Alarm auslösen
            alert("⚠️ Alarm: Das Schiff hat den Ankerbereich verlassen!");

            // Ton abspielen
            const alarm = document.getElementById("alarmSound");
            if (alarm) {
                alarm.currentTime = 0; // von vorne starten
                alarm.play().catch(err => console.log("Audio-Fehler:", err));
            }

            // Vibration starten (falls unterstützt)
            if (navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 1000]);
            }
        }
    }
}


function updateLink(element, lat, lon) {
    const formatted = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    element.textContent = `${formatted}`;
    element.href = `https://www.google.com/maps?q=${lat},${lon}`;
}

document.getElementById("mobButton").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        updateLink(mobCoords, currentLat, currentLon);

        if (mobMarker) map.removeLayer(mobMarker);

        mobMarker = L.marker([currentLat, currentLon], {
            icon: L.icon({
                iconUrl: "rubber-ring.png",
                iconSize: [30, 30],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup(`<strong>🛟 MOB:</strong><br>📍 ${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`);

        addWaypoint(currentLat, currentLon, 'mob'); // Hier MOB-Wegpunkt hinzufügen
    }
});


document.getElementById("setAnchor").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        anchorLat = currentLat;
        anchorLon = currentLon;

        updateLink(anchorCoords, anchorLat, anchorLon);

        if (anchorMarker) map.removeLayer(anchorMarker);
        if (anchorCircle) map.removeLayer(anchorCircle);

        anchorMarker = L.marker([anchorLat, anchorLon], {
            icon: L.icon({
                iconUrl: "icons8-anchor-48.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup(`<strong>⚓️ Anker:</strong><br>📍 ${anchorLat.toFixed(6)}, ${anchorLon.toFixed(6)}`);

        anchorCircle = L.circle([anchorLat, anchorLon], {
            radius: anchorRadius,
            color: "red",
            fillOpacity: 0.1,
        }).addTo(map);

        updateAnchorStatus(currentLat, currentLon);

        addWaypoint(anchorLat, anchorLon, 'anchor');
    }
});


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
        const intervalValue = parseInt(document.getElementById("intervalSelect").value, 10);

        if (currentLat !== null && currentLon !== null) {
            addWaypoint(currentLat, currentLon);
        }

        waypointInterval = setInterval(() => {
            if (currentLat !== null && currentLon !== null) {
                addWaypoint(currentLat, currentLon);
            }
        }, intervalValue);

        document.getElementById("startTracking").classList.add("active-start");
        document.getElementById("stopTracking").classList.remove("active-stop");
        document.getElementById("startTracking").classList.remove("neutral");
        document.getElementById("stopTracking").classList.add("neutral");
    }
});



document.getElementById("stopTracking").addEventListener("click", () => {
    if (waypointInterval) {
        clearInterval(waypointInterval);
        waypointInterval = null;

        document.getElementById("stopTracking").classList.add("active-stop");
        document.getElementById("startTracking").classList.remove("active-start");
        document.getElementById("startTracking").classList.add("neutral");
        document.getElementById("stopTracking").classList.remove("neutral");
    }
});



document.getElementById("showTrack").addEventListener("click", () => {
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

            const markerIcon = L.icon({
                iconUrl: "icons8-pin-48.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            });

            const marker = L.marker([lat, lon], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`📍 Punkt ${listItems.length - index}:<br> ${lat.toFixed(6)}, ${lon.toFixed(6)}`);

            trackMarkers.push(marker);
            points.push([lat, lon]);
        }
    });

    if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds);
    }
});

function animateShip(oldLat, oldLon, newLat, newLon, steps = 20) {
    let i = 0;
    const latStep = (newLat - oldLat) / steps;
    const lonStep = (newLon - oldLon) / steps;

    const interval = setInterval(() => {
        i++;
        shipMarker.setLatLng([oldLat + latStep * i, oldLon + lonStep * i]);
        if (i >= steps) clearInterval(interval);
    }, 50);
}

function exportMapToPDF() {
    leafletImage(map, function(err, canvas) {
        if (err) {
            console.error(err);
            return;
        }

        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;

        // Querformat, A4
        const pdf = new jsPDF("landscape", "mm", "a4");

        // PDF-Größe bestimmen
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Bild so skalieren, dass es auf die Seite passt
        const imgWidth = pageWidth;
        const imgHeight = canvas.height * pageWidth / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save("karte.pdf");
    });
}
document.getElementById("generatePDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");

    // PDF-Titel
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 128); // dunkelblau
    doc.text(
        "Geschwindigkeits- und Wegpunktebericht",
        doc.internal.pageSize.getWidth() / 2,
        10,
        { align: "center" }
    );

    // Icons vorbereiten (lokale PNG-Dateien)
    const icons = {
        waypoint: "icons8-pin-48.png",
        mob: "rubber-ring.png",
        anchor: "icons8-anchor-48.png"
    };

    let previousCoords = null; // für Kursberechnung

    leafletImage(map, function (err, canvas) {
        if (err) {
            console.error(err);
            alert("Fehler beim Erfassen der Karte!");
            return;
        }

        const imgData = canvas.toDataURL("image/png");
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgWidth = pageWidth;
        const imgHeight = canvas.height * pageWidth / canvas.width;

        // Karte einfügen
        doc.addImage(imgData, "PNG", 0, 15, imgWidth, imgHeight);

        // Tabelle vorbereiten
        const startY = imgHeight + 25;
        const rows = [];

        document.querySelectorAll("#waypointList li").forEach((li) => {
            const text = li.textContent;
            const numberEnd = text.indexOf(";");
            const number = text.slice(0, numberEnd).trim();
            const rest = text.slice(numberEnd + 1).trim();
            const [dateTime, coordAndType] = rest.split("—").map((s) => s.trim());

            // Koordinaten aus dem Link herausziehen
            const link = li.querySelector("a");
            let lat = null, lon = null;
            if (link) {
                const coords = link.textContent.split(",").map((s) => s.trim());
                if (coords.length === 2) {
                    lat = parseFloat(coords[0]);
                    lon = parseFloat(coords[1]);
                }
            }

            let type = "waypoint";
            if (text.includes("🛟")) type = "mob";
            else if (text.includes("⚓️")) type = "anchor";

            // Kurs berechnen
            let bearing = "–";
            if (previousCoords && lat !== null && lon !== null) {
                bearing = calculateBearing(
                    previousCoords.lat,
                    previousCoords.lon,
                    lat,
                    lon
                ).toFixed(0);
            }
            if (lat !== null && lon !== null) {
                previousCoords = { lat, lon };
            }

            // Zeile in Tabelle einfügen
            rows.push([
                number,
                dateTime,
                lat !== null && lon !== null
                    ? `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`
                    : "–",
                type,
                bearing
            ]);
        });

        doc.autoTable({
            startY: startY,
            head: [["Wegpunkt", "Datum/Uhrzeit", "Koordinaten", "Typ", "Kurs (°)"]],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [0, 123, 255], textColor: 255 },
            styles: { fontSize: 10 },
            didDrawCell: (data) => {
                if (data.column.index === 3) {
                    const key = data.cell.raw;
                    const img = icons[key];
                    if (img) {
                        doc.setFillColor(255, 255, 255);
                        doc.rect(
                            data.cell.x,
                            data.cell.y,
                            data.cell.width,
                            data.cell.height,
                            "F"
                        );
                        doc.addImage(
                            img,
                            "PNG",
                            data.cell.x + 2,
                            data.cell.y + 2,
                            6,
                            6
                        );
                    }
                }
            }
        });

        // Gesamtweg unten anfügen
        const totalDistance = document.getElementById("totalDistance").textContent;
        doc.setFontSize(12);
        doc.text(totalDistance, 14, doc.lastAutoTable.finalY + 10);

        doc.save("wegpunkte_mit_karte.pdf");
    });
});

function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    let θ = Math.atan2(y, x);
    θ = toDeg(θ);
    return (θ + 360) % 360; // auf 0–360° normiert
}