import { Home, AlertTriangle, RefreshCw } from 'lucide-react';
import './ErrorPages.css';

export default function Error500() {
    const goHome = () => {
        window.location.href = '/';
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="error-page">
            <div className="error-container">
                <div className="error-icon error-icon-500">
                    <AlertTriangle size={80} />
                </div>
                <h1 className="error-code">500</h1>
                <h2 className="error-title">Server Error</h2>
                <p className="error-message">
                    Something went wrong on our end. We're working to fix it!
                </p>
                <div className="error-actions">
                    <button onClick={handleRefresh} className="error-btn secondary">
                        <RefreshCw size={20} />
                        Try Again
                    </button>
                    <button onClick={goHome} className="error-btn">
                        <Home size={20} />
                        Go Back Home
                    </button>
                </div>
            </div>
        </div>
    );
}

