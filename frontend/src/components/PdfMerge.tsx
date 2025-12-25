import { useState, useCallback, useRef } from 'react';
import { FilePlus, X, Move, Download, Trash2, FileText, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './PdfMerge.css';

interface PdfFile {
    id: string;
    file: File;
    pageCount?: number;
}

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

export default function PdfMerge() {
    const { token } = useAuth();
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const pdfFiles: PdfFile[] = [];
        const errors: string[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            if (file.type !== 'application/pdf') {
                errors.push(`"${file.name}" is not a PDF file`);
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                errors.push(`"${file.name}" exceeds 10MB limit`);
                continue;
            }

            pdfFiles.push({
                id: generateId(),
                file,
            });
        }

        if (errors.length > 0) {
            setError(errors.join('. '));
        } else {
            setError('');
        }

        if (pdfFiles.length > 0) {
            // Get page counts for the new files
            try {
                const formData = new FormData();
                pdfFiles.forEach((pf) => formData.append('files', pf.file));

                const response = await axios.post(`${API_BASE_URL}/api/pdf-merge/info`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                });

                const fileInfos = response.data.files;
                pdfFiles.forEach((pf, index) => {
                    if (fileInfos[index]) {
                        pf.pageCount = fileInfos[index].pageCount;
                    }
                });
            } catch (err) {
                console.error('Failed to get PDF info:', err);
            }

            setFiles((prev) => [...prev, ...pdfFiles]);
        }
    }, [token]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const clearAll = () => {
        setFiles([]);
        setError('');
    };

    // Drag and drop reordering
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;

        const newFiles = [...files];
        const draggedFile = newFiles[draggedIndex];
        newFiles.splice(draggedIndex, 1);
        newFiles.splice(index, 0, draggedFile);
        setFiles(newFiles);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setError('Please add at least 2 PDF files to merge');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            files.forEach((pf) => formData.append('files', pf.file));

            const response = await axios.post(`${API_BASE_URL}/api/pdf-merge/merge`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `merged-${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            if (err.response?.data) {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result as string);
                        setError(errorData.message || 'Failed to merge PDFs');
                    } catch {
                        setError('Failed to merge PDFs. Please try again.');
                    }
                };
                reader.readAsText(err.response.data);
            } else {
                setError(err.message || 'Failed to merge PDFs');
            }
        } finally {
            setLoading(false);
        }
    };

    const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

    return (
        <div className="pdf-merge-container">
            <div className="pdf-merge-card">
                <div className="pdf-merge-header">
                    <div className="header-icon">
                        <FilePlus size={24} />
                    </div>
                    <div>
                        <h2>PDF Merge</h2>
                        <p>Combine multiple PDF files into one document</p>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    className="pdf-drop-zone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                    />
                    <FilePlus size={48} />
                    <h3>Drop PDF files here</h3>
                    <p>or click to browse</p>
                    <span className="file-limit">Max 10MB per file • Up to 20 files</span>
                </div>

                {error && <div className="pdf-error-message">{error}</div>}

                {/* File List */}
                {files.length > 0 && (
                    <div className="pdf-file-list">
                        <div className="file-list-header">
                            <h3>Files to merge ({files.length})</h3>
                            <button onClick={clearAll} className="clear-all-btn">
                                <Trash2 size={16} />
                                Clear All
                            </button>
                        </div>
                        <p className="reorder-hint">
                            <Move size={14} /> Drag to reorder • Files will be merged in this order
                        </p>
                        <div className="file-items">
                            {files.map((pf, index) => (
                                <div
                                    key={pf.id}
                                    className={`file-item ${draggedIndex === index ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragEnter={() => handleDragEnter(index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="file-order">{index + 1}</div>
                                    <div className="file-icon">
                                        <FileText size={20} />
                                    </div>
                                    <div className="file-info">
                                        <span className="file-name">{pf.file.name}</span>
                                        <span className="file-meta">
                                            {(pf.file.size / 1024).toFixed(1)} KB
                                            {pf.pageCount && ` • ${pf.pageCount} page${pf.pageCount > 1 ? 's' : ''}`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeFile(pf.id)}
                                        className="remove-file-btn"
                                        title="Remove file"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {totalPages > 0 && (
                            <div className="total-pages">
                                Total: {totalPages} pages in merged PDF
                            </div>
                        )}
                    </div>
                )}

                {/* Merge Button */}
                <button
                    onClick={handleMerge}
                    disabled={files.length < 2 || loading}
                    className="merge-btn"
                >
                    {loading ? (
                        <>
                            <Loader className="spin" size={20} />
                            Merging...
                        </>
                    ) : (
                        <>
                            <Download size={20} />
                            Merge & Download PDF
                        </>
                    )}
                </button>

                <div className="pdf-merge-tips">
                    <h4>Tips</h4>
                    <ul>
                        <li>Files are merged in the order shown above</li>
                        <li>Drag and drop files to reorder them</li>
                        <li>Maximum file size: 10MB per PDF</li>
                        <li>Password-protected PDFs may not work</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
