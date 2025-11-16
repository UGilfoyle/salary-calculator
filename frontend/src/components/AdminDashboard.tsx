import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, DollarSign, FileText, BarChart3, 
  UserCheck, UserX, Shield, Search, Edit, Trash2, 
  Calendar, ArrowUp, RefreshCw 
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const getApiBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

interface Statistics {
  users: {
    total: number;
    active: number;
    admins: number;
    regular: number;
    registeredThisMonth: number;
    registeredThisWeek: number;
    registeredToday: number;
  };
  salary: {
    totalCalculations: number;
    averageCtc: number;
    minCtc: number;
    maxCtc: number;
    averageInHand: number;
    salaryRanges: { range: string; count: number }[];
    topCities: { city: string; count: number }[];
    calculationsThisMonth: number;
    calculationsThisWeek: number;
  };
  ats: {
    totalChecks: number;
    averageScore: number;
    checksThisMonth: number;
    checksThisWeek: number;
    premiumUpgrades: number;
  };
  payments: {
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    pendingPayments: number;
    revenueThisMonth: number;
    revenueThisWeek: number;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  stats?: {
    calculationsCount: number;
    atsChecksCount: number;
    paymentsCount: number;
  };
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatistics(response.data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page: number = 1, search?: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadStatistics();
      if (activeTab === 'users') {
        loadUsers();
      }
    }
  }, [token, activeTab]);

  const handleUpdateUser = async (userId: string, updates: { role?: string; isActive?: boolean }) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadUsers(currentPage, searchQuery);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadUsers(currentPage, searchQuery);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    loadUsers(1, query);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <Shield size={32} />
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage your application and view statistics</p>
          </div>
        </div>
        <button onClick={loadStatistics} className="refresh-btn">
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={20} />
          Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('users');
            loadUsers();
          }}
        >
          <Users size={20} />
          Users
        </button>
      </div>

      {activeTab === 'overview' && statistics && (
        <div className="admin-overview">
          {/* User Statistics */}
          <div className="stats-section">
            <h2>
              <Users size={24} />
              User Statistics
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#667eea' }}>
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.total}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <UserCheck size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.active}</div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b' }}>
                  <Shield size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.admins}</div>
                  <div className="stat-label">Admins</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#3b82f6' }}>
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.regular}</div>
                  <div className="stat-label">Regular Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#8b5cf6' }}>
                  <Calendar size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.registeredThisMonth}</div>
                  <div className="stat-label">This Month</div>
                  <div className="stat-trend">
                    <ArrowUp size={14} />
                    {statistics.users.registeredThisWeek} this week
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ec4899' }}>
                  <Calendar size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users.registeredToday}</div>
                  <div className="stat-label">Today</div>
                </div>
              </div>
            </div>
          </div>

          {/* Salary Statistics */}
          <div className="stats-section">
            <h2>
              <DollarSign size={24} />
              Salary Statistics
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <BarChart3 size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.salary.totalCalculations}</div>
                  <div className="stat-label">Total Calculations</div>
                  <div className="stat-trend">
                    {statistics.salary.calculationsThisMonth} this month
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#3b82f6' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{statistics.salary.averageCtc.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Average CTC</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{statistics.salary.averageInHand.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Avg In-Hand</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ef4444' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{statistics.salary.minCtc.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Min CTC</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{statistics.salary.maxCtc.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Max CTC</div>
                </div>
              </div>
            </div>

            {/* Salary Ranges Chart */}
            <div className="chart-section">
              <h3>Salary Distribution</h3>
              <div className="salary-ranges">
                {statistics.salary.salaryRanges.map((range) => (
                  <div key={range.range} className="range-item">
                    <div className="range-label">{range.range}</div>
                    <div className="range-bar">
                      <div
                        className="range-fill"
                        style={{
                          width: `${(range.count / statistics.salary.totalCalculations) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="range-count">{range.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Cities */}
            <div className="chart-section">
              <h3>Top Cities</h3>
              <div className="top-cities">
                {statistics.salary.topCities.map((city, idx) => (
                  <div key={city.city} className="city-item">
                    <span className="city-rank">#{idx + 1}</span>
                    <span className="city-name">{city.city}</span>
                    <span className="city-count">{city.count} calculations</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ATS Statistics */}
          <div className="stats-section">
            <h2>
              <FileText size={24} />
              ATS Statistics
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#667eea' }}>
                  <FileText size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.ats.totalChecks}</div>
                  <div className="stat-label">Total Checks</div>
                  <div className="stat-trend">
                    {statistics.ats.checksThisMonth} this month
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.ats.averageScore}</div>
                  <div className="stat-label">Average Score</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b' }}>
                  <Shield size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.ats.premiumUpgrades}</div>
                  <div className="stat-label">Premium Upgrades</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Statistics */}
          <div className="stats-section">
            <h2>
              <DollarSign size={24} />
              Payment Statistics
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{statistics.payments.totalRevenue.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-trend">
                    ₹{statistics.payments.revenueThisMonth.toLocaleString('en-IN')} this month
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#3b82f6' }}>
                  <BarChart3 size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.payments.totalTransactions}</div>
                  <div className="stat-label">Total Transactions</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}>
                  <UserCheck size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.payments.successfulPayments}</div>
                  <div className="stat-label">Successful</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b' }}>
                  <Calendar size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.payments.pendingPayments}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-users">
          <div className="users-header">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="loading-container">
              <div className="loader"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <>
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Calculations</th>
                      <th>ATS Checks</th>
                      <th>Payments</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-small">
                              {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="user-name">{user.displayName || user.username}</div>
                              <div className="user-username">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.email || 'N/A'}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role === 'admin' ? <Shield size={14} /> : <Users size={14} />}
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                            {user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{user.stats?.calculationsCount || 0}</td>
                        <td>{user.stats?.atsChecksCount || 0}</td>
                        <td>{user.stats?.paymentsCount || 0}</td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleUpdateUser(user.id, { 
                                role: user.role === 'admin' ? 'user' : 'admin' 
                              })}
                              className="action-btn edit"
                              title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdateUser(user.id, { 
                                isActive: !user.isActive 
                              })}
                              className="action-btn"
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="action-btn delete"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      loadUsers(newPage, searchQuery);
                    }}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      loadUsers(newPage, searchQuery);
                    }}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

