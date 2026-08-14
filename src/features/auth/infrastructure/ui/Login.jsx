import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPostLoginPath, normalizeUserForSession } from '../../../../shared/utils/userRoleHelpers';
import loginLogo from '../../../../assets/login.png';
import './Login.css';

export const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Por favor, ingresa tu usuario y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Error al iniciar sesión');
      }

      const normalized = normalizeUserForSession(data.data.user);
      onLogin(data.data.token, normalized);
      navigate(getPostLoginPath(normalized), { replace: true });
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    }
  };

  return (
    <div className="login-page-container">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="login-loading-overlay">
          <div className="loading-animation-container">
            <div className="loading-balloon-glow"></div>
            <div className="loading-ring"></div>
            <img src={loginLogo} alt="Loading Balloon" className="loading-balloon-img" />
            <p className="loading-text">Iniciando sesión...</p>
          </div>
        </div>
      )}

      {/* Floating background lights */}
      <div className="bg-blur-circle circle-1"></div>
      <div className="bg-blur-circle circle-2"></div>
      <div className="bg-blur-circle circle-3"></div>

      {/* Center card */}
      <div className="login-unified-card">

        {/* Left Side: Branding Panel (Filled with login.png) */}
        <div className="login-branding-panel" style={{ backgroundImage: `url(${loginLogo})` }} />

        {/* Right Side: Form Panel (White) */}
        <div className="login-form-panel">
          <div className="login-form-content">

            <div className="login-form-header">
              <button
                type="button"
                className="login-back-link"
                onClick={() => navigate('/')}
              >
                ← Volver al inicio
              </button>
              <img src={loginLogo} alt="Luxes Logo" className="login-mobile-logo" />
              <h2 className="login-form-title">Bienvenido</h2>
              <p className="login-form-subtitle">Inicia sesión para continuar</p>
            </div>

            <form className="login-form-element" onSubmit={handleSubmit}>
              {error && <div className="login-error-message">{error}</div>}
              <div className="login-form-group">
                <label className="login-input-label">Nombre de usuario</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="ej. MorquechoI"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input-field"
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-input-label">Contraseña</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input-field"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle-btn"
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn">Iniciar sesión</button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
};


