import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useAuth } from './AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationContextType {
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  currentLocation: Location.LocationObject | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_TASK_NAME = 'background-location-task';

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    
    // Send location to server
    await sendLocationToServer(location);
  }
});

const sendLocationToServer = async (location: Location.LocationObject) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    await axios.post('http://localhost:3000/api/location/track', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Error sending location to server:', error);
  }
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isAuthenticated]);

  const startTracking = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.log('Background location permission denied');
        return;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 10, // 10 meters
        foregroundService: {
          notificationTitle: 'CRM Mobile',
          notificationBody: 'Tracking your location for route progress',
        },
      });

      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(false);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const value: LocationContextType = {
    isTracking,
    startTracking,
    stopTracking,
    currentLocation,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}; 