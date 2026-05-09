import { useState, useEffect, useCallback } from 'react'
import './App.css'
import ReaderDashboard from './components/reader/ReaderDashboard'
import LibrarianDashboard from './components/librarian/LibrarianDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import LoginPage from './components/auth/LoginPage'

const API_BASE = '/api'

function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalBooks: 0, availableBooks: 0, myLoans: 0, pendingHolds: 0 })
  const [books, setBooks] = useState([])
  const [loans, setLoans] = useState([])

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const [booksRes, loansRes] = await Promise.all([
        fetch(`${API_BASE}/books`),
        token ? fetch(`${API_BASE}/loans/current`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) : Promise.resolve(null)
      ])
      const booksData = await booksRes.json()
      const totalBooks = booksData.data?.books?.length || booksData.books?.length || 0
      const availableBooks = (booksData.data?.books || booksData.books || []).filter(b => b.available).length

      let myLoans = 0
      if (loansRes && loansRes.ok) {
        const loansData = await loansRes.json()
        myLoans = loansData.data?.list?.length || 0
        setLoans(loansData.data?.list || [])
      }

      setStats({ totalBooks, availableBooks, myLoans, pendingHolds: 0 })
      setBooks(booksData.data?.books || booksData.books || [])
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  // 获取当前用户
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const result = await res.json()
        setUser(result.data)
        fetchStats()
      } else {
        localStorage.removeItem('token')
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      localStorage.removeItem('token')
    }
    setLoading(false)
  }, [fetchStats])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUser()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchUser])

  // 登录成功回调
  const handleLoginSuccess = (userData) => {
    setUser(userData)
    fetchStats()
  }

  // 登出
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    localStorage.removeItem('token')
    setUser(null)
    setStats({ totalBooks: 0, availableBooks: 0, myLoans: 0, pendingHolds: 0 })
    setBooks([])
    setLoans([])
    setCurrentPage('dashboard')
  }

  // Get role display name
  const getRoleName = (role) => {
    const roles = { 'ADMIN': 'Admin', 'LIBRARIAN': 'Librarian', 'STUDENT': 'Student' }
    return roles[role] || role
  }

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner">Loading...</div></div>
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  // STUDENT role - Reader features
  if (user.role === 'STUDENT') {
    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-menu">
            <div className="menu-item-header">📚 Library System</div>
            <div className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
              <span className="icon">🏠</span>
              <span>Home</span>
            </div>
            <div className={`menu-item ${currentPage === 'books' ? 'active' : ''}`} onClick={() => setCurrentPage('books')}>
              <span className="icon">📖</span>
              <span>Books</span>
            </div>
            <div className={`menu-item ${currentPage === 'loans' ? 'active' : ''}`} onClick={() => setCurrentPage('loans')}>
              <span className="icon">📋</span>
              <span>My Loans</span>
            </div>
            <div className={`menu-item ${currentPage === 'holds' ? 'active' : ''}`} onClick={() => setCurrentPage('holds')}>
              <span className="icon">⏳</span>
              <span>My Holds</span>
            </div>
            <div className={`menu-item ${currentPage === 'wishlist' ? 'active' : ''}`} onClick={() => setCurrentPage('wishlist')}>
              <span className="icon">❤️</span>
              <span>Wishlist</span>
            </div>
            <div className={`menu-item ${currentPage === 'fines' ? 'active' : ''}`} onClick={() => setCurrentPage('fines')}>
              <span className="icon">💰</span>
              <span>Pay Fines</span>
            </div>
            <div className={`menu-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPage('profile')}>
              <span className="icon">👤</span>
              <span>My Profile</span>
            </div>
          </nav>
          <div className="user-info">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{getRoleName(user.role)}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <header className="top-nav">
            <span className="breadcrumb">
              <span 
                onClick={() => setCurrentPage('dashboard')} 
                style={{ cursor: 'pointer', color: '#007bff' }}
              >
                {getPageName('dashboard')}
              </span> 
              / {getPageName(currentPage)}
            </span>
            <div className="top-user">
              <span className="top-user-name">{user.name}</span>
              <span className="role-badge">{getRoleName(user.role)}</span>
            </div>
          </header>
          <ReaderDashboard
            user={user}
            stats={stats}
            books={books}
            loans={loans}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onRefreshStats={fetchStats}
          />
        </main>
      </div>
    )
  }

  // LIBRARIAN role
  if (user.role === 'LIBRARIAN') {
    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-menu">
            <div className="menu-item-header">📚 Library System</div>
            <div className={`menu-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
              <span className="icon">🏠</span>
              <span>Dashboard</span>
            </div>
            <div className={`menu-item ${currentPage === 'books' ? 'active' : ''}`} onClick={() => setCurrentPage('books')}>
              <span className="icon">📖</span>
              <span>Books</span>
            </div>
            <div className={`menu-item ${currentPage === 'manage' ? 'active' : ''}`} onClick={() => setCurrentPage('manage')}>
              <span className="icon">⚙️</span>
              <span>Manage Books</span>
            </div>
            <div className={`menu-item ${currentPage === 'loans-manage' ? 'active' : ''}`} onClick={() => setCurrentPage('loans-manage')}>
              <span className="icon">🔄</span>
              <span>Loan Management</span>
            </div>
            <div className={`menu-item ${currentPage === 'holds-manage' ? 'active' : ''}`} onClick={() => setCurrentPage('holds-manage')}>
              <span className="icon">🗂️</span>
              <span>Hold Management</span>
            </div>
            <div className={`menu-item ${currentPage === 'scanner' ? 'active' : ''}`} onClick={() => setCurrentPage('scanner')}>
              <span className="icon">📷</span>
              <span>Book Scanner</span>
            </div>
          </nav>
          <div className="user-info">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{getRoleName(user.role)}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <header className="top-nav">
            <span className="breadcrumb">
              <span 
                onClick={() => setCurrentPage('dashboard')} 
                style={{ cursor: 'pointer', color: '#007bff' }}
              >
                {getPageName('dashboard')}
              </span> 
              / {getPageName(currentPage)}
            </span>
            <div className="top-user">
              <span className="top-user-name">{user.name}</span>
              <span className="role-badge">{getRoleName(user.role)}</span>
            </div>
          </header>
          <LibrarianDashboard
            user={user}
            stats={stats}
            books={books}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </main>
      </div>
    )
  }

  if (user.role === 'ADMIN') {
    return (
      <AdminDashboard
        user={user}
        handleLogout={handleLogout}
        getRoleName={getRoleName}
      />
    )
  }

  // Other roles - show under development message
  return (
    <div className="dashboard-container">
      <div className="content">
        <div className="page-header">
          <h2>Feature Under Development</h2>
          <p>This feature is not yet available for your role</p>
        </div>
        <button className="logout-btn" onClick={handleLogout} style={{ marginTop: '20px' }}>Logout</button>
      </div>
    </div>
  )
}

function getPageName(page) {
  const names = {
    'dashboard': 'Dashboard',
    'books': 'Books',
    'loans': 'My Loans',
    'holds': 'My Holds',
    'wishlist': 'Wishlist',
    'fines': 'Pay Fines',
    'profile': 'My Profile',
    'manage': 'Manage Books',
    'loans-manage': 'Loan Management',
    'holds-manage': 'Hold Management',
    'scanner': 'Book Scanner'
  }
  return names[page] || 'Unknown'
}

export default App
