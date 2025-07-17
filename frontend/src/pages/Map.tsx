import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Add TypeScript declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const api = axios.create({
  baseURL: '/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Component to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

const MapPage = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [isListening, setIsListening] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchBusinesses();
    getUserLocation();
    setupVoiceRecognition();
  }, []);

  useEffect(() => {
    setFilteredBusinesses(
      businesses.filter(business =>
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, businesses]);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/businesses');
      setBusinesses(res.data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const setupVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceInput(transcript);
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const addBusinessToMap = async (business: any) => {
    try {
      // Use a geocoding service to get coordinates for the address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(business.address)}`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const updatedBusiness = { ...business, lat: parseFloat(lat), lng: parseFloat(lon) };
        
        // Update the business in the database with coordinates
        await api.put(`/businesses/${business.id}`, updatedBusiness);
        
        // Refresh the businesses list
        fetchBusinesses();
      }
    } catch (error) {
      console.error('Error adding business to map:', error);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px',
              minWidth: '250px'
            }}
          />
          <button
            onClick={startVoiceRecognition}
            disabled={isListening}
            style={{
              padding: '10px 15px',
              backgroundColor: isListening ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isListening ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isListening ? '🔴 Listening...' : '🎤 Voice Search'}
          </button>
          {isListening && (
            <button
              onClick={stopVoiceRecognition}
              style={{
                padding: '10px 15px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Stop
            </button>
          )}
        </div>

        <button
          onClick={getUserLocation}
          style={{
            padding: '10px 15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          📍 My Location
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Found {filteredBusinesses.length} businesses
          </span>
        </div>
      </div>

      {/* Voice Input Display */}
      {voiceInput && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#e3f2fd',
          borderBottom: '1px solid #bbdefb',
          fontSize: '16px'
        }}>
          🎤 Voice input: "{voiceInput}"
        </div>
      )}

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* User Location Marker */}
          <Marker position={userLocation}>
            <Popup>
              <div>
                <h4>📍 Your Location</h4>
                <p>Lat: {userLocation[0].toFixed(6)}</p>
                <p>Lng: {userLocation[1].toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Business Markers */}
          {filteredBusinesses.map((business) => (
            business.lat && business.lng ? (
              <Marker key={business.id} position={[business.lat, business.lng]}>
                <Popup>
                  <div>
                    <h4>{business.name}</h4>
                    <p><strong>Address:</strong> {business.address}</p>
                    <p><strong>Phone:</strong> {business.phone}</p>
                    <p><strong>Contact:</strong> {business.contact_name}</p>
                    <button
                      onClick={() => addBusinessToMap(business)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Update Location
                    </button>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}

          <MapUpdater center={userLocation} />
        </MapContainer>
      </div>

      {/* Business List Panel */}
      <div style={{
        position: 'absolute',
        top: '120px',
        right: '20px',
        width: '300px',
        maxHeight: 'calc(100vh - 140px)',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        zIndex: 1000
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold'
        }}>
          Businesses ({filteredBusinesses.length})
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {filteredBusinesses.map((business) => (
            <div
              key={business.id}
              style={{
                padding: '15px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              onClick={() => {
                if (business.lat && business.lng) {
                  setUserLocation([business.lat, business.lng]);
                }
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {business.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {business.address}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                📞 {business.phone}
              </div>
              {!business.lat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addBusinessToMap(business);
                  }}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    marginTop: '5px'
                  }}
                >
                  📍 Add to Map
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage; 