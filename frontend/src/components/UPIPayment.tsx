import { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, AlertCircle, Copy, QrCode } from 'lucide-react';
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
    const [step, setStep] = useState<'details' | 'confirm' | 'success' | 'failed'>('details');
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string>('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState('');

    // Fetch QR code on mount
    useEffect(() => {
        const fetchQRCode = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/payment/qr-code`, {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                });
                const url = URL.createObjectURL(response.data);
                setQrCodeUrl(url);
            } catch (err) {
                console.log('QR code not available, using UPI link instead');
            }
        };
        fetchQRCode();

        return () => {
            if (qrCodeUrl) {
                URL.revokeObjectURL(qrCodeUrl);
            }
        };
    }, [token]);

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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openUPIApp = () => {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Premium Features - ${orderId}`)}`;
        window.location.href = upiUrl;
    };

    const handleConfirmPayment = async () => {
        setConfirming(true);
        setError('');

        try {
            // Confirm payment with optional transaction ID
            const response = await axios.post(
                `${API_BASE_URL}/api/payment/confirm-payment`,
                {
                    orderId: orderId,
                    transactionId: transactionId || undefined
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setStep('success');
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            } else {
                setError('Payment confirmation failed. Please try again.');
                setStep('failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to confirm payment. Please try again.');
            setStep('failed');
        } finally {
            setConfirming(false);
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
                            <div className="payment-icon-wrapper">
                                <Smartphone size={32} />
                            </div>
                            <h2>Pay ₹{amount}</h2>
                            <span className="discount-tag">75% OFF</span>
                        </div>

                        {/* QR Code Section */}
                        {qrCodeUrl && (
                            <div className="qr-section">
                                <div className="qr-header">
                                    <QrCode size={18} />
                                    <span>Scan to Pay</span>
                                </div>
                                <img src={qrCodeUrl} alt="UPI QR Code" className="qr-image" />
                                <p className="qr-hint">Use GPay, PhonePe, or Paytm</p>
                            </div>
                        )}

                        {/* Payment Info */}
                        <div className="payment-info">
                            <div className="info-row">
                                <span className="info-label">Amount</span>
                                <span className="info-value amount">₹{amount}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">UPI ID</span>
                                <div className="upi-copy-row">
                                    <span className="info-value">{upiId}</span>
                                    <button onClick={() => copyToClipboard(upiId)} className="copy-btn">
                                        {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {copied && (
                            <div className="copied-toast">✓ UPI ID copied!</div>
                        )}

                        <div className="timer-bar">
                            <AlertCircle size={16} />
                            <span>Complete within {formatTime(timeLeft)}</span>
                        </div>

                        {error && (
                            <div className="error-bar">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="action-buttons">
                            <button onClick={openUPIApp} className="open-app-btn">
                                Open UPI App
                            </button>
                            <button onClick={() => setStep('confirm')} className="confirm-btn">
                                I've Paid ✓
                            </button>
                        </div>

                        <p className="help-text">
                            After paying, click "I've Paid" to activate premium features
                        </p>
                    </div>
                )}

                {step === 'confirm' && (
                    <div className="payment-content confirm-step">
                        <div className="confirm-icon">
                            <CheckCircle size={48} />
                        </div>
                        <h2>Confirm Payment</h2>
                        <p>Did you complete the payment of ₹{amount}?</p>

                        {/* Transaction ID - Optional but helps with verification */}
                        <div className="transaction-input-section">
                            <label htmlFor="txnId">Transaction ID (optional)</label>
                            <input
                                type="text"
                                id="txnId"
                                placeholder="Enter UPI reference number"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                className="transaction-input"
                            />
                            <p className="input-hint">
                                Adding this helps verify your payment faster
                            </p>
                        </div>

                        {error && (
                            <div className="error-bar">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="confirm-actions">
                            <button
                                onClick={handleConfirmPayment}
                                className="yes-btn"
                                disabled={confirming}
                            >
                                {confirming ? 'Verifying...' : 'Yes, I Paid'}
                            </button>
                            <button onClick={() => setStep('details')} className="no-btn">
                                No, Go Back
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="payment-content success-step">
                        <div className="success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Payment Successful!</h2>
                        <p>Premium features are now active for 30 days!</p>
                    </div>
                )}

                {step === 'failed' && (
                    <div className="payment-content failed-step">
                        <div className="failed-icon">
                            <AlertCircle size={64} />
                        </div>
                        <h2>{timeLeft === 0 ? 'Time Expired' : 'Something Went Wrong'}</h2>
                        <p>{error || 'Please try again.'}</p>
                        <button onClick={() => {
                            setStep('details');
                            setTimeLeft(600);
                            setError('');
                        }} className="retry-btn">
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
