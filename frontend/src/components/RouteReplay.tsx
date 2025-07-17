import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix default icon issue for Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RoutePoint {
  id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  session_id: string;
}

interface Session {
  session_id: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
}

interface RouteReplayProps {
  isLoggedIn: boolean;
}

const RouteReplay: React.FC<RouteReplayProps> = ({ isLoggedIn }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1000); // milliseconds
  const [error, setError] = useState<string>('');

  const getApi = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return axios.create({
      baseURL: 'http://localhost:3000/api/location',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  // Load user sessions
  const loadSessions = async () => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get('/tracking/active-sessions');
      setSessions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load sessions');
    }
  };

  // Load route points for a session
  const loadRoutePoints = async (sessionId: string) => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get(`/tracking/session/${sessionId}`);
      setRoutePoints(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load route points');
    }
  };

  // Start route replay
  const startReplay = () => {
    if (routePoints.length === 0) return;
    
    setIsReplaying(true);
    setCurrentPointIndex(0);
    
    const interval = setInterval(() => {
      setCurrentPointIndex(prev => {
        if (prev >= routePoints.length - 1) {
          setIsReplaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, replaySpeed);
  };

  // Stop route replay
  const stopReplay = () => {
    setIsReplaying(false);
    setCurrentPointIndex(0);
  };

  // Calculate total distance of route
  const calculateRouteDistance = (points: RoutePoint[]): number => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const distance = calculateDistance(
        prev.latitude, 
        prev.longitude, 
        curr.latitude, 
        curr.longitude
      );
      totalDistance += distance;
    }
    return totalDistance;
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadSessions();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedSession) {
      loadRoutePoints(selectedSession);
    }
  }, [selectedSession]);

  if (!isLoggedIn) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        textAlign: 'center' 
      }}>
        <h3>Route Replay</h3>
        <p>Please log in to view route replays.</p>
      </div>
    );
  }

  const currentPoint = routePoints[currentPointIndex];
  const totalDistance = calculateRouteDistance(routePoints);
  const center = routePoints.length > 0 
    ? [routePoints[0].latitude, routePoints[0].longitude] 
    : [0, 0];

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginTop: 0, color: '#2c3e50' }}>🗺️ Route Replay</h3>
      
      {error && (
        <div style={{ 
          background: '#ffdddd', 
          color: '#a00', 
          padding: '10px', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Session Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Select Session to Replay:
        </label>
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="">Choose a session...</option>
          {sessions.map(session => (
            <option key={session.session_id} value={session.session_id}>
              {new Date(session.start_time).toLocaleString()} 
              {session.is_active ? ' (Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Route Info */}
      {routePoints.length > 0 && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Route Information</h4>
          <div style={{ fontSize: '14px' }}>
            <div>Total Points: {routePoints.length}</div>
            <div>Total Distance: {totalDistance.toFixed(2)} miles</div>
            <div>Duration: {routePoints.length > 1 
              ? `${Math.round((new Date(routePoints[routePoints.length - 1].timestamp).getTime() - 
                  new Date(routePoints[0].timestamp).getTime()) / 1000 / 60)} minutes`
              : 'N/A'
            }</div>
            {currentPoint && (
              <div>Current Point: {currentPointIndex + 1} of {routePoints.length}</div>
            )}
          </div>
        </div>
      )}

      {/* Replay Controls */}
      {routePoints.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <button
              onClick={startReplay}
              disabled={isReplaying}
              style={{
                padding: '8px 16px',
                backgroundColor: isReplaying ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isReplaying ? 'not-allowed' : 'pointer'
              }}
            >
              ▶️ Start Replay
            </button>
            <button
              onClick={stopReplay}
              disabled={!isReplaying}
              style={{
                padding: '8px 16px',
                backgroundColor: !isReplaying ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !isReplaying ? 'not-allowed' : 'pointer'
              }}
            >
              ⏹️ Stop Replay
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px' }}>Replay Speed:</label>
            <select
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(Number(e.target.value))}
              style={{
                padding: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Normal (1s)</option>
              <option value={2000}>Slow (2s)</option>
              <option value={5000}>Very Slow (5s)</option>
            </select>
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ height: '400px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <MapContainer
          center={center as [number, number]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Route line */}
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints.map(point => [point.latitude, point.longitude])}
              color="blue"
              weight={3}
              opacity={0.7}
            />
          )}
          
          {/* Start marker */}
          {routePoints.length > 0 && (
            <Marker position={[routePoints[0].latitude, routePoints[0].longitude]}>
              <Popup>
                <div>
                  <strong>Start Point</strong><br />
                  Time: {new Date(routePoints[0].timestamp).toLocaleString()}<br />
                  Accuracy: {routePoints[0].accuracy ? `${Math.round(routePoints[0].accuracy!)}m` : 'Unknown'}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* End marker */}
          {routePoints.length > 1 && (
            <Marker position={[routePoints[routePoints.length - 1].latitude, routePoints[routePoints.length - 1].longitude]}>
              <Popup>
                <div>
                  <strong>End Point</strong><br />
                  Time: {new Date(routePoints[routePoints.length - 1].timestamp).toLocaleString()}<br />
                  Accuracy: {routePoints[routePoints.length - 1].accuracy ? `${Math.round(routePoints[routePoints.length - 1].accuracy!)}m` : 'Unknown'}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Current replay position */}
          {isReplaying && currentPoint && (
            <Marker 
              position={[currentPoint.latitude, currentPoint.longitude]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              })}
            >
              <Popup>
                <div>
                  <strong>Current Position</strong><br />
                  Time: {new Date(currentPoint.timestamp).toLocaleString()}<br />
                  Accuracy: {currentPoint.accuracy ? `${Math.round(currentPoint.accuracy!)}m` : 'Unknown'}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteReplay; 