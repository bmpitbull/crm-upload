import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

interface Route {
  id: string;
  name: string;
  description: string;
  estimatedDuration: string;
  distance: string;
  stops: number;
}

const RoutesScreen: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { isTracking, startTracking, stopTracking } = useLocation();
  const { token } = useAuth();

  useEffect(() => {
    fetchRoutes();
    updateDebugInfo();
  }, []);

  const updateDebugInfo = async () => {
    try {
      const taskRegistered = await TaskManager.isTaskRegisteredAsync('background-location-task');
      const locationActive = await Location.hasStartedLocationUpdatesAsync('background-location-task');
      const foregroundPermission = await Location.getForegroundPermissionsAsync();
      const backgroundPermission = await Location.getBackgroundPermissionsAsync();
      
      setDebugInfo({
        taskRegistered,
        locationActive,
        foregroundPermission: foregroundPermission.status,
        backgroundPermission: backgroundPermission.status,
        isTracking,
      });
    } catch (error) {
      console.error('Error getting debug info:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/routes', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
      // Show mock data for testing
      setRoutes([
        {
          id: '1',
          name: 'Downtown Route',
          description: 'Visit key businesses in downtown area',
          estimatedDuration: '2 hours',
          distance: '5.2 km',
          stops: 8,
        },
        {
          id: '2',
          name: 'Suburban Circuit',
          description: 'Cover suburban business district',
          estimatedDuration: '3.5 hours',
          distance: '8.7 km',
          stops: 12,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoutePress = (route: Route) => {
    Alert.alert(
      'Route Selected',
      `Starting route: ${route.name}\n\nDuration: ${route.estimatedDuration}\nDistance: ${route.distance}\nStops: ${route.stops}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Route', 
          onPress: () => {
            console.log('Route started:', route.name);
            // Here you would typically start the route tracking
          }
        }
      ]
    );
  };

  const handleTrackingToggle = async () => {
    try {
      if (isTracking) {
        await stopTracking();
        Alert.alert('Location Tracking', 'Location tracking stopped');
      } else {
        await startTracking();
        Alert.alert('Location Tracking', 'Location tracking started');
      }
      // Update debug info after toggle
      setTimeout(updateDebugInfo, 1000);
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert('Error', 'Failed to toggle location tracking');
    }
  };

  const handleDebugRefresh = () => {
    updateDebugInfo();
  };

  const handleTestLocation = async () => {
    try {
      console.log('Testing location permissions...');
      
      // Test foreground permission
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      console.log('Foreground permission status:', foregroundStatus.status);
      
      // Test background permission
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      console.log('Background permission status:', backgroundStatus.status);
      
      // Test current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('Current location:', location);
      
      Alert.alert(
        'Location Test',
        `Location test completed!\n\nLat: ${location.coords.latitude}\nLng: ${location.coords.longitude}\nAccuracy: ${location.coords.accuracy}m`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error testing location:', error);
      Alert.alert('Error', 'Failed to test location. Check permissions.');
    }
  };

  const handleManualTrackingTest = async () => {
    try {
      console.log('Starting manual tracking test...');
      
      // First, check current state
      const taskRegistered = await TaskManager.isTaskRegisteredAsync('background-location-task');
      const locationActive = await Location.hasStartedLocationUpdatesAsync('background-location-task');
      
      console.log('Before test - Task registered:', taskRegistered, 'Location active:', locationActive);
      
      // Try to start tracking manually
      await startTracking();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check state after start
      const taskRegisteredAfter = await TaskManager.isTaskRegisteredAsync('background-location-task');
      const locationActiveAfter = await Location.hasStartedLocationUpdatesAsync('background-location-task');
      
      console.log('After start - Task registered:', taskRegisteredAfter, 'Location active:', locationActiveAfter);
      
      // Try to stop tracking manually
      await stopTracking();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check final state
      const taskRegisteredFinal = await TaskManager.isTaskRegisteredAsync('background-location-task');
      const locationActiveFinal = await Location.hasStartedLocationUpdatesAsync('background-location-task');
      
      console.log('After stop - Task registered:', taskRegisteredFinal, 'Location active:', locationActiveFinal);
      
      Alert.alert(
        'Manual Test Complete',
        `Test completed!\n\nBefore: Task=${taskRegistered}, Active=${locationActive}\nAfter Start: Task=${taskRegisteredAfter}, Active=${locationActiveAfter}\nAfter Stop: Task=${taskRegisteredFinal}, Active=${locationActiveFinal}`,
        [{ text: 'OK' }]
      );
      
      // Update debug info
      updateDebugInfo();
      
    } catch (error) {
      console.error('Error in manual tracking test:', error);
      Alert.alert('Error', 'Manual tracking test failed. Check console for details.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Routes</Text>
        <TouchableOpacity
          style={[styles.trackingButton, isTracking ? styles.trackingActive : styles.trackingInactive]}
          onPress={handleTrackingToggle}
        >
          <Text style={styles.trackingButtonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Location Tracking: {isTracking ? 'Active' : 'Inactive'}
        </Text>
      </View>

      {/* Debug Section */}
      <View style={styles.debugContainer}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>Debug Information</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleDebugRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Task Registered: {debugInfo.taskRegistered ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Location Active: {debugInfo.locationActive ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Foreground Permission: {debugInfo.foregroundPermission}</Text>
          <Text style={styles.debugText}>Background Permission: {debugInfo.backgroundPermission}</Text>
          <Text style={styles.debugText}>UI State: {isTracking ? 'Tracking' : 'Not Tracking'}</Text>
        </View>
        <TouchableOpacity style={styles.testButton} onPress={handleTestLocation}>
          <Text style={styles.testButtonText}>Test Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.testButton, { backgroundColor: '#8E44AD', marginTop: 8 }]} onPress={handleManualTrackingTest}>
          <Text style={styles.testButtonText}>Manual Tracking Test</Text>
        </TouchableOpacity>
      </View>

      {routes.map((route) => (
        <TouchableOpacity
          key={route.id}
          style={styles.routeCard}
          onPress={() => handleRoutePress(route)}
        >
          <View style={styles.routeHeader}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeDuration}>{route.estimatedDuration}</Text>
          </View>
          <Text style={styles.routeDescription}>{route.description}</Text>
          <View style={styles.routeDetails}>
            <Text style={styles.routeDetail}>Distance: {route.distance}</Text>
            <Text style={styles.routeDetail}>Stops: {route.stops}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  trackingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  trackingActive: {
    backgroundColor: '#ff4444',
  },
  trackingInactive: {
    backgroundColor: '#4CAF50',
  },
  trackingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '500',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    gap: 4,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  routeDuration: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeDetail: {
    fontSize: 12,
    color: '#888',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default RoutesScreen; 