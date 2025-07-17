import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debug, setDebug] = useState('');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebug('');
    try {
      setDebug('Sending login request...');
      const res = await axios.post('/users/login', { username, password });
      setDebug('Response: ' + JSON.stringify(res.data));
      if (res.data && res.data.token) {
        authLogin(res.data.token); // Use context login
        setDebug('Token stored, redirecting to /crm...');
        console.log('Login successful, redirecting to /crm');
        navigate('/crm', { replace: true });
      } else {
        setError('Login failed: No token returned by server.');
        setDebug('No token in response: ' + JSON.stringify(res.data));
      }
    } catch (err: any) {
      // Enhanced error handling
      let message = 'Login failed';
      if (err.response) {
        if (err.response.data && err.response.data.error) {
          message = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          message = err.response.data;
        } else {
          message = `Error: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setDebug('Error: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required autoComplete="username" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" />
        <button type="submit">Login</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {debug && <div style={{ color: 'blue', marginTop: 10, fontSize: '12px' }}>{debug}</div>}
      <div>Don't have an account? <a href="/register">Register</a></div>
    </div>
  );
};

export default Login; 