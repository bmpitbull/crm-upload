import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Calendar from '../components/Calendar';
import AppointmentForm from '../components/AppointmentForm';
import LocationTracker from '../components/LocationTracker';
import RoutePlanner from '../components/RoutePlanner';
import { useAuth } from '../AuthContext';

// Fix default icon issue for Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Add TypeScript declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function CRM() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<{ name: string; address: string; phone: string; lat?: number; lng?: number }>({ name: '', address: '', phone: '', lat: undefined, lng: undefined });
  const [contactForm, setContactForm] = useState({ name: '', title: '', phone: '', email: '' });
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('businesses');
  const [isListening, setIsListening] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [activeVoiceField, setActiveVoiceField] = useState('');
  const [isListeningForNote, setIsListeningForNote] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Helper function to get API instance with current token
  const getApi = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return axios.create({
      baseURL: '/api',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  useEffect(() => {
    fetchBusinesses();
    setupVoiceRecognition();
  }, []);

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
        
        // Apply voice input to the active field
        if (activeVoiceField) {
          if (activeVoiceField === 'note') {
            setNoteText(transcript);
          } else {
            setForm(prev => ({ ...prev, [activeVoiceField]: transcript }));
          }
        }
        
        setIsListening(false);
        setIsListeningForNote(false);
        setActiveVoiceField('');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsListeningForNote(false);
        setActiveVoiceField('');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsListeningForNote(false);
        setActiveVoiceField('');
      };
    }
  };

  const startVoiceRecognition = (fieldName: string) => {
    if (recognitionRef.current) {
      setIsListening(true);
      setActiveVoiceField(fieldName);
      recognitionRef.current.start();
    }
  };

  const startVoiceRecognitionForNote = () => {
    if (recognitionRef.current) {
      setIsListeningForNote(true);
      setActiveVoiceField('note');
      recognitionRef.current.start();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchBusinesses = async () => {
    const api = getApi();
    if (!api) return;
    const res = await api.get('/businesses');
    console.log('Fetched businesses from API:', res.data);
    setBusinesses(res.data);
  };

  const selectBusiness = async (b: any) => {
    setSelected(null);
    setForm(b);
    setError(null);
    try {
      const api = getApi();
      if (!api) return;
      const res = await api.get(`/businesses/${b.id}/full`);
      setSelected(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Unknown error');
    }
  };

  const handleForm = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveBusiness = async () => {
    const api = getApi();
    if (!api) return;

    // Geocode address if present
    let lat = form.lat;
    let lng = form.lng;
    
    if (form.address && form.address.trim() && (!lat || !lng)) {
      try {
        console.log('Geocoding address:', form.address);
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address.trim())}&limit=1`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        console.log('Geocoding response status:', geoRes.status);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          console.log('Geocoding response data:', geoData);
          if (geoData && geoData.length > 0 && geoData[0].lat && geoData[0].lon) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
            console.log('Geocoding successful:', { lat, lng });
            setError(null); // Clear any previous errors
            // Show success message briefly
            const successMsg = `✅ Coordinates found for "${form.address}": ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setError(successMsg);
            setTimeout(() => setError(null), 3000); // Clear success message after 3 seconds
          } else {
            console.log('No geocoding results found');
            setError(`Could not find coordinates for address: "${form.address}". Please enter coordinates manually or try a more specific address.`);
            return; // Don't save if geocoding failed
          }
        } else {
          console.log('Geocoding request failed:', geoRes.status);
          setError(`Geocoding service unavailable. Please enter coordinates manually.`);
          return; // Don't save if geocoding failed
        }
      } catch (e) {
        console.log('Geocoding failed:', e);
        setError(`Geocoding failed: ${(e as Error).message}. Please enter coordinates manually.`);
        return; // Don't save if geocoding failed
      }
    } else {
      console.log('Skipping geocoding - address:', form.address, 'lat:', lat, 'lng:', lng);
    }

    const dataToSend = { ...form, lat, lng };
    console.log('Saving business with data:', dataToSend);

    try {
      if (selected) {
        console.log('Updating business:', selected.id);
        await api.put(`/businesses/${selected.id}`, dataToSend);
      } else {
        console.log('Creating new business');
        await api.post('/businesses', dataToSend);
      }
      setForm({ name: '', address: '', phone: '', lat: undefined, lng: undefined });
      setSelected(null);
      fetchBusinesses();
    } catch (error: any) {
      console.error('Error saving business:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || error.message || 'Failed to save business');
    }
  };

  const deleteBusiness = async (id: number) => {
    const api = getApi();
    if (!api) return;
    await api.delete(`/businesses/${id}`);
    setSelected(null);
    fetchBusinesses();
  };

  // Contact management
  const handleContactForm = (e: any) => setContactForm({ ...contactForm, [e.target.name]: e.target.value });

  const saveContact = async () => {
    if (!selected) return;
    const api = getApi();
    if (!api) return;
    
    if (editingContact) {
      await api.put(`/contacts/${editingContact.id}`, contactForm);
    } else {
      await api.post(`/businesses/${selected.id}/contacts`, contactForm);
    }
    
    setContactForm({ name: '', title: '', phone: '', email: '' });
    setEditingContact(null);
    selectBusiness(selected);
  };

  const editContact = (contact: any) => {
    setEditingContact(contact);
    setContactForm(contact);
  };

  const deleteContact = async (id: number) => {
    const api = getApi();
    if (!api) return;
    await api.delete(`/contacts/${id}`);
    selectBusiness(selected);
  };

  // Add note for a contact
  const addNote = async (contactId: number) => {
    if (!selected) return;
    const api = getApi();
    if (!api) return;

    // Get current geolocation
    let locationData = {};
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_accuracy: position.coords.accuracy,
          location_timestamp: new Date(position.timestamp).toISOString()
        };
      }
    } catch (error) {
      console.log('Geolocation not available or denied:', error);
      // Continue without location data
    }

    await api.post(`/businesses/${selected.id}/notes`, {
      note: noteText,
      contact_id: contactId,
      ...locationData
    });
    setNoteText('');
    selectBusiness(selected);
  };

  // Edit note for a contact
  const editNote = (note: any) => {
    setEditingNote(note);
    setNoteText(note.note);
    setSelectedContactId(note.contact_id);
  };

  const saveNote = async () => {
    if (!editingNote) return;
    const api = getApi();
    if (!api) return;
    await api.put(`/notes/${editingNote.id}`, {
      note: noteText,
      contact_id: selectedContactId
    });
    setEditingNote(null);
    setNoteText('');
    setSelectedContactId('');
    selectBusiness(selected);
  };

  const deleteNote = async (id: number) => {
    const api = getApi();
    if (!api) return;
    await api.delete(`/notes/${id}`);
    selectBusiness(selected);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navigation Header */}
      <div style={{ 
        backgroundColor: '#2c3e50', 
        color: 'white', 
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0 }}>CRM System</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('businesses')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'businesses' ? '#3498db' : 'transparent',
                color: 'white',
                border: '1px solid #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Businesses
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'map' ? '#3498db' : 'transparent',
                color: 'white',
                border: '1px solid #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Map
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'calendar' ? '#3498db' : 'transparent',
                color: 'white',
                border: '1px solid #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('tracking')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'tracking' ? '#3498db' : 'transparent',
                color: 'white',
                border: '1px solid #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              📍 Tracking
            </button>
            <button 
              onClick={() => setActiveTab('route')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'route' ? '#3498db' : 'transparent',
                color: 'white',
                border: '1px solid #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              🚗 Route Planner
            </button>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
        >
          Logout
        </button>
      </div>

      {/* Voice Input Display */}
      {voiceInput && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#e3f2fd',
          borderBottom: '1px solid #bbdefb',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          🎤 Voice input for {activeVoiceField}: "{voiceInput}"
        </div>
      )}

      {/* Content Area */}
      <div style={{ maxWidth: 1400, margin: 'auto', padding: 20 }}>
        {error && (
          <div style={{ background: '#ffdddd', color: '#a00', padding: 10, borderRadius: 6, marginBottom: 20 }}>
            <b>Error:</b> {error}
          </div>
        )}

        {activeTab === 'businesses' && (
          <div style={{ display: 'flex', gap: 30 }}>
            {/* Business List */}
            <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Businesses ({businesses.length})</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                {businesses.map(b => (
                  <div
                    key={b.id}
                    onClick={() => selectBusiness(b)}
                    style={{
                      padding: '12px',
                      margin: '8px 0',
                      backgroundColor: selected?.id === b.id ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: selected?.id === b.id ? '2px solid #2196f3' : '1px solid #dee2e6',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{b.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{b.address}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📞 {b.phone}</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => { setSelected(null); setForm({ name: '', address: '', phone: '' }); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%'
                }}
              >
                ➕ Add New Business
              </button>
            </div>

            {/* Business Form */}
            <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: '#2c3e50' }}>
                {selected ? 'Edit Business' : 'Add New Business'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Business Name</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleForm}
                      placeholder="Enter business name"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      onClick={() => startVoiceRecognition('name')}
                      disabled={isListening}
                      style={{
                        padding: '12px',
                        backgroundColor: isListening ? '#dc3545' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isListening ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      🎤
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleForm}
                      placeholder="Enter address"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      onClick={() => startVoiceRecognition('address')}
                      disabled={isListening}
                      style={{
                        padding: '12px',
                        backgroundColor: isListening ? '#dc3545' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isListening ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      🎤
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleForm}
                      placeholder="Enter phone number"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      onClick={() => startVoiceRecognition('phone')}
                      disabled={isListening}
                      style={{
                        padding: '12px',
                        backgroundColor: isListening ? '#dc3545' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isListening ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      🎤
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Latitude (Optional)</label>
                    <input
                      name="lat"
                      type="number"
                      step="any"
                      value={form.lat || ''}
                      onChange={handleForm}
                      placeholder="e.g., 37.7749"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Longitude (Optional)</label>
                    <input
                      name="lng"
                      type="number"
                      step="any"
                      value={form.lng || ''}
                      onChange={handleForm}
                      placeholder="e.g., -122.4194"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: error.startsWith('✅') ? '#d4edda' : '#f8d7da',
                    color: error.startsWith('✅') ? '#155724' : '#721c24',
                    border: `1px solid ${error.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
                    borderRadius: '6px',
                    marginBottom: '15px',
                    fontSize: '14px'
                  }}>
                    {error}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    onClick={saveBusiness}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      flex: 1
                    }}
                  >
                    {selected ? '💾 Save Changes' : '➕ Add Business'}
                  </button>
                  {selected && (
                    <>
                      <button 
                        onClick={() => deleteBusiness(selected.id)}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                      <button 
                        onClick={() => {
                          const newLat = prompt('Enter latitude (e.g., 40.7128):');
                          const newLng = prompt('Enter longitude (e.g., -74.0060):');
                          if (newLat && newLng) {
                            const api = getApi();
                            if (api) {
                              api.put(`/businesses/${selected.id}`, {
                                ...selected,
                                lat: parseFloat(newLat),
                                lng: parseFloat(newLng)
                              }).then(() => {
                                fetchBusinesses();
                                selectBusiness(selected);
                              });
                            }
                          }
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        📍 Add Coordinates
                      </button>
                      <button 
                        onClick={() => setShowAppointmentForm(true)}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        📅 Schedule Appointment
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'map' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Map View</h3>
            <div style={{ height: '500px', width: '100%' }}>
              <MapContainer
                center={[27.2939, -80.3503]} // Default to Port Saint Lucie, Florida
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {(() => {
                  console.log('All businesses:', businesses);
                  const businessesWithCoords = businesses.filter(b => b.lat && b.lng);
                  console.log('Businesses with coordinates:', businessesWithCoords);
                  return businessesWithCoords.map(b => (
                    <Marker key={b.id} position={[b.lat, b.lng]}>
                      <Popup>
                        <b>{b.name}</b>
                        <br />
                        {b.address}
                      </Popup>
                    </Marker>
                  ));
                })()}
              </MapContainer>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Appointment Calendar</h3>
              {selected && (
                <button
                  onClick={() => setShowAppointmentForm(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ➕ Schedule Appointment
                </button>
              )}
            </div>
            
            {!selected ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <h4>Select a business to view appointments</h4>
                <p>Choose a business from the Businesses tab to see their appointment calendar.</p>
              </div>
            ) : (
              <Calendar 
                selectedBusinessId={selected.id}
                onAppointmentClick={(appointment) => {
                  setSelectedAppointment(appointment);
                  // You can add appointment details modal here
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'tracking' && (
          <LocationTracker isLoggedIn={!!localStorage.getItem('token')} />
        )}

        {activeTab === 'route' && (
          <RoutePlanner isLoggedIn={isAuthenticated} />
        )}

        {/* Contacts Section */}
        {selected && activeTab === 'businesses' && (
          <div style={{ 
            marginTop: '30px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Contacts for {selected.name}</h3>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* Contact List */}
              <div style={{ flex: 1 }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                  {selected.contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      style={{
                        padding: '12px',
                        margin: '8px 0',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{contact.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>📋 {contact.title}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>📞 {contact.phone}</div>
                      {contact.email && (
                        <div style={{ fontSize: '12px', color: '#999' }}>📧 {contact.email}</div>
                      )}
                      <div style={{ marginTop: '8px' }}>
                        <button
                          onClick={() => editContact(contact)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ffc107',
                            color: '#212529',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '8px',
                            fontSize: '11px'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteContact(contact.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => { setEditingContact(null); setContactForm({ name: '', title: '', phone: '', email: '' }); }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    width: '100%'
                  }}
                >
                  👤 Add New Contact
                </button>
              </div>

              {/* Contact Form */}
              <div style={{ flex: 1 }}>
                <h4 style={{ marginTop: 0, color: '#2c3e50' }}>
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name</label>
                    <input
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactForm}
                      placeholder="Enter contact name"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Title</label>
                    <input
                      name="title"
                      value={contactForm.title}
                      onChange={handleContactForm}
                      placeholder="Enter job title"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone</label>
                    <input
                      name="phone"
                      value={contactForm.phone}
                      onChange={handleContactForm}
                      placeholder="Enter phone number"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                    <input
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactForm}
                      placeholder="Enter email address"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <button 
                    onClick={saveContact}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginTop: '10px'
                    }}
                  >
                    {editingContact ? '💾 Save Contact' : '➕ Add Contact'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Appointments Section */}
        {selected && activeTab === 'businesses' && (
          <div style={{ 
            marginTop: '30px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Recent Appointments for {selected.name}</h3>
              <button
                onClick={() => setActiveTab('calendar')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📅 View Full Calendar
              </button>
            </div>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {/* This will be populated by the Calendar component data */}
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                <p>Appointments will appear here when you schedule them.</p>
                <p>Click "View Full Calendar" to see all appointments.</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        {selected && activeTab === 'businesses' && (
          <div style={{ 
            marginTop: '30px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Notes for {selected.name}</h3>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {(selected.notes || []).map((note: any) => (
                <div
                  key={note.id}
                  style={{
                    padding: '15px',
                    margin: '10px 0',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    📅 {new Date(note.created_at).toLocaleString()}
                    {note.contact_name && (
                      <span style={{ marginLeft: '10px', color: '#007bff' }}>
                        👤 {note.contact_name} ({note.contact_title})
                      </span>
                    )}
                    {note.latitude && note.longitude && (
                      <span style={{ marginLeft: '10px', color: '#28a745' }}>
                        📍 Location: {note.latitude.toFixed(6)}, {note.longitude.toFixed(6)}
                        {note.location_accuracy && (
                          <span style={{ color: '#666' }}> (±{Math.round(note.location_accuracy)}m)</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '16px' }}>{note.note}</div>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => editNote(note)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px',
                        fontSize: '12px'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
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
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder={editingNote ? "Edit note..." : "Add a new note..."}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={startVoiceRecognitionForNote}
                  disabled={isListeningForNote}
                  style={{
                    padding: '12px',
                    backgroundColor: isListeningForNote ? '#dc3545' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isListeningForNote ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  🎤
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Related Contact (Optional)
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">No specific contact</option>
                  {selected.contacts.map((contact: any) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {editingNote ? (
                  <>
                    <button
                      onClick={saveNote}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      💾 Save Note
                    </button>
                    <button
                      onClick={() => { setEditingNote(null); setNoteText(''); setSelectedContactId(''); }}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => addNote(parseInt(selectedContactId))}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ➕ Add Note
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appointment Form Modal */}
        {showAppointmentForm && selected && (
          <AppointmentForm
            businessId={selected.id}
            contacts={selected.contacts || []}
            onAppointmentCreated={() => {
              setShowAppointmentForm(false);
              // Refresh calendar by changing activeTab and back
              setActiveTab('businesses');
              setTimeout(() => setActiveTab('calendar'), 100);
            }}
            onCancel={() => setShowAppointmentForm(false)}
          />
        )}
      </div>
    </div>
  );
}

export default CRM; 