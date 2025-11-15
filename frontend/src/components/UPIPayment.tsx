import { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './UPIPayment.css';

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

interface UPIPaymentProps {
    amount: number;
    orderId: string;
    onClose: () => void;
    onSuccess: () => void;
    upiId: string;
    merchantName: string;
}

export default function UPIPayment({ 
    amount, 
    orderId, 
    onClose, 
    onSuccess,
    upiId,
    merchantName 
}: UPIPaymentProps) {
    const { token } = useAuth();
    const [step, setStep] = useState<'details' | 'processing' | 'success' | 'failed'>('details');
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string>('');

    // Countdown timer
    useEffect(() => {
        if (step === 'details' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setStep('failed');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const maskUPIId = (upiId: string): string => {
        // Mask UPI ID: show first 4 characters and domain
        // e.g., 8979594537@yescred -> 8979****@yescred
        const parts = upiId.split('@');
        if (parts.length === 2) {
            const username = parts[0];
            const domain = parts[1];
            if (username.length > 4) {
                return `${username.substring(0, 4)}${'*'.repeat(Math.min(username.length - 4, 6))}@${domain}`;
            }
            return `${username.substring(0, 2)}${'*'.repeat(Math.max(username.length - 2, 2))}@${domain}`;
        }
        // Fallback: mask middle part
        if (upiId.length > 8) {
            return `${upiId.substring(0, 4)}${'*'.repeat(upiId.length - 8)}${upiId.substring(upiId.length - 4)}`;
        }
        return upiId;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const initiateUPI = () => {
        // Create UPI payment URL
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for Order ${orderId}`)}`;
        
        // Try to open UPI app
        window.location.href = upiUrl;
        
        // Show processing state
        setStep('processing');
    };

    const handleVerifyPayment = async () => {
        setVerifying(true);
        setError('');

        try {
            // First verify payment (marks as processing)
            await axios.post(
                `${API_BASE_URL}/api/payment/verify-upi`,
                {
                    orderId: orderId,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Then confirm payment (marks as completed)
            const confirmResponse = await axios.post(
                `${API_BASE_URL}/api/payment/confirm-payment`,
                {
                    orderId: orderId,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (confirmResponse.data.success) {
                setStep('success');
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            } else {
                setError('Payment confirmation failed. Please try again.');
                setStep('failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to verify payment. Please try again.');
            setStep('failed');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="upi-payment-overlay">
            <div className="upi-payment-modal">
                <button onClick={onClose} className="close-btn">
                    <X size={24} />
                </button>

                {step === 'details' && (
                    <div className="payment-content">
                        <div className="payment-header">
                            <Smartphone size={48} className="payment-icon" />
                            <h2>Pay via UPI</h2>
                            <p className="payment-amount">₹{amount}</p>
                        </div>

                        <div className="payment-details">
                            <div className="detail-row">
                                <span className="detail-label">Order ID:</span>
                                <span className="detail-value">{orderId}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Amount:</span>
                                <span className="detail-value">₹{amount}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Merchant:</span>
                                <span className="detail-value">{merchantName}</span>
                            </div>
                        </div>

                        <div className="upi-section">
                            <h3>UPI Details</h3>
                            <div className="upi-id-box">
                                <span className="upi-id">{upiId}</span>
                                <button 
                                    onClick={() => copyToClipboard(upiId)}
                                    className="copy-btn"
                                    title="Copy UPI ID"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <p className="upi-hint">Copy the UPI ID and pay using any UPI app</p>
                        </div>

                        <div className="timer-section">
                            <AlertCircle size={20} />
                            <span>Complete payment within {formatTime(timeLeft)}</span>
                        </div>

                        {error && (
                            <div className="payment-error">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="payment-actions">
                            <button onClick={initiateUPI} className="pay-btn primary" disabled={verifying}>
                                <ExternalLink size={20} />
                                Open UPI App
                            </button>
                            <button 
                                onClick={handleVerifyPayment} 
                                className="pay-btn secondary"
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <>
                                        <div className="mini-spinner"></div>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        I've Paid
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="payment-instructions">
                            <h4>How to Pay:</h4>
                            <ol>
                                <li>Click "Open UPI App" or copy the UPI ID</li>
                                <li>Open your UPI app (GPay, PhonePe, Paytm, etc.)</li>
                                <li>Enter the UPI ID and amount (₹{amount})</li>
                                <li>Complete the payment</li>
                                <li>Click "I've Paid" to verify</li>
                            </ol>
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="payment-content processing">
                        <div className="processing-animation">
                            <div className="spinner"></div>
                        </div>
                        <h2>Processing Payment</h2>
                        <p>Please complete the payment in your UPI app</p>
                        {error && (
                            <div className="payment-error">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                        <button 
                            onClick={handleVerifyPayment} 
                            className="pay-btn secondary"
                            disabled={verifying}
                        >
                            {verifying ? (
                                <>
                                    <div className="mini-spinner"></div>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    I've Completed Payment
                                </>
                            )}
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="payment-content success">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>Payment Successful!</h2>
                        <p>Your payment has been verified. Premium features are now active.</p>
                    </div>
                )}

                {step === 'failed' && (
                    <div className="payment-content failed">
                        <AlertCircle size={64} className="error-icon" />
                        <h2>Payment Timeout</h2>
                        <p>The payment window has expired. Please try again.</p>
                        <button onClick={() => setStep('details')} className="pay-btn primary">
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

