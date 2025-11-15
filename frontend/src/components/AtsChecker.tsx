import { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './AtsChecker.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
}

export default function AtsChecker() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AtsResult | null>(null);
  const [usage, setUsage] = useState<{ remaining: number; resetAt: string } | null>(null);

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

  // Load usage on mount
  useEffect(() => {
    if (token) {
      checkUsage();
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

  return (
    <div className="ats-checker">
      <div className="ats-header">
        <FileText size={24} />
        <div>
          <h2>Resume ATS Checker</h2>
          <p>Get your resume analyzed for ATS compatibility</p>
        </div>
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

        <button type="submit" className="check-btn" disabled={loading || !file || (usage && usage.remaining === 0)}>
          {loading ? 'Analyzing...' : 'Check Resume'}
        </button>
      </form>

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
  );
}

