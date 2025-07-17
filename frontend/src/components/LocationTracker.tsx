import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import RouteReplay from './RouteReplay';

interface LocationTrackerProps {
  isLoggedIn: boolean;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

interface Session {
  session_id: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
}

interface DailyMileage {
  date: string;
  total_distance_miles: number;
  total_distance_km: number;
  points_count: number;
  session_count: number;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ isLoggedIn }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [dailyMileage, setDailyMileage] = useState<DailyMileage | null>(null);
  const [error, setError] = useState<string>('');
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastLocation, setLastLocation] = useState<LocationPoint | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const getApi = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return axios.create({
      baseURL: 'http://localhost:3000/api/location',
      headers: { Authorization: `Bearer ${token}` }
    });
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

  // Start tracking session
  const startTracking = async () => {
    if (!isLoggedIn) {
      setError('Please log in to start tracking');
      return;
    }

    try {
      const api = getApi();
      if (!api) {
        setError('Authentication required');
        return;
      }

      const response = await api.post('/tracking/start');
      const session = response.data;
      setCurrentSession(session);
      setIsTracking(true);
      setError('');

      // Start periodic location tracking
      const interval = setInterval(() => {
        recordLocation(session.session_id);
      }, 10000); // Record location every 10 seconds

      setTrackingInterval(interval);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start tracking');
    }
  };

  // Stop tracking session
  const stopTracking = async () => {
    if (!currentSession) return;

    try {
      const api = getApi();
      if (!api) return;

      await api.post('/tracking/end', { session_id: currentSession.session_id });
      
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }

      setIsTracking(false);
      setCurrentSession(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to stop tracking');
    }
  };

  // Record current location
  const recordLocation = async (sessionId: string) => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationPoint: LocationPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString()
      };

      const api = getApi();
      if (!api) return;

      await api.post('/tracking/record', {
        latitude: locationPoint.latitude,
        longitude: locationPoint.longitude,
        accuracy: locationPoint.accuracy,
        session_id: sessionId
      });

      setLocationHistory(prev => [...prev, locationPoint]);
      setLastLocation(locationPoint);

      // Calculate distance if we have a previous location
      if (lastLocation) {
        const distance = calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          locationPoint.latitude,
          locationPoint.longitude
        );
        setTotalDistance(prev => prev + distance);
      }
    } catch (err: any) {
      console.error('Failed to record location:', err);
    }
  };

  // Load daily mileage
  const loadDailyMileage = async () => {
    try {
      const api = getApi();
      if (!api) return;

      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/mileage/daily/${today}`);
      setDailyMileage(response.data);
    } catch (err: any) {
      console.error('Failed to load daily mileage:', err);
    }
  };

  // Calculate today's mileage
  const calculateTodayMileage = async () => {
    try {
      const api = getApi();
      if (!api) return;

      const today = new Date().toISOString().split('T')[0];
      const response = await api.post(`/mileage/calculate/${today}`);
      setDailyMileage(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate mileage');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadDailyMileage();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);

  if (!isLoggedIn) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        textAlign: 'center' 
      }}>
        <h3>Location Tracking</h3>
        <p>Please log in to use location tracking features.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginTop: 0, color: '#2c3e50' }}>📍 Location Tracking</h3>
      
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

      {/* Tracking Controls */}
      <div style={{ marginBottom: '20px' }}>
        {!isTracking ? (
          <button
            onClick={startTracking}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px'
            }}
          >
            🚀 Start Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px'
            }}
          >
            ⏹️ Stop Tracking
          </button>
        )}
        
        <button
          onClick={calculateTodayMileage}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          📊 Calculate Today's Mileage
        </button>
      </div>

      {/* Current Session Info */}
      {currentSession && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Active Session</h4>
          <div style={{ fontSize: '14px' }}>
            <div>Session ID: {currentSession.session_id}</div>
            <div>Started: {new Date(currentSession.start_time).toLocaleString()}</div>
            <div>Current Distance: {totalDistance.toFixed(2)} miles</div>
            <div>Points Recorded: {locationHistory.length}</div>
          </div>
        </div>
      )}

      {/* Daily Mileage Display */}
      {dailyMileage && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Today's Mileage</h4>
          <div style={{ fontSize: '14px' }}>
            <div>Date: {dailyMileage.date}</div>
            <div>Total Distance: {dailyMileage.total_distance_miles.toFixed(2)} miles ({dailyMileage.total_distance_km.toFixed(2)} km)</div>
            <div>Points Recorded: {dailyMileage.points_count}</div>
            <div>Sessions: {dailyMileage.session_count}</div>
          </div>
        </div>
      )}

      {/* Last Known Location */}
      {lastLocation && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Last Known Location</h4>
          <div style={{ fontSize: '14px' }}>
            <div>Latitude: {lastLocation.latitude.toFixed(6)}</div>
            <div>Longitude: {lastLocation.longitude.toFixed(6)}</div>
            <div>Accuracy: {lastLocation.accuracy ? `${Math.round(lastLocation.accuracy!)}m` : 'Unknown'}</div>
            <div>Time: {new Date(lastLocation.timestamp).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Location History */}
      {locationHistory.length > 0 && (
        <div>
          <h4>Recent Location Points ({locationHistory.length})</h4>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            border: '1px solid #dee2e6', 
            borderRadius: '4px',
            padding: '10px'
          }}>
            {locationHistory.slice(-10).map((point, index) => (
              <div key={index} style={{ 
                padding: '5px', 
                borderBottom: '1px solid #eee',
                fontSize: '12px'
              }}>
                {new Date(point.timestamp).toLocaleTimeString()} - 
                {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                {point.accuracy && ` (±${Math.round(point.accuracy!)}m)`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Replay */}
      <RouteReplay isLoggedIn={isLoggedIn} />
    </div>
  );
};

export default LocationTracker; 