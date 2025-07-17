import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CRM from './pages/CRM';
import MapPage from './pages/Map';
import { AuthProvider, useAuth } from './AuthContext';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/crm" element={<PrivateRoute><CRM /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/crm" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App; 