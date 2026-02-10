import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Supplier from './pages/Supplier'
import Verify from './pages/Verify'
import Claims from './pages/Claims'
import Insurer from './pages/Insurer'

// Axios interceptor to attach JWT token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in (restore from localStorage)
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    navigate('/')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
  }

  // Not logged in: show login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  // Logged in: show role-based portal
  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">SupplyChain</div>
        <div className="nav-links">
          {user.role === 'SUPPLIER' && (
            <>
              <Link to="/">Submit Part</Link>
              <Link to="/verify">Verify</Link>
            </>
          )}
          {user.role === 'CONSUMER' && (
            <>
              <Link to="/">Verify</Link>
              <Link to="/claims">File Claim</Link>
            </>
          )}
          {user.role === 'INSURER' && (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/verify">Verify</Link>
            </>
          )}
        </div>
        <div className="nav-user">
          <span style={{ marginRight: 12 }}>{user.username} ({user.role})</span>
          <button onClick={handleLogout} style={{ padding: '6px 12px' }}>
            Logout
          </button>
        </div>
      </nav>

      <main className="main">
        <Routes>
          {user.role === 'SUPPLIER' && (
            <>
              <Route path="/" element={<Supplier />} />
              <Route path="/verify" element={<Verify />} />
            </>
          )}
          {user.role === 'CONSUMER' && (
            <>
              <Route path="/" element={<Verify />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/claims" element={<Claims />} />
            </>
          )}
          {user.role === 'INSURER' && (
            <>
              <Route path="/" element={<Insurer />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/insurer" element={<Insurer />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  )
}


