import { FileText, CheckCircle, Construction } from 'lucide-react';
import './AtsChecker.css';

export default function AtsChecker() {
    // Show "Coming Soon" message
    return (
        <div className="ats-checker">
            <div className="ats-header">
                <FileText size={24} />
                <div>
                    <h2>Resume ATS Checker</h2>
                    <p>Get your resume analyzed for ATS compatibility</p>
                </div>
            </div>
            
            <div className="coming-soon-container">
                <Construction size={64} className="coming-soon-icon" />
                <h3>Coming Soon!</h3>
                <p>We're working hard to bring you an amazing ATS checker feature.</p>
                <p className="coming-soon-subtitle">This feature will help you optimize your resume for Applicant Tracking Systems and improve your chances of getting noticed by recruiters.</p>
                <div className="coming-soon-features">
                    <div className="feature-item">
                        <CheckCircle size={20} />
                        <span>PDF & DOCX Resume Analysis</span>
                    </div>
                    <div className="feature-item">
                        <CheckCircle size={20} />
                        <span>ATS Score Calculation</span>
                    </div>
                    <div className="feature-item">
                        <CheckCircle size={20} />
                        <span>Company-Specific Keyword Matching</span>
                    </div>
                    <div className="feature-item">
                        <CheckCircle size={20} />
                        <span>Detailed Improvement Suggestions</span>
                    </div>
                    <div className="feature-item">
                        <CheckCircle size={20} />
                        <span>Premium Enhancements</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
