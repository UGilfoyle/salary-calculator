import { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, XCircle, AlertCircle, Clock, History, TrendingUp, Building2, Sparkles, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import UnderConstruction from './UnderConstruction';
import './AtsChecker.css';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, ''); // Remove trailing slashes
};

const API_BASE_URL = getApiBaseUrl();

interface AtsResult {
    score: number;
    suggestions: string[];
    strengths: string[];
    weaknesses: string[];
    keywordMatches: number;
    totalKeywords: number;
    fileSize: number;
    wordCount: number;
    remaining: number;
    resetAt: string;
    checkId?: string;
    companyComparisons?: {
        goldmanSachs: { score: number; match: string };
        google: { score: number; match: string };
        allCompanies?: Record<string, { score: number; match: string }>;
    };
    detailedAnalysis?: {
        keywordDensity: number;
        sectionCompleteness: number;
        actionVerbUsage: number;
        quantifiableResults: number;
        technicalSkills: number;
    };
    premiumFeatures?: {
        optimizedKeywords: string[];
        industrySpecificSuggestions: string[];
        resumeOptimizationTips: string[];
        missingKeywords: string[];
        keywordReplacements: Array<{ current: string; suggested: string; reason: string }>;
    };
}

interface AtsHistoryItem {
    id: string;
    score: number;
    wordCount: number;
    keywordMatches: number;
    createdAt: string;
    companyComparisons?: {
        goldmanSachs: { score: number; match: string };
        google: { score: number; match: string };
    };
}

