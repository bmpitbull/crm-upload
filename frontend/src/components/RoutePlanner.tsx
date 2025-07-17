import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon issue for Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Business {
  id: number;
  name: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
}

interface Route {
  id: number;
  name: string;
  description: string;
  total_distance_miles: number;
  total_distance_km: number;
  estimated_duration_minutes: number;
  created_at: string;
  stops: RouteStop[];
}

interface RouteStop {
  id: number;
  business_id: number;
  stop_order: number;
  business_name: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
  estimated_duration_minutes: number;
  notes: string;
}

interface RouteExecution {
  id: number;
  execution_date: string;
  actual_distance_miles: number;
  actual_distance_km: number;
  actual_duration_minutes: number;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

interface RoutePlannerProps {
  isLoggedIn?: boolean;
}

const DEFAULT_START_PLACE = {
  id: -1,
  business_name: 'Start: 54- NW University Blvd',
  address: '54- NW University Blvd, Port Saint Lucie, FL 34986',
  phone: '',
  lat: 27.3132, // Actual latitude
  lng: -80.4142, // Actual longitude
  stop_order: 0,
  estimated_duration_minutes: 0,
  notes: '',
};

function getStopName(stop: any) {
  return stop.business_name ?? stop.name ?? '';
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ isLoggedIn }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([]);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');
  const [executions, setExecutions] = useState<RouteExecution[]>([]);
  const [customStartPlace, setCustomStartPlace] = useState<any>(DEFAULT_START_PLACE);

