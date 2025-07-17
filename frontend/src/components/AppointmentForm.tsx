import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AppointmentForm.css';

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface AppointmentFormProps {
  businessId: number;
  contacts: Contact[];
  onAppointmentCreated: () => void;
  onCancel: () => void;
  selectedDate?: string;
  selectedTime?: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  businessId,
  contacts,
  onAppointmentCreated,
  onCancel,
  selectedDate,
  selectedTime
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(selectedDate || '');
  const [appointmentTime, setAppointmentTime] = useState(selectedTime || '');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [contactId, setContactId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Voice recognition for title
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!appointmentDate) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [appointmentDate]);

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        setError('');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTitle(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError('Voice recognition failed. Please type manually.');
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      setError('Voice recognition not supported in this browser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !appointmentDate || !appointmentTime) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/appointments', {
        business_id: businessId,
        contact_id: contactId || null,
        title,
        description,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        duration_minutes: durationMinutes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onAppointmentCreated();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      setError(error.response?.data?.error || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appointment-form-overlay">
      <div className="appointment-form">
        <h3>Schedule Appointment</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <div className="input-with-voice">
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter appointment title"
                required
              />
              <button
                type="button"
                onClick={startListening}
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                disabled={isListening}
              >
                {isListening ? '🎤' : '🎤'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter appointment details"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                id="date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time *</label>
              <input
                id="time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <select
                id="duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contact">Contact (optional)</label>
              <select
                id="contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">No contact</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm; 