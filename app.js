let mapEngine = null;
let userMarker = null;
let routeLine = null;
let gpsTrackerInstance = null;
let databaseKoordinat = JSON.parse(localStorage.getItem('riwayat_gps_akurat')) || [];

// 1. Inisialisasi Peta Pertama Kali
function initMap() {
    mapEngine = L.map('map-frame', { zoomControl: true }).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mapEngine);

    routeLine = L.polyline([], { color: '#66fcf1', weight: 4 }).addTo(mapEngine);

    // Memulihkan data rute lama dari memori jika ada
    if (databaseKoordinat.length > 0) {
        const koordinatArray = databaseKoordinat.map(item => [item.lat, item.lng]);
        routeLine.setLatLngs(koordinatArray);
        const titikTerakhir = koordinatArray[koordinatArray.length - 1];
        userMarker = L.marker(titikTerakhir).addTo(mapEngine);
        mapEngine.setView(titikTerakhir, 16);
    }
    updateJsonDisplay();
}

// Jalankan peta saat script termuat
initMap();

// 2. Mengaktifkan Pelacakan GPS Hardware
function initiateGpsTracking() {
    const statusBox = document.getElementById('telemetryData');
    statusBox.innerHTML = "<strong>Sistem:</strong> Meminta izin akses modul hardware GPS...";

    if (!navigator.geolocation) {
        statusBox.innerHTML = "<strong>Kegagalan Sistem:</strong> Perangkat keras atau browser Anda tidak mendukung pembacaan GPS.";
        return;
    }

    const gpsOptions = {
        enableHighAccuracy: true, // Memaksa HP mengunci satelit GPS riil
        timeout: 15000,           
        maximumAge: 0             // Menolak cache lokasi lama
    };

    if (gpsTrackerInstance !== null) {
        navigator.geolocation.clearWatch(gpsTrackerInstance);
    }

    gpsTrackerInstance = navigator.geolocation.watchPosition(
        (posisi) => {
            const latitudeAsli = posisi.coords.latitude;
            const longitudeAsli = posisi.coords.longitude;
            const akurasiMeter = posisi.coords.accuracy;
            const waktuData = new Date().toISOString();

            statusBox.innerHTML = `<strong>GPS Terkunci (Akurat):</strong><br>
                                   Lat: ${latitudeAsli.toFixed(6)}<br>
                                   Lng: ${longitudeAsli.toFixed(6)}<br>
                                   Tingkat Akurasi: ±${akurasiMeter.toFixed(1)} meter`;

            const posisiBaru = [latitudeAsli, longitudeAsli];
            mapEngine.setView(posisiBaru, 17);

            if (!userMarker) {
                userMarker = L.marker(posisiBaru).addTo(mapEngine);
            } else {
                userMarker.setLatLng(posisiBaru);
            }

            routeLine.addLatLng(posisiBaru);

            // Push ke struktur data JSON
            const dataObjek = { lat: latitudeAsli, lng: longitudeAsli, akurasi: akurasiMeter, timestamp: waktuData };
            databaseKoordinat.push(dataObjek);
            localStorage.setItem('riwayat_gps_akurat', JSON.stringify(databaseKoordinat));

            updateJsonDisplay();
        },
        (error) => {
            handleGpsError(error);
        },
        gpsOptions
    );
}

// 3. Menangani Error GPS Hardware
function handleGpsError(error) {
    const statusBox = document.getElementById('telemetryData');
    switch(error.code) {
        case error.PERMISSION_DENIED:
            statusBox.innerHTML = "<strong>Akses Ditolak:</strong> Anda memblokir izin lokasi. Silakan ubah pengaturan privasi browser Anda.";
            break;
        case error.POSITION_UNAVAILABLE:
            statusBox.innerHTML = "<strong>Sinyal Hilang:</strong> Satelit GPS tidak dapat menjangkau posisi perangkat Anda. Cari tempat terbuka.";
            break;
        case error.TIMEOUT:
            statusBox.innerHTML = "<strong>Waktu Habis:</strong> Pencarian satelit memakan waktu terlalu lama. Hidupkan ulang lokasi HP.";
            break;
        default:
            statusBox.innerHTML = `<strong>Error Sistem:</strong> ${error.message}`;
    }
}

function updateJsonDisplay() {
    const streamBox = document.getElementById('jsonStream');
    streamBox.innerText = JSON.stringify(databaseKoordinat, null, 2);
    streamBox.scrollTop = streamBox.scrollHeight;
}

// 4. Reset Sistem dan Menghapus Cache Database
function clearGpsDatabase() {
    if (gpsTrackerInstance !== null) {
        navigator.geolocation.clearWatch(gpsTrackerInstance);
        gpsTrackerInstance = null;
    }
    localStorage.removeItem('riwayat_gps_akurat');
    databaseKoordinat = [];
    if (userMarker) {
        mapEngine.removeLayer(userMarker);
        userMarker = null;
    }
    if (routeLine) {
        routeLine.setLatLngs([]);
    }
    mapEngine.setView([0, 0], 2);
    document.getElementById('telemetryData').innerHTML = "<strong>Sistem Status:</strong> Memori dibersihkan. Sistem di-reset ke kondisi awal.";
    updateJsonDisplay();
}