  const getApi = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return axios.create({
      baseURL: 'http://localhost:3001/api', // changed from 3000 to 3001
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  // Load businesses
  const loadBusinesses = async () => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get('/businesses');
      setBusinesses(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load businesses');
    }
  };

  // Load routes
  const loadRoutes = async () => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get('/routes');
      setRoutes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load routes');
    }
  };

  // Load route details
  const loadRouteDetails = async (routeId: number) => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get(`/routes/${routeId}`);
      setSelectedRoute(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load route details');
    }
  };

  // Load route executions
  const loadRouteExecutions = async (routeId: number) => {
    try {
      const api = getApi();
      if (!api) return;

      const response = await api.get(`/routes/${routeId}/executions`);
      setExecutions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load route executions');
    }
  };

  // Create new route
  const createRoute = async () => {
    if (!routeName.trim() || selectedBusinesses.length === 0) {
      setError('Route name and at least one business are required');
      return;
    }

    try {
      const api = getApi();
      if (!api) return;

      await api.post('/routes', {
        name: routeName,
        description: routeDescription,
        business_ids: selectedBusinesses
      });

      setRouteName('');
      setRouteDescription('');
      setSelectedBusinesses([]);
      setIsCreating(false);
      loadRoutes();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create route');
    }
  };

  // Update route
  const updateRoute = async () => {
    if (!selectedRoute || !routeName.trim() || selectedBusinesses.length === 0) {
      setError('Route name and at least one business are required');
      return;
    }

    try {
      const api = getApi();
      if (!api) return;

      await api.put(`/routes/${selectedRoute.id}`, {
        name: routeName,
        description: routeDescription,
        business_ids: selectedBusinesses
      });

      setRouteName('');
      setRouteDescription('');
      setSelectedBusinesses([]);
      setSelectedRoute(null);
      setIsEditing(false);
      loadRoutes();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update route');
    }
  };

  // Duplicate route
  const duplicateRoute = async (route: Route) => {
    const newName = `${route.name} (Copy)`;
    try {
      const api = getApi();
      if (!api) return;

      await api.post(`/routes/${route.id}/duplicate`, { name: newName });
      loadRoutes();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate route');
    }
  };

  // Delete route
  const deleteRoute = async (routeId: number) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;

    try {
      const api = getApi();
      if (!api) return;

      await api.delete(`/routes/${routeId}`);
      loadRoutes();
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete route');
    }
  };

  // Start route execution
  const startRouteExecution = async (routeId: number) => {
    try {
      const api = getApi();
      if (!api) return;

      await api.post(`/routes/${routeId}/execute`, {
        execution_date: new Date().toISOString().split('T')[0]
      });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start route execution');
    }
  };

  // Edit route
  const editRoute = (route: Route) => {
    setSelectedRoute(route);
    setRouteName(route.name);
    setRouteDescription(route.description);
    setSelectedBusinesses((route.stops || []).map(stop => stop.business_id));
    setIsEditing(true);
    setIsCreating(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setSelectedRoute(null);
    setRouteName('');
    setRouteDescription('');
    setSelectedBusinesses([]);
    setIsEditing(false);
    setIsCreating(false);
  };

  // Toggle business selection
  const toggleBusinessSelection = (businessId: number) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  // Move business in route
  const moveBusinessInRoute = (fromIndex: number, toIndex: number) => {
    const newOrder = [...selectedBusinesses];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setSelectedBusinesses(newOrder);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadBusinesses();
      loadRoutes();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedRoute) {
      loadRouteExecutions(selectedRoute.id);
    }
  }, [selectedRoute]);

  if (!isLoggedIn) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        textAlign: 'center' 
      }}>
        <h3>Route Planner</h3>
        <p>Please log in to use route planning features.</p>
      </div>
    );
  }

  const selectedBusinessesData = businesses.filter(b => selectedBusinesses.includes(b.id));
  // Build the list of possible starting places
  const startPlaceOptions = [
    DEFAULT_START_PLACE,
    ...businesses
  ];

  // Find the selected start place object
  const selectedStartPlace = startPlaceOptions.find(
    (b) => b.id === customStartPlace?.id
  ) || DEFAULT_START_PLACE;

  // Build the route stops with the selected start place
  const routeStops = selectedRoute
    ? [selectedStartPlace, ...(selectedRoute.stops || [])]
    : [];

  // Before rendering the map
  console.log('routeStops:', routeStops);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginTop: 0, color: '#2c3e50' }}>🗺️ Route Planner</h3>
      {/* Starting Place Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 'bold', marginRight: 8 }}>Starting Point:</label>
        <select
          value={customStartPlace?.id}
          onChange={e => {
            const id = parseInt(e.target.value, 10);
            const found = startPlaceOptions.find(b => b.id === id);
            setCustomStartPlace(found || DEFAULT_START_PLACE);
          }}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
        >
          <option value={DEFAULT_START_PLACE.id}>{DEFAULT_START_PLACE.address}</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.address})</option>
          ))}
        </select>
      </div>
      
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

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Business Selection */}
        <div style={{ flex: 1 }}>
          <h4 style={{ marginTop: 0, color: '#2c3e50' }}>Available Businesses</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
            {businesses.map(business => (
              <div
                key={business.id}
                onClick={() => toggleBusinessSelection(business.id)}
                style={{
                  padding: '10px',
                  margin: '5px 0',
                  backgroundColor: selectedBusinesses.includes(business.id) ? '#e3f2fd' : '#f8f9fa',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: selectedBusinesses.includes(business.id) ? '2px solid #2196f3' : '1px solid #dee2e6'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{business.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{business.address}</div>
                {business.lat && business.lng && (
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    📍 {business.lat.toFixed(4)}, {business.lng.toFixed(4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Route Creation/Editing */}
        <div style={{ flex: 1 }}>
          <h4 style={{ marginTop: 0, color: '#2c3e50' }}>
            {isEditing ? 'Edit Route' : isCreating ? 'Create New Route' : 'Route Management'}
          </h4>
          
          {!isCreating && !isEditing && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                ➕ Create New Route
              </button>
            </div>
          )}

          {(isCreating || isEditing) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Route Name
                </label>
                <input
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Enter route name"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={routeDescription}
                  onChange={(e) => setRouteDescription(e.target.value)}
                  placeholder="Enter route description"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    height: '60px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Selected Businesses ({selectedBusinesses.length})
                </label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '5px' }}>
                  {selectedBusinessesData.map((business, index) => (
                    <div key={business.id} style={{ 
                      padding: '5px', 
                      backgroundColor: '#f8f9fa', 
                      margin: '2px 0',
                      borderRadius: '3px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{index + 1}. {business.name}</span>
                      <button
                        onClick={() => toggleBusinessSelection(business.id)}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={isEditing ? updateRoute : createRoute}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {isEditing ? '💾 Update Route' : '💾 Save Route'}
                </button>
                <button
                  onClick={cancelEditing}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Routes List */}
      <div style={{ marginTop: '30px' }}>
        <h4 style={{ marginTop: 0, color: '#2c3e50' }}>Your Routes</h4>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {routes.map(route => (
            <div
              key={route.id}
              style={{
                padding: '15px',
                margin: '10px 0',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ margin: 0, color: '#2c3e50' }}>{route.name}</h5>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => editRoute(route)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#ffc107',
                      color: '#212529',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => duplicateRoute(route)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📋 Duplicate
                  </button>
                  <button
                    onClick={() => startRouteExecution(route.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🚀 Start
                  </button>
                  <button
                    onClick={() => deleteRoute(route.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                {route.description && <div>{route.description}</div>}
                <div>📏 Distance: {route.total_distance_miles.toFixed(2)} miles ({route.total_distance_km.toFixed(2)} km)</div>
                <div>📅 Created: {new Date(route.created_at).toLocaleDateString()}</div>
              </div>

              <button
                onClick={() => loadRouteDetails(route.id)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗺️ View Details
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Route Details */}
      {selectedRoute && (
        <div style={{ marginTop: '30px' }}>
          <h4 style={{ marginTop: 0, color: '#2c3e50' }}>Route Details: {selectedRoute.name}</h4>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Route Stops */}
            <div style={{ flex: 1 }}>
              <h5>Route Stops</h5>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {routeStops.map((stop, index) => (
                  <div key={stop.id} style={{
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '4px',
                    border: '1px solid #bbdefb'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {index + 1}. {getStopName(stop)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{stop.address}</div>
                    {stop.lat && stop.lng && (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        📍 {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Route Map */}
            <div style={{ flex: 1 }}>
              <h5>Route Map</h5>
              <div style={{ height: '300px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <MapContainer
                  center={
                    customStartPlace.lat && customStartPlace.lng
                      ? [customStartPlace.lat, customStartPlace.lng]
                      : [0, 0]
                  }
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Route line */}
                  {routeStops.length > 1 && (
                    <Polyline
                      positions={routeStops
                        .filter(stop => stop.lat && stop.lng)
                        .map(stop => [stop.lat!, stop.lng!])}
                      color="blue"
                      weight={3}
                      opacity={0.7}
                    />
                  )}
                  
                  {/* Business markers */}
                  {routeStops.map((stop, index) => (
                    stop.lat && stop.lng && (
                      <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                        <Popup>
                          <div>
                            <strong>{index + 1}. {getStopName(stop)}</strong><br />
                            {stop.address}<br />
                            📞 {stop.phone}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Route Executions */}
          <div style={{ marginTop: '20px' }}>
            <h5>Route Executions</h5>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {executions.map(execution => (
                <div key={execution.id} style={{
                  padding: '10px',
                  margin: '5px 0',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {new Date(execution.execution_date).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Status: {execution.status}<br />
                    Actual Distance: {execution.actual_distance_miles.toFixed(2)} miles<br />
                    Duration: {execution.actual_duration_minutes} minutes<br />
                    {execution.notes && <div>Notes: {execution.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner; 