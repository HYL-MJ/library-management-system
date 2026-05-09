import { useState } from 'react'

const API_BASE = '/api'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '' })
  const [loginForm, setLoginForm] = useState({ userName: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 登录
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!loginForm.userName || !loginForm.password) {
      setError('Please enter email and password')
      setLoading(false)
      return
    }

    if (!EMAIL_PATTERN.test(loginForm.userName)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: loginForm.userName, password: loginForm.password })
      })
      
      let data
      try {
        data = await res.json()
      } catch (parseError) {
        // If JSON parsing fails, create a basic error response
        data = { message: 'Invalid response from server' }
      }
      
      if (res.ok) {
        localStorage.setItem('token', data.data.token)
        onLoginSuccess({
          userId: data.data.userId,
          name: data.data.userName,
          role: data.data.role,
          email: loginForm.userName
        })
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    }
    setLoading(false)
  }

  // 注册
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required')
      setLoading(false)
      return
    }

    if (!EMAIL_PATTERN.test(form.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          studentId: form.studentId || undefined
        })
      })
      
      let data
      try {
        data = await res.json()
      } catch (parseError) {
        data = { message: 'Invalid response from server' }
      }
      
      if (res.ok) {
        // 注册成功后自动登录
        const loginRes = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: form.email, password: form.password })
        })
        
        let loginData
        try {
          loginData = await loginRes.json()
        } catch (loginParseError) {
          loginData = { message: 'Invalid response from server during login' }
        }
        
        if (loginRes.ok) {
          localStorage.setItem('token', loginData.data.token)
          onLoginSuccess({
            userId: loginData.data.userId,
            name: loginData.data.userName,
            role: loginData.data.role,
            email: form.email
          })
        } else {
          setError('Registered successfully but login failed: ' + loginData.message)
        }
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>📚 Library Management System</h1>
          <p>{isLogin ? 'Welcome back, please login to your account' : 'Create a new account to start your reading journey'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLogin ? (
          // Login Form
          <form onSubmit={handleLogin} className="login-form" noValidate>
            <input
              type="text"
              inputMode="email"
              placeholder="Email"
              value={loginForm.userName}
              onChange={(e) => setLoginForm({ ...loginForm, userName: e.target.value })}
              className="login-input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="login-input"
              required
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          // Register Form
          <form onSubmit={handleRegister} className="login-form" noValidate>
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="login-input"
              required
            />
            <input
              type="text"
              inputMode="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="login-input"
              required
            />
            <input
              type="password"
              placeholder="Password (at least 6 characters) *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="login-input"
              required
            />
            <input
              type="text"
              placeholder="Student ID (Optional)"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="login-input"
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div className="login-toggle">
          {isLogin ? (
            <p>Don't have an account? <button className="toggle-btn" onClick={() => { setIsLogin(false); setError('') }}>Register now</button></p>
          ) : (
            <p>Already have an account? <button className="toggle-btn" onClick={() => { setIsLogin(true); setError('') }}>Back to Login</button></p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
