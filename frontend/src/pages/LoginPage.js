import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, User } from 'lucide-react';
import api, { persistStoredAuth } from '../services/api';

function LoginPage({ setAuth }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await api.post('/admin/login', form);
      persistStoredAuth({ token: response.data.token, username: response.data.username });
      setAuth({ token: response.data.token, username: response.data.username });
      navigate(fromPath, { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrap">
      <section className="login-card">
        <h1>Admin Login</h1>
        <p className="muted-text">
          Admin access only. Students can browse materials without login.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-group" htmlFor="username">
            <span className="field-label">Username</span>
            <span className="input-wrap">
              <User size={16} />
              <input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
                required
              />
            </span>
          </label>

          <label className="field-group" htmlFor="password">
            <span className="field-label">Password</span>
            <span className="input-wrap">
              <LockKeyhole size={16} />
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                required
              />
            </span>
          </label>

          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Login'}
          </button>

          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
