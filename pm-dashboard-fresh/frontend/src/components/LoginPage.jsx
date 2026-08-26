// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Shield, Crown } from 'lucide-react';
import apiService from '../services/apiService';
import logo from '../assets/logo.png';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'Team Member'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // LOGIN
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          setIsLoading(false);
          return;
        }

        const response = await apiService.login({
          email: formData.email,
          password: formData.password
        });

        if (response.success && response.user) {
            console.log('✅ Login successful:', response.user.name, 'as', response.user.role);
            console.log('🔄 Calling onLogin callback with user:', response.user);
            console.log('📡 onLogin function exists:', typeof onLogin);
            
            onLogin(response.user);
            
            console.log('✅ onLogin callback completed');
          } else {
            setError(response.error || 'Login failed');
          }

      } else {
        // REGISTRATION
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        // Combine first and last name for backend
        const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

        const response = await apiService.register({
          name: fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });

        if (response.success && response.user) {
          console.log('✅ Registration successful:', response.user.name, 'as', response.user.role);
          onLogin(response.user);
        } else {
          setError(response.error || 'Registration failed');
        }
      }

    } catch (error) {
      console.error('❌ Auth error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '.25rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        width: '200%',
        maxWidth: '500px'
      }}>
        {/* Logo and Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logo}
            alt="ERM Logo"
            style={{
              width: '300px',
              height: '200px',
              margin: '0 auto 1rem auto',
              display: 'block'
            }}
          />
          
          {/* Meeting Notes Requirement: Add tagline */}
          <p style={{
            fontSize: '1.25rem',
            color: '#9ca3af',
            margin: 0,
            fontStyle: 'italic'
          }}>
            Assess and develop your project capabilities across multiple frameworks
          </p>
        </div>

        {/* Auth Toggle Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '2rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '1rem',
          padding: '0.25rem'
        }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: isLogin ? 'white' : 'transparent',
              color: isLogin ? '#111827' : '#6b7280',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLogin ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: !isLogin ? 'white' : 'transparent',
              color: !isLogin ? '#111827' : '#6b7280',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: !isLogin ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Registration-only fields */}
          {!isLogin && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  First Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User 
                    size={18} 
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Last Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User 
                    size={18} 
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: !isLogin ? '1rem' : '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role selection for registration */}
          {!isLogin && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Choose Your Role
              </label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {/* Team Member Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'Team Member' ? '#eff6ff' : 'white',
                  borderColor: formData.role === 'Team Member' ? '#2563eb' : '#d1d5db'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="Team Member"
                    checked={formData.role === 'Team Member'}
                    onChange={handleInputChange}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <User size={18} style={{ marginRight: '0.5rem', color: '#6b7280' }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Team Member</div>
                    <div style={{ fontSize: '1rem', color: '#6b7280' }}>
                      Access to projects and personal development
                    </div>
                  </div>
                </label>

                {/* Project Manager Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'Project Manager' ? '#eff6ff' : 'white',
                  borderColor: formData.role === 'Project Manager' ? '#2563eb' : '#d1d5db'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="Project Manager"
                    checked={formData.role === 'Project Manager'}
                    onChange={handleInputChange}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <Shield size={18} style={{ marginRight: '0.5rem', color: '#6b7280' }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Project Manager</div>
                    <div style={{ fontSize: '1rem', color: '#6b7280' }}>
                      Team management and organizational oversight
                    </div>
                  </div>
                </label>

                {/* Executive Leader Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'Executive Leader' ? '#eff6ff' : 'white',
                  borderColor: formData.role === 'Executive Leader' ? '#2563eb' : '#d1d5db'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="Executive Leader"
                    checked={formData.role === 'Executive Leader'}
                    onChange={handleInputChange}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <Crown size={18} style={{ marginRight: '0.5rem', color: '#6b7280' }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Executive Leader</div>
                    <div style={{ fontSize: '1rem', color: '#6b7280' }}>
                      View all projects and update project managers without editing project details
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading ? '#9ca3af' : 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '0.875rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;