import { useState, useEffect } from 'react'
import { Calculator, MapPin, DollarSign, TrendingUp, Shield, LogOut, History, Building2, Plane, BarChart3, X, FileText } from 'lucide-react'
import axios from 'axios'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import AtsChecker from './components/AtsChecker'
import './App.css'

const getApiBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

const API_BASE_URL = getApiBaseUrl()

interface SalaryData {
  ctc: string
  city: string
  company: string
  isRelocation: boolean
  relocationAllowance: string
  githubProfile: string
  linkedinProfile: string
  offerInHand: string
  variablePay: string
  insurance: string
}

interface SalaryBreakdown {
  ctc: number
  fixedCtc: number
  variablePay: number
  insurance: number
  relocationAllowance?: number
  basicSalary: number
  hra: number
  specialAllowance: number
  pf: number
  esi: number
  professionalTax: number
  incomeTax: number
  inHandSalary: number
  monthlyDeductions: number
  annualDeductions: number
  company?: string
  isRelocation?: boolean
}

function App() {
  const { user, token, login, logout, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState<SalaryData>({
    ctc: '',
    city: '',
    company: '',
    isRelocation: false,
    relocationAllowance: '',
    githubProfile: '',
    linkedinProfile: '',
    offerInHand: '',
    variablePay: '',
    insurance: ''
  })
  const [result, setResult] = useState<SalaryBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<'salary' | 'ats' | 'admin'>('salary')
  const [showResultModal, setShowResultModal] = useState(false)

  // Handle auth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get('token')
    const userParam = urlParams.get('user')

    if (tokenParam && userParam) {
      login(tokenParam, JSON.parse(decodeURIComponent(userParam)))
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [login])

  // Load history when user is authenticated
  useEffect(() => {
    if (user && token) {
      loadHistory()
    }
  }, [user, token])

  // Setup axios interceptor for auth token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    return () => {
      axios.interceptors.request.eject(interceptor)
    }
  }, [token])

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/salary/history`)
      setHistory(response.data)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const indianCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
    'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna',
    'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const ctc = parseFloat(formData.ctc)
      if (!ctc || ctc <= 0) {
        throw new Error('Please enter a valid CTC amount')
      }
      if (!formData.city) {
        throw new Error('Please select a city')
      }

      const variablePay = formData.variablePay ? parseFloat(formData.variablePay) : 0
      const insurance = formData.insurance ? parseFloat(formData.insurance) : 0
      const relocationAllowance = formData.isRelocation && formData.relocationAllowance ? parseFloat(formData.relocationAllowance) : 0

      if (variablePay < 0 || insurance < 0 || relocationAllowance < 0) {
        throw new Error('Variable pay, insurance, and relocation allowance cannot be negative')
      }

      if (variablePay + insurance + relocationAllowance > ctc) {
        throw new Error('Variable pay + Insurance + Relocation Allowance cannot exceed total CTC')
      }

      const response = await axios.post(`${API_BASE_URL}/api/salary/calculate`, {
        ctc,
        city: formData.city,
        company: formData.company || undefined,
        isRelocation: formData.isRelocation,
        relocationAllowance: relocationAllowance > 0 ? relocationAllowance : undefined,
        githubProfile: formData.githubProfile || undefined,
        linkedinProfile: formData.linkedinProfile || undefined,
        offerInHand: formData.offerInHand ? parseFloat(formData.offerInHand) : undefined,
        variablePay: variablePay > 0 ? variablePay : undefined,
        insurance: insurance > 0 ? insurance : undefined,
      })

      setResult(response.data)
      setShowResultModal(true)
      loadHistory() // Refresh history
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Please log in to calculate salary')
          logout()
        } else {
          setError(err.response?.data?.message || 'Failed to calculate salary. Please try again.')
        }
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app">
      <div className="container">
        {/* Header with User Profile */}
        <header className="header">
          <div className="header-top">
            <div className="header-content">
              <Calculator className="header-icon" size={32} />
              <div>
                <h1>SalaryCalc</h1>
                <p className="subtitle">Calculate your in-hand salary</p>
              </div>
            </div>
            <div className="user-menu">
              <div className="user-info">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt={user.displayName} className="user-avatar" />
                )}
                <span className="user-name">{user.displayName || user.username}</span>
              </div>
              <button onClick={() => setShowHistory(!showHistory)} className="icon-btn" title="History">
                <History size={20} />
              </button>
              <button onClick={logout} className="icon-btn" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <Calculator size={20} />
            Salary Calculator
          </button>
          <button
            className={`tab-btn ${activeTab === 'ats' ? 'active' : ''}`}
            onClick={() => setActiveTab('ats')}
          >
            <FileText size={20} />
            Resume ATS Checker
          </button>
          {(user.role === 'admin' || user.isAdmin === true) && (
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              title="Admin Dashboard"
            >
              <BarChart3 size={20} />
              Admin Dashboard
            </button>
          )}
        </div>

        <div className="main-content">
          {activeTab === 'salary' ? (
            <>
              {/* History Sidebar */}
              {showHistory && (
                <div className="history-sidebar">
                  <h3>Your Calculations</h3>
                  {history.length === 0 ? (
                    <p className="no-history">No calculations yet. Start calculating!</p>
                  ) : (
                    <div className="history-list">
                      {history.map((calc) => (
                        <div key={calc.id} className="history-item" onClick={() => {
                          setResult({
                            ctc: parseFloat(calc.ctc),
                            fixedCtc: parseFloat(calc.fixedCtc),
                            variablePay: parseFloat(calc.variablePay || '0'),
                            insurance: parseFloat(calc.insurance || '0'),
                            basicSalary: parseFloat(calc.basicSalary),
                            hra: parseFloat(calc.hra),
                            specialAllowance: parseFloat(calc.specialAllowance),
                            pf: parseFloat(calc.pf),
                            esi: parseFloat(calc.esi),
                            professionalTax: parseFloat(calc.professionalTax),
                            incomeTax: parseFloat(calc.incomeTax),
                            inHandSalary: parseFloat(calc.inHandSalary),
                            monthlyDeductions: parseFloat(calc.monthlyDeductions),
                            annualDeductions: parseFloat(calc.annualDeductions),
                            relocationAllowance: calc.relocationAllowance ? parseFloat(calc.relocationAllowance) : undefined,
                            company: calc.company || undefined,
                            isRelocation: calc.isRelocation || undefined,
                          })
                          setShowResultModal(true)
                          setShowHistory(false)
                        }}>
                          <div className="history-item-header">
                            <span className="history-ctc">₹{parseFloat(calc.ctc).toLocaleString('en-IN')}</span>
                            <span className="history-city">{calc.city}</span>
                          </div>
                          <div className="history-item-details">
                            <span>In-hand: ₹{parseFloat(calc.inHandSalary).toLocaleString('en-IN')}</span>
                            <span className="history-date">
                              {new Date(calc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="content-wrapper centered">
                <form onSubmit={handleSubmit} className="form-card">
                  <div className="form-section">
                    <label htmlFor="ctc">
                      <DollarSign size={20} />
                      CTC (Cost to Company) *
                    </label>
                    <input
                      id="ctc"
                      type="number"
                      placeholder="Enter your annual CTC"
                      value={formData.ctc}
                      onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-section">
                    <label htmlFor="city">
                      <MapPin size={20} />
                      City *
                    </label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    >
                      <option value="">Select your city</option>
                      {indianCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-section">
                    <label htmlFor="company">
                      <Building2 size={20} />
                      Company (Optional)
                    </label>
                    <input
                      id="company"
                      type="text"
                      placeholder="Enter company name (e.g., Google, Microsoft)"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      Company-specific calculations may apply
                    </small>
                  </div>

                  <div className="form-section">
                    <label htmlFor="isRelocation" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        id="isRelocation"
                        type="checkbox"
                        checked={formData.isRelocation}
                        onChange={(e) => setFormData({ ...formData, isRelocation: e.target.checked, relocationAllowance: e.target.checked ? formData.relocationAllowance : '' })}
                        style={{ width: 'auto', cursor: 'pointer' }}
                      />
                      <Plane size={20} />
                      <span>Relocation Package</span>
                    </label>
                    {formData.isRelocation && (
                      <input
                        id="relocationAllowance"
                        type="number"
                        placeholder="Enter relocation allowance (e.g., 50000)"
                        value={formData.relocationAllowance}
                        onChange={(e) => setFormData({ ...formData, relocationAllowance: e.target.value })}
                        style={{ marginTop: '0.5rem' }}
                      />
                    )}
                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      One-time relocation allowance (part of CTC, not monthly salary)
                    </small>
                  </div>

                  <div className="form-section">
                    <label htmlFor="variablePay">
                      <TrendingUp size={20} />
                      Variable Pay (Annual, Optional)
                    </label>
                    <input
                      id="variablePay"
                      type="number"
                      placeholder="Enter variable pay/bonus (e.g., 50000)"
                      value={formData.variablePay}
                      onChange={(e) => setFormData({ ...formData, variablePay: e.target.value })}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      Part of CTC but not included in monthly salary
                    </small>
                  </div>

                  <div className="form-section">
                    <label htmlFor="insurance">
                      <Shield size={20} />
                      Insurance (Annual, Optional)
                    </label>
                    <input
                      id="insurance"
                      type="number"
                      placeholder="Enter insurance premium (e.g., 15000)"
                      value={formData.insurance}
                      onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      Health/Life insurance premiums (part of CTC, not monthly salary)
                    </small>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Salary'}
                  </button>
                </form>
              </div>
            </>
          ) : activeTab === 'ats' ? (
            <div className="content-wrapper centered">
              <AtsChecker />
            </div>
          ) : activeTab === 'admin' ? (
            <div className="content-wrapper">
              <AdminDashboard />
            </div>
          ) : null}
        </div>

        {/* Result Modal */}
        {showResultModal && result && (
          <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Salary Breakdown</h2>
                <button className="modal-close-btn" onClick={() => setShowResultModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="result-grid">
                <div className="result-item highlight">
                  <span className="label">In-Hand Salary (Monthly)</span>
                  <span className="value">₹{result.inHandSalary.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item">
                  <span className="label">Total Annual CTC</span>
                  <span className="value">₹{result.ctc.toLocaleString('en-IN')}</span>
                </div>

                <div className="result-item">
                  <span className="label">Fixed CTC (Annual)</span>
                  <span className="value">₹{result.fixedCtc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                {result.variablePay > 0 && (
                  <div className="result-item" style={{ opacity: 0.8 }}>
                    <span className="label">Variable Pay (Annual)</span>
                    <span className="value">₹{result.variablePay.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {result.insurance > 0 && (
                  <div className="result-item" style={{ opacity: 0.8 }}>
                    <span className="label">Insurance (Annual)</span>
                    <span className="value">₹{result.insurance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {result.relocationAllowance && result.relocationAllowance > 0 && (
                  <div className="result-item" style={{ opacity: 0.8 }}>
                    <span className="label">Relocation Allowance (One-time)</span>
                    <span className="value">₹{result.relocationAllowance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {result.company && (
                  <div className="result-item" style={{ opacity: 0.9 }}>
                    <span className="label">Company</span>
                    <span className="value">{result.company}</span>
                  </div>
                )}

                <div className="result-item">
                  <span className="label">Basic Salary (Monthly)</span>
                  <span className="value">₹{result.basicSalary.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item">
                  <span className="label">HRA (Monthly)</span>
                  <span className="value">₹{result.hra.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item">
                  <span className="label">Special Allowance (Monthly)</span>
                  <span className="value">₹{result.specialAllowance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item deduction">
                  <span className="label">EPF (Monthly)</span>
                  <span className="value">-₹{result.pf.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item deduction">
                  <span className="label">ESI (Monthly)</span>
                  <span className="value">-₹{result.esi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item deduction">
                  <span className="label">Professional Tax (Monthly)</span>
                  <span className="value">-₹{result.professionalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item deduction">
                  <span className="label">Income Tax (Monthly)</span>
                  <span className="value">-₹{result.incomeTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item total-deduction">
                  <span className="label">Total Monthly Deductions</span>
                  <span className="value">-₹{result.monthlyDeductions.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="result-item total-deduction">
                  <span className="label">Total Annual Deductions</span>
                  <span className="value">-₹{result.annualDeductions.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="disclaimer-message">
                <p>⚠️ <strong>Disclaimer:</strong> These calculations are estimates and may not be 100% accurate. There can be up to a 10% variance from actual salary calculations due to company-specific policies, tax exemptions, and other factors.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
