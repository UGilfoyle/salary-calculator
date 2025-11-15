import { X, Construction, Sparkles, Clock } from 'lucide-react';
import './ErrorPages.css';

interface UnderConstructionProps {
    onClose?: () => void;
    title?: string;
    message?: string;
}

export default function UnderConstruction({ 
    onClose, 
    title = "Payment Gateway Under Construction",
    message = "We're working hard to bring you a seamless payment experience. Premium features will be available soon!"
}: UnderConstructionProps) {
    return (
        <div className="under-construction-overlay">
            <div className="under-construction-modal">
                {onClose && (
                    <button onClick={onClose} className="close-btn">
                        <X size={24} />
                    </button>
                )}
                <div className="construction-icon">
                    <Construction size={64} />
                </div>
                <h2 className="construction-title">{title}</h2>
                <p className="construction-message">{message}</p>
                <div className="construction-features">
                    <div className="feature-item">
                        <Sparkles size={20} />
                        <span>Premium features coming soon</span>
                    </div>
                    <div className="feature-item">
                        <Clock size={20} />
                        <span>Secure payment integration in progress</span>
                    </div>
                </div>
                <div className="construction-footer">
                    <p>Stay tuned for updates!</p>
                </div>
            </div>
        </div>
    );
}

