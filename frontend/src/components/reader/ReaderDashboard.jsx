import { useState, useEffect } from 'react'

const API_BASE = '/api'

const ReaderDashboard = ({ user, stats, books, loans, currentPage, setCurrentPage, onRefreshStats }) => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchExecuted, setSearchExecuted] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookDetail, setBookDetail] = useState(null)
  const [borrowLoading, setBorrowLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // 图书列表分页状态
  const [allBooks, setAllBooks] = useState([])
  const [allBooksLoading, setAllBooksLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0 })

  // 历史借阅记录状态
  const [loanHistory, setLoanHistory] = useState([])
  const [loanHistoryLoading, setLoanHistoryLoading] = useState(false)
  const [loanHistoryPagination, setLoanHistoryPagination] = useState({ page: 1, size: 10, total: 0 })

  // 预约状态
  const [holds, setHolds] = useState([])
  const [holdsLoading, setHoldsLoading] = useState(false)
  const [holdStatusFilter, setHoldStatusFilter] = useState('')

  // 心愿单状态
  const [wishlist, setWishlist] = useState([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [wishlistPagination, setWishlistPagination] = useState({ page: 1, size: 10, total: 0 })

  // 罚款状态
  const [fines, setFines] = useState([])
  const [finesLoading, setFinesLoading] = useState(false)

  // 续借状态
  const [renewLoading, setRenewLoading] = useState(false)
  const [returnLoading, setReturnLoading] = useState(false)

  // 预约状态
  const [holdLoading, setHoldLoading] = useState(false)

  // 心愿单状态
  const [wishlistAddLoading, setWishlistAddLoading] = useState(false)

  // 评分状态
  const [ratingLoading, setRatingLoading] = useState(false)
  const [userRating, setUserRating] = useState(null)

  // 罚款支付状态
  const [payFineLoading, setPayFineLoading] = useState(false)

  // 个人中心状态
  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', studentId: '' })
  const [profileLoading, setProfileLoading] = useState(false)

  // 搜索筛选状态
  const [genreFilter, setGenreFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // 获取所有图书列表（分页）
  const fetchAllBooks = async (page = 1, size = 10) => {
    setAllBooksLoading(true)
    try {
      const res = await fetch(`${API_BASE}/books?page=${page}&size=${size}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setAllBooks(data.data?.list || [])
        setPagination({
          page: data.data?.page || page,
          size: data.data?.size || size,
          total: data.data?.total || 0
        })
      } else {
        showMessage('error', data.message || 'Failed to fetch book list')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setAllBooksLoading(false)
  }

  // 当进入图书页面时自动加载
  useEffect(() => {
    if (currentPage === 'books') {
      fetchAllBooks(pagination.page, pagination.size)
    }
  }, [currentPage])

  // Show message
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // Search books (1.3, 1.4, 2.3)
  const handleSearch = async (e) => {
    e.preventDefault()

    setSearchLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', '1')
      params.append('size', '10')
      if (searchKeyword.trim()) {
        params.append('keyword', searchKeyword.trim())
      }
      if (genreFilter) {
        params.append('genre', genreFilter)
      }
      if (languageFilter) {
        params.append('language', languageFilter)
      }
      if (availabilityFilter) {
        params.append('available', availabilityFilter)
      }
      if (sortBy) {
        params.append('sortBy', sortBy)
      }
      if (sortOrder) {
        params.append('sortOrder', sortOrder)
      }

      const res = await fetch(`${API_BASE}/books/filter?${params}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setSearchResults(data.data?.list || [])
        setSearchExecuted(true)
      } else {
        showMessage('error', data.message || 'Search failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setSearchLoading(false)
  }

  // 分页控制
  const handlePageChange = (newPage) => {
    if (newPage < 1) return
    const maxPage = Math.ceil(pagination.total / pagination.size)
    if (newPage > maxPage) return
    fetchAllBooks(newPage, pagination.size)
  }

  // View book detail (1.5)
  const handleViewDetail = async (bookId) => {
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setBookDetail(data.data)
        setSelectedBook(bookId)
        // Reset user rating for new book
        setUserRating(null)
        // Try to get user's rating for this book
        const token = localStorage.getItem('token')
        if (token) {
          // Assuming we can get user rating from book detail or separate endpoint
          // For now, we'll set it if available in book data
        }
      } else {
        showMessage('error', data.message || 'Failed to get book details')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
  }

  // Borrow book (1.9)
  const handleBorrow = async (bookId) => {
    setBorrowLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      showMessage('error', 'Please login first')
      setBorrowLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const errorMessage = data?.message || `HTTP error! status: ${res.status}`
        showMessage('error', errorMessage)
        return
      }

      if (data && data.code === 200) {
        showMessage('success', `Borrowed successfully! Due date: ${new Date(data.data.dueDate).toLocaleDateString('en-US')}`)
        onRefreshStats && onRefreshStats()
        // Refresh book detail
        if (bookDetail) handleViewDetail(bookId)
      } else {
        showMessage('error', data?.message || 'Borrow failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setBorrowLoading(false)
  }

  // Get profile (1.8)
  const fetchProfile = async () => {
    setProfileLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setProfile(data.data)
        setEditForm({ name: data.data.name, studentId: data.data.studentId || '' })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
    setProfileLoading(false)
  }

  // Fetch loan history
  const fetchLoanHistory = async (page = 1, size = 10) => {
    setLoanHistoryLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/loans/history?page=${page}&size=${size}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setLoanHistory(data.data?.list || [])
        setLoanHistoryPagination({
          page: data.data?.page || page,
          size: data.data?.size || size,
          total: data.data?.total || 0
        })
      } else {
        showMessage('error', data.message || 'Failed to fetch loan history')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setLoanHistoryLoading(false)
  }

  // Renew loan
  const handleRenew = async (loanId) => {
    setRenewLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/loans/${loanId}/renew`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', `Renewed successfully! New due date: ${new Date(data.data.dueDate).toLocaleDateString('en-US')}`)
        fetchLoanHistory(loanHistoryPagination.page, loanHistoryPagination.size)
        onRefreshStats && onRefreshStats()
      } else {
        showMessage('error', data.message || 'Renew failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setRenewLoading(false)
  }

  // Return loan
  const handleReturn = async (loanId) => {
    setReturnLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/loans/${loanId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', `Book returned successfully! ${data.data.fineAmount > 0 ? `Fine: $${data.data.fineAmount}` : ''}`)
        fetchLoanHistory(loanHistoryPagination.page, loanHistoryPagination.size)
        onRefreshStats && onRefreshStats()
      } else {
        showMessage('error', data.message || 'Return failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setReturnLoading(false)
  }

  // Fetch holds
  const fetchHolds = async (status = '') => {
    setHoldsLoading(true)
    const token = localStorage.getItem('token')
    const url = status ? `${API_BASE}/holds?status=${status}` : `${API_BASE}/holds`
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.code === 200) {
        setHolds(data.data?.list || [])
      } else {
        showMessage('error', data.message || 'Failed to fetch holds')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setHoldsLoading(false)
  }

  // Cancel hold
  const handleCancelHold = async (holdId) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/holds/${holdId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Hold cancelled successfully')
        fetchHolds(holdStatusFilter)
        onRefreshStats && onRefreshStats()
      } else {
        showMessage('error', data.message || 'Cancel failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
  }

  // Fetch wishlist
  const fetchWishlist = async (page = 1, size = 10) => {
    setWishlistLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/wishlist?page=${page}&size=${size}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setWishlist(data.data?.list || [])
        setWishlistPagination({
          page: data.data?.page || page,
          size: data.data?.size || size,
          total: data.data?.total || 0
        })
      } else {
        showMessage('error', data.message || 'Failed to fetch wishlist')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setWishlistLoading(false)
  }

  // Add to wishlist
  const handleAddToWishlist = async (bookId) => {
    setWishlistAddLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Added to wishlist successfully')
      } else {
        showMessage('error', data.message || 'Add to wishlist failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setWishlistAddLoading(false)
  }

  // Remove from wishlist
  const handleRemoveFromWishlist = async (wishlistId) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/wishlist/${wishlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Removed from wishlist successfully')
        fetchWishlist(wishlistPagination.page, wishlistPagination.size)
      } else {
        showMessage('error', data.message || 'Remove failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
  }

  // Rate book
  const handleRateBook = async (bookId, stars) => {
    setRatingLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stars })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Rating submitted successfully')
        setUserRating(stars)
        // Refresh book detail
        if (bookDetail) handleViewDetail(bookId)
      } else {
        showMessage('error', data.message || 'Rating failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setRatingLoading(false)
  }

  // Hold book
  const handleHoldBook = async (bookId) => {
    setHoldLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Book held successfully')
        onRefreshStats && onRefreshStats()
        // Refresh book detail
        if (bookDetail) handleViewDetail(bookId)
      } else {
        showMessage('error', data.message || 'Hold failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setHoldLoading(false)
  }

  // Fetch fines
  const fetchFines = async () => {
    setFinesLoading(true)
    const token = localStorage.getItem('token')
    try {
      // 只显示未交罚金的逾期记录
      const historyRes = await fetch(`${API_BASE}/loans/history?page=1&size=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const historyData = await historyRes.json()
      if (historyRes.ok) {
        const overdueUnpaidLoans = (historyData.data?.list || []).filter(loan => loan.status === 'Overdue' && loan.finePaid === false)
        setFines(overdueUnpaidLoans)
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setFinesLoading(false)
  }

  // Pay fine
  const handlePayFine = async (loanId) => {
    setPayFineLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/loans/${loanId}/pay-fine`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        showMessage('success', 'Fine paid successfully')
        fetchFines()
        onRefreshStats && onRefreshStats()
      } else {
        showMessage('error', data.message || 'Payment failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setPayFineLoading(false)
  }

  // Update profile (1.8)
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      showMessage('error', 'Name is required')
      return
    }

    setProfileLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (res.ok) {
        setProfile(data.data)
        setEditMode(false)
        showMessage('success', 'Profile updated successfully')
      } else {
        showMessage('error', data.message || 'Update failed')
      }
    } catch (err) {
      showMessage('error', 'Network error: ' + err.message)
    }
    setProfileLoading(false)
  }

  // Render Dashboard
  const renderDashboard = () => (
    <div className="content">
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Welcome, {user.name}!</h2>
          <p>Today is {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <div className="banner-icon">📚</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📖</div>
          <div className="stat-content">
            <h3>{stats.totalBooks}</h3>
            <p>Total Books</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <h3>{stats.availableBooks}</h3>
            <p>Available</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📋</div>
          <div className="stat-content">
            <h3>{stats.myLoans}</h3>
            <p>My Loans</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingHolds}</h3>
            <p>Pending Holds</p>
          </div>
        </div>
      </div>


      <div className="table-section">
        <h3>Recently Added Books</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Genre</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {books.slice(0, 5).map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.isbn}</td>
                <td>{book.genre}</td>
                <td>
                  <span className={`status-badge ${book.available ? 'success' : 'danger'}`}>
                    {book.available ? 'Available' : 'Borrowed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {books.length === 0 && <div className="no-data">No data available</div>}
      </div>
    </div>
  )

  // Render Books Search (1.3, 1.4, 1.5)
  const renderBooks = () => (
    <div className="content">
      <div className="page-header">
        <h2>📖 Books</h2>
      </div>

      {/* Search Form */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Enter title or author..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn" disabled={searchLoading}>
            {searchLoading ? 'Searching...' : '🔍 Search'}
          </button>
        </form>

        {/* Filters and Sort */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Genre:</label>
            <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
              <option value="">All Genres</option>
              <option value="Fiction">Fiction</option>
              <option value="Non-Fiction">Non-Fiction</option>
              <option value="Science">Science</option>
              <option value="History">History</option>
              <option value="Biography">Biography</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Language:</label>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
              <option value="">All Languages</option>
              <option value="English">English</option>
              <option value="Chinese">Chinese</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Availability:</label>
            <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
              <option value="">All</option>
              <option value="true">Available</option>
              <option value="false">Borrowed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Date Added</option>
              <option value="rating">Rating</option>
              <option value="title">Title</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Order:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Book Detail Modal */}
      {bookDetail && selectedBook && (
        <div className="modal-overlay book-detail-modal" onClick={() => { setSelectedBook(null); setBookDetail(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSelectedBook(null); setBookDetail(null); }}>×</button>
            <div className="book-detail">
              <div className="book-detail-info">
                <h3>{bookDetail.title}</h3>
                <p className="book-detail-author">Author: {bookDetail.author}</p>
                <div className="book-detail-grid">
                  <div className="book-detail-item"><strong>ISBN:</strong> {bookDetail.isbn}</div>
                  <div className="book-detail-item"><strong>Genre:</strong> {bookDetail.genre}</div>
                  <div className="book-detail-item"><strong>Language:</strong> {bookDetail.language}</div>
                  <div className="book-detail-item"><strong>Location:</strong> {bookDetail.shelfLocation || 'N/A'}</div>
                  <div className="book-detail-item"><strong>Available Copies:</strong> {bookDetail.availableCopies}</div>
                  <div className="book-detail-item">
                    <strong>Status:</strong>
                    <span className={`status-badge ${bookDetail.available ? 'success' : 'danger'}`}>
                      {bookDetail.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                  {bookDetail.averageRating && (
                    <div className="book-detail-item"><strong>Avg Rating:</strong> ⭐ {bookDetail.averageRating.toFixed(1)}</div>
                  )}
                  {bookDetail.description && (
                    <div className="book-detail-item book-detail-desc"><strong>Description:</strong> {bookDetail.description}</div>
                  )}
                </div>
                <div className="book-actions">
                  {bookDetail.available ? (
                    <button
                      className="borrow-btn"
                      onClick={() => handleBorrow(bookDetail.id)}
                      disabled={borrowLoading}
                    >
                      {borrowLoading ? 'Borrowing...' : '📖 Borrow Now'}
                    </button>
                  ) : (
                    <button
                      className="hold-btn"
                      onClick={() => handleHoldBook(bookDetail.id)}
                      disabled={holdLoading}
                    >
                      {holdLoading ? 'Holding...' : '⏳ Hold Book'}
                    </button>
                  )}
                  <button
                    className="wishlist-btn"
                    onClick={() => handleAddToWishlist(bookDetail.id)}
                    disabled={wishlistAddLoading}
                  >
                    {wishlistAddLoading ? 'Adding...' : '❤️ Add to Wishlist'}
                  </button>
                </div>

                {/* Rating Section */}
                <div className="rating-section">
                  <h4>Rate this book</h4>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className={`star-btn ${userRating >= star ? 'active' : ''}`}
                        onClick={() => handleRateBook(bookDetail.id, star)}
                        disabled={ratingLoading}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  {userRating && <p>Your rating: {userRating} stars</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results or All Books */}
      <div className="books-grid">
        {allBooksLoading || searchLoading ? (
          <div className="no-data">Loading...</div>
        ) : searchExecuted ? (
          searchResults.length > 0 ? (
            // 显示搜索结果
            searchResults.map((book) => (
              <div key={book.id} className="book-card">
                <div className="book-cover" onClick={() => handleViewDetail(book.id)}>📚</div>
                <div className="book-info">
                  <h3 onClick={() => handleViewDetail(book.id)} className="book-title-clickable">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  <p className="book-detail">ISBN: {book.isbn}</p>
                  <p className="book-detail">Genre: {book.genre}</p>
                  <div className="book-status">
                    <span className={`status-badge ${book.available ? 'success' : 'danger'}`}>
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                    {book.averageRating && <span className="rating">⭐ {book.averageRating.toFixed(1)}</span>}
                  </div>
                  {book.available && (
                    <button
                      className="borrow-btn"
                      onClick={() => handleBorrow(book.id)}
                      disabled={borrowLoading}
                    >
                      {borrowLoading ? 'Borrowing...' : 'Borrow'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No books found</div>
          )
        ) : allBooks.length > 0 ? (
          // 显示所有书籍（默认）
          allBooks.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-cover" onClick={() => handleViewDetail(book.id)}>📚</div>
              <div className="book-info">
                <h3 onClick={() => handleViewDetail(book.id)} className="book-title-clickable">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                <p className="book-detail">ISBN: {book.isbn}</p>
                <p className="book-detail">Genre: {book.genre}</p>
                <div className="book-status">
                  <span className={`status-badge ${book.available ? 'success' : 'danger'}`}>
                    {book.available ? 'Available' : 'Borrowed'}
                  </span>
                  {book.averageRating && <span className="rating">⭐ {book.averageRating.toFixed(1)}</span>}
                </div>
                {book.available && (
                  <button
                    className="borrow-btn"
                    onClick={() => handleBorrow(book.id)}
                    disabled={borrowLoading}
                  >
                    {borrowLoading ? 'Borrowing...' : 'Borrow'}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : searchKeyword && !searchLoading ? (
          <div className="no-data">No books found</div>
        ) : (
          <div className="no-data">No books available</div>
        )}
      </div>

      {/* Pagination */}
      {searchResults.length === 0 && allBooks.length > 0 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.size)}
          </span>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.size)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )

  // Render Loan History (4.3)
  const renderLoans = () => {
    if (!loanHistory.length && !loanHistoryLoading) {
      fetchLoanHistory()
    }

    return (
      <div className="content">
        <div className="page-header">
          <h2>📋 Loan History</h2>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Checkout Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Renewals</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loanHistoryLoading ? (
                <tr>
                  <td colSpan="8" className="no-data">Loading...</td>
                </tr>
              ) : loanHistory.length > 0 ? (
                loanHistory.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.bookTitle || 'Book unavailable'}</td>
                    <td>{loan.bookAuthor || 'N/A'}</td>
                    <td>{new Date(loan.checkoutDate).toLocaleDateString('en-US')}</td>
                    <td>{new Date(loan.dueDate).toLocaleDateString('en-US')}</td>
                    <td>{loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('en-US') : '-'}</td>
                    <td>{loan.renewalCount || 0}</td>
                    <td>
                      <span className={`status-badge ${
                        loan.status === 'Borrowing' ? 'success' : 
                        loan.status === 'Overdue' ? 'danger' : 'info'
                      }`}>
                        {loan.status === 'Borrowing' ? 'Borrowing' : 
                         loan.status === 'Overdue' ? 'Overdue' : 'Returned'}
                      </span>
                    </td>
                    <td>
                      {loan.status === 'Borrowing' && (loan.renewalCount || 0) < 1 && (
                        <button
                          className="action-btn renew-btn"
                          onClick={() => handleRenew(loan.id)}
                          disabled={renewLoading}
                        >
                          {renewLoading ? 'Renewing...' : 'Renew'}
                        </button>
                      )}
                      {(loan.status === 'Borrowing' || loan.status === 'Overdue') && (
                        <button
                          className="action-btn return-btn"
                          onClick={() => handleReturn(loan.id)}
                          disabled={returnLoading}
                          style={{ marginLeft: '8px' }}
                        >
                          {returnLoading ? 'Returning...' : 'Return'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No loan records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {loanHistory.length > 0 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => fetchLoanHistory(loanHistoryPagination.page - 1, loanHistoryPagination.size)}
              disabled={loanHistoryPagination.page <= 1}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {loanHistoryPagination.page} of {Math.ceil(loanHistoryPagination.total / loanHistoryPagination.size)}
            </span>
            <button
              className="pagination-btn"
              onClick={() => fetchLoanHistory(loanHistoryPagination.page + 1, loanHistoryPagination.size)}
              disabled={loanHistoryPagination.page >= Math.ceil(loanHistoryPagination.total / loanHistoryPagination.size)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render Holds (5.2)
  const renderHolds = () => {
    if (!holds.length && !holdsLoading) {
      fetchHolds()
    }

    return (
      <div className="content">
        <div className="page-header">
          <h2>⏳ My Holds</h2>
        </div>

        {/* Filter */}
        <div className="filter-section">
          <select
            value={holdStatusFilter}
            onChange={(e) => {
              setHoldStatusFilter(e.target.value)
              fetchHolds(e.target.value)
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="WAITING">Waiting</option>
            <option value="READY">Ready</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdsLoading ? (
                <tr>
                  <td colSpan="5" className="no-data">Loading...</td>
                </tr>
              ) : holds.length > 0 ? (
                holds.map((hold) => (
                  <tr key={hold.id}>
                    <td>{hold.bookTitle}</td>
                    <td>{hold.bookAuthor}</td>
                    <td>
                      <span className={`status-badge ${
                        hold.status === 'WAITING' ? 'warning' : 
                        hold.status === 'READY' ? 'success' : 
                        hold.status === 'FULFILLED' ? 'info' : 'danger'
                      }`}>
                        {hold.status === 'WAITING' ? 'Waiting' : 
                         hold.status === 'READY' ? 'Ready' : 
                         hold.status === 'FULFILLED' ? 'Fulfilled' : 'Cancelled'}
                      </span>
                    </td>
                    <td>{new Date(hold.createdAt).toLocaleDateString('en-US')}</td>
                    <td>
                      {(hold.status === 'WAITING' || hold.status === 'READY') && (
                        <button
                          className="action-btn cancel-btn"
                          onClick={() => handleCancelHold(hold.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">No holds found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Wishlist (6.2)
  const renderWishlist = () => {
    if (!wishlist.length && !wishlistLoading) {
      fetchWishlist(wishlistPagination.page, wishlistPagination.size)
    }

    return (
      <div className="content">
        <div className="page-header">
          <h2>❤️ My Wishlist</h2>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Added At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wishlistLoading ? (
                <tr>
                  <td colSpan="5" className="no-data">Loading...</td>
                </tr>
              ) : wishlist.length > 0 ? (
                wishlist.map((item) => (
                  <tr key={item.id}>
                    <td>{item.bookTitle}</td>
                    <td>{item.bookAuthor}</td>
                    <td>
                      <span className={`status-badge ${item.available ? 'success' : 'danger'}`}>
                        {item.available ? 'Available' : 'Borrowed'}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString('en-US')}</td>
                    <td>
                      <div className="wishlist-actions">
                        {item.available && (
                          <button
                            className="action-btn borrow-btn"
                            onClick={() => handleBorrow(item.bookId)}
                            disabled={borrowLoading}
                          >
                            {borrowLoading ? 'Borrowing...' : 'Borrow'}
                          </button>
                        )}
                        <button
                          className="action-btn remove-btn"
                          onClick={() => handleRemoveFromWishlist(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">No items in wishlist</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {wishlist.length > 0 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => fetchWishlist(wishlistPagination.page - 1, wishlistPagination.size)}
              disabled={wishlistPagination.page <= 1}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {wishlistPagination.page} of {Math.ceil(wishlistPagination.total / wishlistPagination.size)}
            </span>
            <button
              className="pagination-btn"
              onClick={() => fetchWishlist(wishlistPagination.page + 1, wishlistPagination.size)}
              disabled={wishlistPagination.page >= Math.ceil(wishlistPagination.total / wishlistPagination.size)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render Fines (7.1)
  const renderFines = () => {
    if (!fines.length && !finesLoading) {
      fetchFines()
    }

    return (
      <div className="content">
        <div className="page-header">
          <h2>💰 Outstanding Fines</h2>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Due Date</th>
                <th>Fine Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {finesLoading ? (
                <tr>
                  <td colSpan="5" className="no-data">Loading...</td>
                </tr>
              ) : fines.length > 0 ? (
                fines.map((fine) => (
                  <tr key={fine.id}>
                    <td>{fine.bookTitle || 'Book unavailable'}</td>
                    <td>{fine.bookAuthor || 'N/A'}</td>
                    <td>{new Date(fine.dueDate).toLocaleDateString('en-US')}</td>
                    <td>¥5.00</td>
                    <td>
                      <button
                        className="action-btn pay-btn"
                        onClick={() => handlePayFine(fine.id)}
                        disabled={payFineLoading}
                      >
                        {payFineLoading ? 'Paying...' : 'Pay Fine'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">No outstanding fines</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Profile (1.8)
  const renderProfile = () => {
    if (!profile && !profileLoading) {
      fetchProfile()
    }

    return (
      <div className="content">
        <div className="page-header">
          <h2>👤 My Profile</h2>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {profileLoading ? (
          <div className="loading">Loading...</div>
        ) : profile ? (
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">{profile.name[0].toUpperCase()}</div>
              <div className="profile-title">
                <h3>{profile.name}</h3>
                <p className="profile-role">Student</p>
              </div>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>✏️ Edit</button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="profile-form" noValidate>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="profile-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    value={editForm.studentId || ''}
                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                    className="profile-input"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : '💾 Save'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => {
                    setEditMode(false)
                    setEditForm({ name: profile.name, studentId: profile.studentId || '' })
                  }}>
                    ❌ Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-item">
                  <strong>Name:</strong> {profile.name}
                </div>
                <div className="info-item">
                  <strong>Email:</strong> {profile.email}</div>
                <div className="info-item">
                  <strong>Student ID:</strong> {profile.studentId || 'Not provided'}</div>
                <div className="info-item">
                  <strong>Role:</strong> Student</div>
                <div className="info-item">
                  <strong>Registered:</strong> {new Date(profile.createdAt).toLocaleDateString('en-US')}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-data">Unable to fetch profile</div>
        )}
      </div>
    )
  }

  switch (currentPage) {
    case 'dashboard':
      return renderDashboard()
    case 'books':
      return renderBooks()
    case 'loans':
      return renderLoans()
    case 'holds':
      return renderHolds()
    case 'wishlist':
      return renderWishlist()
    case 'fines':
      return renderFines()
    case 'profile':
      return renderProfile()
    default:
      return <div className="content"><div className="page-header"><h2>Feature under development...</h2></div></div>
  }
}

export default ReaderDashboard
