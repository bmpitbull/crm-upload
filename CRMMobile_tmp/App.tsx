import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RoutesScreen from './src/screens/RoutesScreen';
import BusinessDetailsScreen from './src/screens/BusinessDetailsScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import AddNoteScreen from './src/screens/AddNoteScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Routes') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else {
            iconName = focused ? 'business' : 'business-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Routes" component={RoutesScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="BusinessDetails" 
              component={BusinessDetailsScreen}
              options={{ headerShown: true, title: 'Business Details' }}
            />
            <Stack.Screen 
              name="AddNote" 
              component={AddNoteScreen}
              options={{ headerShown: true, title: 'Add Note' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  useEffect(() => {
    requestLocationPermissions();
  }, []);

  const requestLocationPermissions = async () => {
    try {
      // Check current permission status
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Request foreground permission first
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (foregroundStatus !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'This app needs location access to track your route progress. Please enable location permissions in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => openAppSettings() 
              }
            ]
          );
          return;
        }
      }

      // Request background permission for route tracking
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        const { status: newBackgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (newBackgroundStatus !== 'granted') {
          Alert.alert(
            'Background Location Required',
            'This app needs background location access to track your routes even when the app is not active. Please enable "Always" location permission in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => openAppSettings() 
              }
            ]
          );
          return;
        }
      }

      setLocationPermissionGranted(true);
      console.log('Location permissions granted');
      
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      Alert.alert(
        'Permission Error',
        'There was an error requesting location permissions. Please check your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => openAppSettings() 
          }
        ]
      );
    }
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <AuthProvider>
      <LocationProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </LocationProvider>
    </AuthProvider>
  );
} 