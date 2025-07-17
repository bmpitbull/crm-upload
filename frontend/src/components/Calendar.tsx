import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';

interface Appointment {
  id: number;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  contact_name?: string;
  business_name?: string;
}

interface CalendarProps {
  selectedBusinessId?: number;
  onAppointmentClick?: (appointment: Appointment) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedBusinessId, onAppointmentClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Get current month's start and end dates
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Format dates for API
  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  useEffect(() => {
    if (selectedBusinessId) {
      fetchAppointments();
    }
  }, [selectedBusinessId, startDate, endDate]);

  const fetchAppointments = async () => {
    if (!selectedBusinessId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/appointments/date-range`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: startDate,
          end_date: endDate,
          business_id: selectedBusinessId
        }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateString);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Show HH:MM format
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#f44336';
      default: return '#2196F3';
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={previousMonth}>&lt;</button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={nextMonth}>&gt;</button>
      </div>
      
      {loading && <div className="loading">Loading appointments...</div>}
      
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        
        <div className="calendar-days">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day ${!day ? 'empty' : ''} ${day && isToday(day) ? 'today' : ''}`}
            >
              {day && (
                <>
                  <div className="day-number">{day.getDate()}</div>
                  <div className="appointments">
                    {getAppointmentsForDate(day).map(appointment => (
                      <div
                        key={appointment.id}
                        className="appointment-item"
                        style={{ borderLeftColor: getStatusColor(appointment.status) }}
                        onClick={() => onAppointmentClick?.(appointment)}
                      >
                        <div className="appointment-time">
                          {formatTime(appointment.appointment_time)}
                        </div>
                        <div className="appointment-title">
                          {appointment.title}
                        </div>
                        {appointment.contact_name && (
                          <div className="appointment-contact">
                            {appointment.contact_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 