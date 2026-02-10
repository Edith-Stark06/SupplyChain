import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [activeTab, setActiveTab] = useState('login') // 'login' or 'register'
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    email: '',
    role: 'SUPPLIER', // SUPPLIER, CONSUMER, INSURER
    portalType: 'SUPPLIER'
  })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLoginChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleRegisterChange = e => {
    const { name, value } = e.target
    
    // When role changes, automatically set portalType to match
    if (name === 'role') {
      setRegisterForm(prev => ({ ...prev, role: value, portalType: value }))
    } else {
      setRegisterForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await axios.post('http://localhost:5000/auth/login', form)
      if (res.data && res.data.token) {
        // Save token to localStorage
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        setStatus('✔ Login successful!')
        setTimeout(() => {
          onLoginSuccess(res.data.user, res.data.token)
        }, 500)
      } else {
        setStatus('✖ Login failed: ' + (res.data.message || 'Unknown error'))
      }
    } catch (err) {
      setStatus('✖ Error: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await axios.post('http://localhost:5000/auth/register', registerForm)
      if (res.data && res.data.status === 'REGISTERED') {
        setStatus('✔ Registration successful! Please login with your credentials.')
        setTimeout(() => {
          setActiveTab('login')
          setRegisterForm({ username: '', password: '', email: '', role: 'SUPPLIER', portalType: 'SUPPLIER' })
        }, 1500)
      } else {
        setStatus('✖ Registration failed: ' + (res.data.message || 'Unknown error'))
      }
    } catch (err) {
      setStatus('✖ Error: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 style={{ textAlign: 'center', color: '#0b5ea8' }}>SupplyChain</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
          Aircraft Part Verification & Claims Management
        </p>

        <div className="login-tabs">
          <button
            className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        {activeTab === 'login' && (
          <div className="login-form">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleLoginChange}
              disabled={loading}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleLoginChange}
              disabled={loading}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin} disabled={loading} style={{ marginTop: 16 }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="login-form">
            <input
              type="text"
              name="username"
              placeholder="Username (unique)"
              value={registerForm.username}
              onChange={handleRegisterChange}
              disabled={loading}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={handleRegisterChange}
              disabled={loading}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={handleRegisterChange}
              disabled={loading}
            />
            <select
              name="role"
              value={registerForm.role}
              onChange={handleRegisterChange}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                margin: '8px 0',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="SUPPLIER">Supplier</option>
              <option value="CONSUMER">Consumer / Manufacturer</option>
              <option value="INSURER">Insurance Company</option>
            </select>
            <button onClick={handleRegister} disabled={loading} style={{ marginTop: 16 }}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        )}

        {status && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 4,
              backgroundColor: status.includes('✔') ? '#f1f8f5' : '#fef5f5',
              color: status.includes('✔') ? '#4caf50' : '#f44336',
              fontSize: 14,
              whiteSpace: 'pre-wrap'
            }}
          >
            {status}
          </div>
        )}


      </div>
    </div>
  )
}