export default function AtsChecker() {
    const { token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AtsResult | null>(null);
    const [usage, setUsage] = useState<{ remaining: number; resetAt: string } | null>(null);
    const [history, setHistory] = useState<AtsHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [resumeText, setResumeText] = useState<string>('');
    const [loadingPremium, setLoadingPremium] = useState(false);
    const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);
    const [showUnderConstruction, setShowUnderConstruction] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
            if (!allowedTypes.includes(selectedFile.type)) {
                setError('Only PDF and DOCX files are allowed');
                setFile(null);
                return;
            }

            // Validate file size (2MB)
            if (selectedFile.size > 2 * 1024 * 1024) {
                setError('File size must be less than 2MB');
                setFile(null);
                return;
            }

            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const checkUsage = async () => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/ats/usage`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setUsage(response.data);
        } catch (err) {
            console.error('Failed to fetch usage:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Store resume text for premium features
            const fileText = await file.text();
            setResumeText(fileText);

            const response = await axios.post<AtsResult>(
                `${API_BASE_URL}/api/ats/check`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setResult(response.data);
            setUsage({ remaining: response.data.remaining, resetAt: response.data.resetAt });
            loadHistory(); // Refresh history after new check
            // Get check ID from the latest history item after loading
            setTimeout(() => {
                if (history.length > 0) {
                    setCurrentCheckId(history[0].id);
                }
            }, 500);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError(err.response.data.message || 'You have reached the limit of 3 checks');
            } else if (err.response?.status === 400) {
                setError(err.response.data.message || 'Invalid file. Please check the file format and size.');
            } else {
                setError('Failed to check resume. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const response = await axios.get<AtsHistoryItem[]>(
                `${API_BASE_URL}/api/ats/history`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setHistory(response.data);
            // Set current check ID from latest history item
            if (response.data.length > 0 && !currentCheckId) {
                setCurrentCheckId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    // Load usage and history on mount
    useEffect(() => {
        if (token) {
            checkUsage();
            loadHistory();
        }
    }, [token]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#10b981'; // green
        if (score >= 60) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const handlePremiumUpgrade = async () => {
        if (!currentCheckId || !resumeText) {
            setError('Unable to process premium upgrade. Please check your resume again.');
            return;
        }

        setLoadingPremium(true);
        setError('');

        try {
            // Create Razorpay order
            const orderResponse = await axios.post(
                `${API_BASE_URL}/api/payment/create-order`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const { orderId, amount, key } = orderResponse.data;

            // Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                const options = {
                    key: key,
                    amount: amount,
                    currency: 'INR',
                    name: 'SalaryCalc',
                    description: 'ATS Resume Enhancement - Premium Features',
                    order_id: orderId,
                    handler: async function (response: any) {
                        // Verify payment
                        try {
                            await axios.post(
                                `${API_BASE_URL}/api/payment/verify`,
                                {
                                    orderId: response.razorpay_order_id,
                                    paymentId: response.razorpay_payment_id,
                                    signature: response.razorpay_signature,
                                },
                                {
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            // Get premium enhancements
                            const enhanceResponse = await axios.post(
                                `${API_BASE_URL}/api/ats/premium/enhance`,
                                {
                                    checkId: currentCheckId,
                                    resumeText: resumeText,
                                },
                                {
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            setResult(enhanceResponse.data);
                            setLoadingPremium(false);
                        } catch (err: any) {
                            setError(err.response?.data?.message || 'Failed to verify payment');
                            setLoadingPremium(false);
                        }
                    },
                    prefill: {
                        name: 'User',
                        email: '',
                        contact: '',
                    },
                    theme: {
                        color: '#111827',
                    },
                    modal: {
                        ondismiss: function () {
                            setLoadingPremium(false);
                        },
                    },
                };

                const razorpay = new window.Razorpay(options);
                razorpay.open();
            };
            document.body.appendChild(script);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to initiate payment');
            setLoadingPremium(false);
        }
    };

    return (
        <>
            {showUnderConstruction && (
                <UnderConstruction 
                    onClose={() => setShowUnderConstruction(false)}
                    title="Payment Gateway Under Construction"
                    message="We're working hard to bring you a seamless payment experience. Premium features will be available soon! Stay tuned for updates."
                />
            )}
            <div className="ats-checker">
            <div className="ats-header">
                <FileText size={24} />
                <div>
                    <h2>Resume ATS Checker</h2>
                    <p>Get your resume analyzed for ATS compatibility</p>
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="history-toggle-btn"
                    title="View History"
                >
                    <History size={20} />
                </button>
            </div>

            {usage && (
                <div className="usage-info">
                    <Clock size={16} />
                    <span>
                        {usage.remaining} check{usage.remaining !== 1 ? 's' : ''} remaining
                        {usage.remaining < 3 && (
                            <span className="reset-time">
                                {' '}
                                (resets {new Date(usage.resetAt).toLocaleString()})
                            </span>
                        )}
                    </span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="ats-form">
                <div className="file-upload-area">
                    <input
                        type="file"
                        id="resume-file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="file-input"
                    />
                    <label htmlFor="resume-file" className="file-label">
                        <Upload size={32} />
                        <div>
                            {file ? (
                                <>
                                    <strong>{file.name}</strong>
                                    <span className="file-size">({formatFileSize(file.size)})</span>
                                </>
                            ) : (
                                <>
                                    <strong>Click to upload</strong>
                                    <span>PDF or DOCX (max 2MB)</span>
                                </>
                            )}
                        </div>
                    </label>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <button type="submit" className="check-btn" disabled={loading || !file || (usage?.remaining === 0 || false)}>
                    {loading ? 'Analyzing...' : 'Check Resume'}
                </button>
            </form>

            <div className="ats-main-content">
                {showHistory && history.length > 0 && (
                    <div className="ats-history-sidebar">
                        <h3>Check History</h3>
                        <div className="ats-history-list">
                            {history.map((check) => (
                                <div
                                    key={check.id}
                                    className="ats-history-item"
                                    onClick={() => {
                                        // Load full result from history
                                        axios.get(`${API_BASE_URL}/api/ats/history/${check.id}`, {
                                            headers: { Authorization: `Bearer ${token}` },
                                        }).then(res => {
                                            const checkData = res.data;
                                            // Format the response to match AtsResult interface
                                            setResult({
                                                score: checkData.score,
                                                keywordMatches: checkData.keywordMatches,
                                                totalKeywords: checkData.totalKeywords,
                                                wordCount: checkData.wordCount,
                                                fileSize: checkData.fileSize,
                                                suggestions: checkData.suggestions || [],
                                                strengths: checkData.strengths || [],
                                                weaknesses: checkData.weaknesses || [],
                                                remaining: usage?.remaining || 0,
                                                resetAt: usage?.resetAt || '',
                                                companyComparisons: checkData.companyComparisons,
                                                detailedAnalysis: checkData.detailedAnalysis,
                                            });
                                            setShowHistory(false);
                                        }).catch(err => {
                                            console.error('Failed to load check:', err);
                                            setError('Failed to load check details');
                                        });
                                    }}
                                >
                                    <div className="ats-history-header">
                                        <span className="ats-history-score" style={{ color: getScoreColor(check.score) }}>
                                            {check.score}
                                        </span>
                                        <span className="ats-history-date">
                                            {new Date(check.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="ats-history-details">
                                        <span>{check.keywordMatches} keywords</span>
                                        <span>{check.wordCount} words</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="ats-content-wrapper">
                    {result && (
                        <div className="ats-result">
                            <div className="score-section">
                                <div className="score-circle" style={{ borderColor: getScoreColor(result.score) }}>
                                    <span className="score-value" style={{ color: getScoreColor(result.score) }}>
                                        {result.score}
                                    </span>
                                    <span className="score-label">ATS Score</span>
                                </div>
                                <div className="score-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Keywords Matched:</span>
                                        <span className="detail-value">
                                            {result.keywordMatches} / {result.totalKeywords}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Word Count:</span>
                                        <span className="detail-value">{result.wordCount}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">File Size:</span>
                                        <span className="detail-value">{formatFileSize(result.fileSize)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Company Comparisons */}
                            {result.companyComparisons && (
                                <div className="company-comparisons">
                                    <h3>
                                        <Building2 size={20} />
                                        Company Match Scores
                                        {!result.premiumFeatures && (
                                            <span className="premium-badge">Free - 2 Companies</span>
                                        )}
                                    </h3>
                                    <div className="company-cards">
                                        <div className="company-card">
                                            <div className="company-name">Goldman Sachs</div>
                                            <div className="company-score" style={{ color: getScoreColor(result.companyComparisons.goldmanSachs.score) }}>
                                                {result.companyComparisons.goldmanSachs.score}
                                            </div>
                                            <div className="company-match">{result.companyComparisons.goldmanSachs.match}</div>
                                        </div>
                                        <div className="company-card">
                                            <div className="company-name">Google</div>
                                            <div className="company-score" style={{ color: getScoreColor(result.companyComparisons.google.score) }}>
                                                {result.companyComparisons.google.score}
                                            </div>
                                            <div className="company-match">{result.companyComparisons.google.match}</div>
                                        </div>
                                        {/* Premium: Show all companies */}
                                        {result.premiumFeatures && result.companyComparisons.allCompanies && (
                                            <>
                                                {Object.entries(result.companyComparisons.allCompanies)
                                                    .filter(([company]) => company !== 'goldmanSachs' && company !== 'google')
                                                    .map(([company, data]) => (
                                                        <div key={company} className="company-card premium">
                                                            <div className="company-name">
                                                                {company.charAt(0).toUpperCase() + company.slice(1).replace(/([A-Z])/g, ' $1')}
                                                            </div>
                                                            <div className="company-score" style={{ color: getScoreColor(data.score) }}>
                                                                {data.score}
                                                            </div>
                                                            <div className="company-match">{data.match}</div>
                                                        </div>
                                                    ))}
                                            </>
                                        )}
                                    </div>
                                    {!result.premiumFeatures && (
                                        <div className="premium-upgrade-section">
                                            <div className="premium-info">
                                                <Sparkles size={24} />
                                                <div>
                                                    <h4>Unlock Premium Features</h4>
                                                    <p>Get scores for 8 top companies (Amazon, Microsoft, Meta, Apple, Netflix, Uber) + Advanced optimization tips</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handlePremiumUpgrade}
                                                className="premium-upgrade-btn"
                                                disabled={loadingPremium}
                                            >
                                                {loadingPremium ? 'Processing...' : (
                                                    <>
                                                        <Zap size={18} />
                                                        Upgrade for ₹99
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Detailed Analysis */}
                            {result.detailedAnalysis && (
                                <div className="detailed-analysis">
                                    <h3>
                                        <TrendingUp size={20} />
                                        Detailed Analysis
                                    </h3>
                                    <div className="analysis-grid">
                                        <div className="analysis-item">
                                            <span className="analysis-label">Keyword Density</span>
                                            <div className="analysis-bar">
                                                <div
                                                    className="analysis-bar-fill"
                                                    style={{ width: `${Math.min(result.detailedAnalysis.keywordDensity, 100)}%` }}
                                                />
                                            </div>
                                            <span className="analysis-value">{result.detailedAnalysis.keywordDensity.toFixed(1)} per 1000 words</span>
                                        </div>
                                        <div className="analysis-item">
                                            <span className="analysis-label">Section Completeness</span>
                                            <div className="analysis-bar">
                                                <div
                                                    className="analysis-bar-fill"
                                                    style={{ width: `${result.detailedAnalysis.sectionCompleteness}%` }}
                                                />
                                            </div>
                                            <span className="analysis-value">{result.detailedAnalysis.sectionCompleteness}%</span>
                                        </div>
                                        <div className="analysis-item">
                                            <span className="analysis-label">Action Verb Usage</span>
                                            <div className="analysis-bar">
                                                <div
                                                    className="analysis-bar-fill"
                                                    style={{ width: `${result.detailedAnalysis.actionVerbUsage}%` }}
                                                />
                                            </div>
                                            <span className="analysis-value">{result.detailedAnalysis.actionVerbUsage}%</span>
                                        </div>
                                        <div className="analysis-item">
                                            <span className="analysis-label">Quantifiable Results</span>
                                            <div className="analysis-bar">
                                                <div
                                                    className="analysis-bar-fill"
                                                    style={{ width: `${result.detailedAnalysis.quantifiableResults}%` }}
                                                />
                                            </div>
                                            <span className="analysis-value">{result.detailedAnalysis.quantifiableResults > 0 ? 'Present' : 'Missing'}</span>
                                        </div>
                                        <div className="analysis-item">
                                            <span className="analysis-label">Technical Skills</span>
                                            <div className="analysis-bar">
                                                <div
                                                    className="analysis-bar-fill"
                                                    style={{ width: `${result.detailedAnalysis.technicalSkills}%` }}
                                                />
                                            </div>
                                            <span className="analysis-value">{result.detailedAnalysis.technicalSkills}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result.strengths.length > 0 && (
                                <div className="strengths-section">
                                    <h3>
                                        <CheckCircle size={20} />
                                        Strengths
                                    </h3>
                                    <ul>
                                        {result.strengths.map((strength, idx) => (
                                            <li key={idx}>{strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.weaknesses.length > 0 && (
                                <div className="weaknesses-section">
                                    <h3>
                                        <XCircle size={20} />
                                        Areas for Improvement
                                    </h3>
                                    <ul>
                                        {result.weaknesses.map((weakness, idx) => (
                                            <li key={idx}>{weakness}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.suggestions.length > 0 && (
                                <div className="suggestions-section">
                                    <h3>
                                        <AlertCircle size={20} />
                                        Suggestions
                                    </h3>
                                    <ul>
                                        {result.suggestions.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="remaining-info">
                                <Clock size={16} />
                                <span>
                                    {result.remaining} check{result.remaining !== 1 ? 's' : ''} remaining
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

