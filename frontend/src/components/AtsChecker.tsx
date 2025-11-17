import { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle, X, AlertCircle, TrendingUp, Star, Lock, Sparkles, Building2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import UPIPayment from './UPIPayment';
import './AtsChecker.css';

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

interface AtsCheckResult {
    score: number;
    suggestions: string[];
    strengths: string[];
    weaknesses: string[];
    keywordMatches: number;
    totalKeywords: number;
    fileSize: number;
    wordCount: number;
    companyComparisons: {
        goldmanSachs: { score: number; match: string };
        google: { score: number; match: string };
        allCompanies?: Record<string, { score: number; match: string }>;
    };
    detailedAnalysis: {
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
    remaining: number;
    resetAt: Date;
    checkId: string;
}

export default function AtsChecker() {
    const { user, token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<AtsCheckResult | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isPremium = user?.isPremium || false;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 2 * 1024 * 1024) {
                setError('File size must be less than 2MB');
                return;
            }
            if (!selectedFile.type.includes('pdf') && !selectedFile.type.includes('wordprocessingml') && !selectedFile.type.includes('msword')) {
                setError('Only PDF and DOCX files are allowed');
                return;
            }
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !token) {
            setError('Please select a file and ensure you are logged in');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post<AtsCheckResult>(
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
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Please log in to use the ATS checker');
            } else if (err.response?.status === 403) {
                setError(err.response?.data?.message || 'You have reached the usage limit. Please try again later.');
            } else {
                setError(err.response?.data?.message || 'Failed to analyze resume. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!token || !result) return;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/payment/create-upi-order`,
                { checkId: result.checkId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setPaymentOrder(response.data);
            setShowPayment(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create payment order. Please try again.');
        }
    };

    const handlePaymentSuccess = async () => {
        setShowPayment(false);
        setPaymentOrder(null);
        // Refresh user data to get premium status
        window.location.reload();
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#10b981'; // green
        if (score >= 50) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const getScoreLabel = (score: number) => {
        if (score >= 70) return 'Excellent';
        if (score >= 50) return 'Good';
        if (score >= 30) return 'Fair';
        return 'Needs Improvement';
    };

    return (
        <div className="ats-checker">
            <div className="ats-header">
                <FileText size={24} />
                <div>
                    <h2>Resume ATS Checker</h2>
                    <p>Get your resume analyzed for ATS compatibility</p>
                </div>
            </div>

            {!result ? (
                <div className="ats-upload-section">
                    <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={48} className="upload-icon" />
                        <h3>Upload Your Resume</h3>
                        <p>Supported formats: PDF, DOCX (Max 2MB)</p>
                        {file && (
                            <div className="selected-file">
                                <FileText size={20} />
                                <span>{file.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="remove-file-btn"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className="analyze-btn"
                    >
                        {loading ? (
                            <>
                                <div className="spinner-small"></div>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Analyze Resume
                            </>
                        )}
                    </button>

                    <div className="usage-info">
                        <p>Free users: 3 checks per 12 hours</p>
                        {!isPremium && (
                            <p className="premium-hint">
                                <Star size={16} />
                                Upgrade to Premium for unlimited checks and advanced features
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="ats-results">
                    <div className="results-header">
                        <h3>Analysis Results</h3>
                        <button onClick={() => { setResult(null); setFile(null); }} className="new-check-btn">
                            New Check
                        </button>
                    </div>

                    {/* Overall Score */}
                    <div className="score-card" style={{ borderColor: getScoreColor(result.score) }}>
                        <div className="score-circle" style={{ borderColor: getScoreColor(result.score) }}>
                            <span className="score-value">{result.score}</span>
                            <span className="score-label">{getScoreLabel(result.score)}</span>
                        </div>
                        <div className="score-details">
                            <h4>Overall ATS Score</h4>
                            <p>{result.keywordMatches} of {result.totalKeywords} keywords matched</p>
                            <p>{result.wordCount} words • {(result.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>

                    {/* Company Comparisons */}
                    <div className="company-comparisons">
                        <h4>
                            <Building2 size={20} />
                            Company Match Scores
                        </h4>
                        <div className="company-scores">
                            <div className="company-score-item">
                                <span className="company-name">Goldman Sachs</span>
                                <span className="company-score" style={{ color: getScoreColor(result.companyComparisons.goldmanSachs.score) }}>
                                    {result.companyComparisons.goldmanSachs.score}%
                                </span>
                                <span className="company-match">{result.companyComparisons.goldmanSachs.match}</span>
                            </div>
                            <div className="company-score-item">
                                <span className="company-name">Google</span>
                                <span className="company-score" style={{ color: getScoreColor(result.companyComparisons.google.score) }}>
                                    {result.companyComparisons.google.score}%
                                </span>
                                <span className="company-match">{result.companyComparisons.google.match}</span>
                            </div>
                            {!isPremium && result.companyComparisons.allCompanies && (
                                <div className="premium-prompt">
                                    <Lock size={20} />
                                    <div>
                                        <strong>Unlock All Companies</strong>
                                        <p>See match scores for Amazon, Microsoft, Meta, Apple, Netflix, Uber and more</p>
                                    </div>
                                    <button onClick={handleUpgrade} className="upgrade-btn-small">
                                        Upgrade
                                    </button>
                                </div>
                            )}
                            {isPremium && result.companyComparisons.allCompanies && (
                                Object.entries(result.companyComparisons.allCompanies).map(([company, data]) => (
                                    <div key={company} className="company-score-item premium">
                                        <span className="company-name">{company.charAt(0).toUpperCase() + company.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                                        <span className="company-score" style={{ color: getScoreColor(data.score) }}>
                                            {data.score}%
                                        </span>
                                        <span className="company-match">{data.match}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="detailed-analysis">
                        <h4>
                            <TrendingUp size={20} />
                            Detailed Analysis
                        </h4>
                        <div className="analysis-grid">
                            <div className="analysis-item">
                                <span className="analysis-label">Keyword Density</span>
                                <span className="analysis-value">{result.detailedAnalysis.keywordDensity.toFixed(1)}/1000 words</span>
                            </div>
                            <div className="analysis-item">
                                <span className="analysis-label">Section Completeness</span>
                                <span className="analysis-value">{result.detailedAnalysis.sectionCompleteness}%</span>
                            </div>
                            <div className="analysis-item">
                                <span className="analysis-label">Action Verb Usage</span>
                                <span className="analysis-value">{result.detailedAnalysis.actionVerbUsage}%</span>
                            </div>
                            <div className="analysis-item">
                                <span className="analysis-label">Quantifiable Results</span>
                                <span className="analysis-value">{result.detailedAnalysis.quantifiableResults > 0 ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="analysis-item">
                                <span className="analysis-label">Technical Skills</span>
                                <span className="analysis-value">{result.detailedAnalysis.technicalSkills}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Strengths */}
                    {result.strengths.length > 0 && (
                        <div className="strengths-section">
                            <h4>
                                <CheckCircle size={20} />
                                Strengths
                            </h4>
                            <ul>
                                {result.strengths.map((strength, idx) => (
                                    <li key={idx}>{strength}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Weaknesses */}
                    {result.weaknesses.length > 0 && (
                        <div className="weaknesses-section">
                            <h4>
                                <AlertCircle size={20} />
                                Areas for Improvement
                            </h4>
                            <ul>
                                {result.weaknesses.map((weakness, idx) => (
                                    <li key={idx}>{weakness}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                        <div className="suggestions-section">
                            <h4>
                                <Sparkles size={20} />
                                Suggestions
                            </h4>
                            <ul>
                                {result.suggestions.map((suggestion, idx) => (
                                    <li key={idx}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Premium Features */}
                    {!isPremium && (
                        <div className="premium-upgrade-card">
                            <Star size={32} />
                            <h4>Unlock Premium Features</h4>
                            <p>Get detailed keyword analysis, optimization tips, and company-specific recommendations</p>
                            <button onClick={handleUpgrade} className="upgrade-btn">
                                Upgrade to Premium - ₹99
                            </button>
                        </div>
                    )}

                    {/* Usage Info */}
                    <div className="usage-info-footer">
                        <p>Remaining checks: {result.remaining} (resets in {new Date(result.resetAt).toLocaleString()})</p>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && paymentOrder && (
                <UPIPayment
                    amount={paymentOrder.amount}
                    orderId={paymentOrder.orderId}
                    upiId={paymentOrder.upiId}
                    merchantName={paymentOrder.merchantName}
                    onClose={() => setShowPayment(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
