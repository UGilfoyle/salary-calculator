import { Home, AlertCircle } from 'lucide-react';
import './ErrorPages.css';

export default function Error404() {
    const goHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="error-page">
            <div className="error-container">
                <div className="error-icon">
                    <AlertCircle size={80} />
                </div>
                <h1 className="error-code">404</h1>
                <h2 className="error-title">Page Not Found</h2>
                <p className="error-message">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>
                <button onClick={goHome} className="error-btn">
                    <Home size={20} />
                    Go Back Home
                </button>
            </div>
        </div>
    );
}

