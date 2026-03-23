(function() {
    'use strict';
    
    const STORAGE_KEY = 'visitor_analytics';
    const STORAGE_VERSION = '1.0';
    
    function getStoredData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            if (data.version !== STORAGE_VERSION) return null;
            
            return data;
        } catch (e) {
            console.error('Failed to read stored data:', e);
            return null;
        }
    }
    
    function saveData(data) {
        try {
            data.version = STORAGE_VERSION;
            data.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }
    
    function generateVisitorId() {
        return 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    function initializeData() {
        let data = getStoredData();
        
        if (!data) {
            data = {
                visitorId: generateVisitorId(),
                totalVisits: 0,
                locations: [],
                firstVisit: Date.now(),
                version: STORAGE_VERSION
            };
        }
        
        data.totalVisits += 1;
        
        return data;
    }
    
    async function getVisitorLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('Geolocation API failed');
            
            const data = await response.json();
            
            return {
                city: data.city || 'Unknown',
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'XX',
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                timestamp: Date.now()
            };
        } catch (error) {
            console.warn('Geolocation failed, using fallback:', error);
            return {
                city: 'Unknown',
                country: 'Unknown',
                countryCode: 'XX',
                latitude: 0,
                longitude: 0,
                timestamp: Date.now()
            };
        }
    }
    
    function addLocationToData(data, location) {
        const existingLocation = data.locations.find(
            loc => loc.city === location.city && loc.country === location.country
        );
        
        if (!existingLocation) {
            data.locations.push({
                city: location.city,
                country: location.country,
                countryCode: location.countryCode,
                latitude: location.latitude,
                longitude: location.longitude,
                visits: 1,
                firstSeen: location.timestamp,
                lastSeen: location.timestamp
            });
        } else {
            existingLocation.visits += 1;
            existingLocation.lastSeen = location.timestamp;
        }
        
        return data;
    }
    
    function updateStats(data) {
        const totalVisitsEl = document.getElementById('total-visits');
        const uniqueLocationsEl = document.getElementById('unique-locations');
        
        if (totalVisitsEl) {
            totalVisitsEl.textContent = data.totalVisits.toLocaleString();
        }
        
        if (uniqueLocationsEl) {
            const uniqueCountries = new Set(data.locations.map(loc => loc.countryCode));
            uniqueLocationsEl.textContent = uniqueCountries.size;
        }
    }
    
    function initializeMap(data) {
        const mapElement = document.getElementById('visitor-map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }
        
        const map = L.map('visitor-map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: true,
            zoomControl: true
        });
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);
        
        data.locations.forEach(location => {
            if (location.latitude === 0 && location.longitude === 0) return;
            
            const marker = L.circleMarker([location.latitude, location.longitude], {
                radius: 6,
                fillColor: '#4a5568',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);
            
            const popupContent = `
                <div style="text-align: center; font-family: 'Source Sans Pro', sans-serif;">
                    <strong style="color: #2d3748; font-size: 0.95em;">${location.city}</strong><br>
                    <span style="color: #718096; font-size: 0.85em;">${location.country}</span><br>
                    <span style="color: #4a5568; font-size: 0.8em; margin-top: 4px; display: inline-block;">
                        ${location.visits} visit${location.visits > 1 ? 's' : ''}
                    </span>
                </div>
            `;
            
            marker.bindPopup(popupContent);
        });
        
        if (data.locations.length > 0) {
            const validLocations = data.locations.filter(
                loc => loc.latitude !== 0 || loc.longitude !== 0
            );
            
            if (validLocations.length > 0) {
                const bounds = L.latLngBounds(
                    validLocations.map(loc => [loc.latitude, loc.longitude])
                );
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 4 });
            }
        }
        
        return map;
    }
    
    async function initialize() {
        try {
            let data = initializeData();
            
            updateStats(data);
            
            const location = await getVisitorLocation();
            
            data = addLocationToData(data, location);
            
            saveData(data);
            
            updateStats(data);
            
            initializeMap(data);
            
        } catch (error) {
            console.error('Failed to initialize visitor map:', error);
            
            const data = getStoredData() || {
                totalVisits: 1,
                locations: [],
                version: STORAGE_VERSION
            };
            updateStats(data);
            initializeMap(data);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
