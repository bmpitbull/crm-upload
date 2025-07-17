import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

// Global state to track if we've started the task
let globalTaskStarted = false;

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
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup function to stop tracking when component unmounts
    return () => {
      console.log('LocationProvider cleanup - stopping tracking');
      stopTracking();
    };
  }, [isAuthenticated]);

  const startTracking = async () => {
    // Prevent multiple simultaneous start attempts
    if (isStartingRef.current) {
      console.log('Start tracking already in progress, skipping');
      return;
    }

    if (isTracking) {
      console.log('Location tracking already active');
      return;
    }

    isStartingRef.current = true;
    
    try {
      console.log('Starting location tracking...');

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setIsTracking(false);
        return;
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.log('Background location permission denied');
        setIsTracking(false);
        return;
      }

      // Check if task is already running
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      console.log('Task registered:', isTaskRegistered);
      
      if (isTaskRegistered) {
        console.log('Location task already registered');
        setIsTracking(true);
        globalTaskStarted = true;
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
      globalTaskStarted = true;
      console.log('Location tracking started successfully');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
      globalTaskStarted = false;
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopTracking = async () => {
    // Prevent multiple simultaneous stop attempts
    if (isStoppingRef.current) {
      console.log('Stop tracking already in progress, skipping');
      return;
    }

    isStoppingRef.current = true;

    try {
      console.log('Stopping location tracking...');

      // Only attempt to stop if we know we started it
      if (!globalTaskStarted) {
        console.log('Task was never started, nothing to stop');
        setIsTracking(false);
        return;
      }

      // Check if task is registered before trying to stop it
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      console.log('Task registered before stop:', isTaskRegistered);
      
      if (!isTaskRegistered) {
        console.log('Location task not registered, nothing to stop');
        setIsTracking(false);
        globalTaskStarted = false;
        return;
      }

      // Check if location updates are actually running
      const isLocationActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Location updates active before stop:', isLocationActive);
      
      if (!isLocationActive) {
        console.log('Location updates not active, nothing to stop');
        setIsTracking(false);
        globalTaskStarted = false;
        return;
      }

      console.log('Attempting to stop location updates...');
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      
      // Verify the task was actually stopped
      const isStillActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Location updates still active after stop:', isStillActive);
      
      setIsTracking(false);
      globalTaskStarted = false;
      console.log('Location tracking stopped successfully');
    } catch (error: any) {
      console.error('Error stopping location tracking:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('E_TASK_NOT_FOUND')) {
        console.log('Task not found error - setting tracking to false');
        setIsTracking(false);
        globalTaskStarted = false;
      } else if (error.message && error.message.includes('E_TASK_NOT_RUNNING')) {
        console.log('Task not running error - setting tracking to false');
        setIsTracking(false);
        globalTaskStarted = false;
      } else {
        // For other errors, still set tracking to false to prevent stuck state
        console.log('Other error - setting tracking to false');
        setIsTracking(false);
        globalTaskStarted = false;
      }
    } finally {
      isStoppingRef.current = false;
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