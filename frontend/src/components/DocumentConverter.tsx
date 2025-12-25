import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Merge, Split, Minimize2, FileDown, FileUp, Edit, Image, PenTool, Stamp, RotateCw, Construction, X, FilePlus, Move, Download, Trash2, Loader, CheckCircle, RotateCcw, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './DocumentConverter.css';

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

interface Tool {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    isActive?: boolean;
}

interface PdfFile {
    id: string;
    file: File;
    pageCount?: number;
}

interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
}

const tools: Tool[] = [
    {
        id: 'merge-pdf',
        title: 'Merge PDF',
        description: 'Combine PDFs in the order you want with the easiest PDF merger available.',
        icon: <Merge size={32} />,
        color: '#f97316',
        isActive: true,
    },
    {
        id: 'sign-pdf',
        title: 'Sign PDF',
        description: 'Sign yourself or request electronic signatures from others.',
        icon: <PenTool size={32} />,
        color: '#3b82f6',
        isActive: true,
    },
    {
        id: 'compress-pdf',
        title: 'Compress PDF',
        description: 'Reduce file size while optimizing for maximal PDF quality.',
        icon: <Minimize2 size={32} />,
        color: '#10b981',
        isActive: true, // Now active!
    },
    {
        id: 'split-pdf',
        title: 'Split PDF',
        description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
        icon: <Split size={32} />,
        color: '#f97316',
    },
    {
        id: 'pdf-to-word',
        title: 'PDF to Word',
        description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.',
        icon: <FileDown size={32} />,
        color: '#3b82f6',
    },
    {
        id: 'pdf-to-powerpoint',
        title: 'PDF to PowerPoint',
        description: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.',
        icon: <FileDown size={32} />,
        color: '#f97316',
    },
    {
        id: 'pdf-to-excel',
        title: 'PDF to Excel',
        description: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.',
        icon: <FileDown size={32} />,
        color: '#10b981',
    },
    {
        id: 'word-to-pdf',
        title: 'Word to PDF',
        description: 'Make DOC and DOCX files easy to read by converting them to PDF.',
        icon: <FileUp size={32} />,
        color: '#3b82f6',
    },
    {
        id: 'powerpoint-to-pdf',
        title: 'PowerPoint to PDF',
        description: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.',
        icon: <FileUp size={32} />,
        color: '#f97316',
    },
    {
        id: 'excel-to-pdf',
        title: 'Excel to PDF',
        description: 'Make EXCEL spreadsheets easy to read by converting them to PDF.',
        icon: <FileUp size={32} />,
        color: '#10b981',
    },
    {
        id: 'edit-pdf',
        title: 'Edit PDF',
        description: 'Add text, images, shapes or freehand annotations to a PDF document.',
        icon: <Edit size={32} />,
        color: '#8b5cf6',
    },
    {
        id: 'pdf-to-jpg',
        title: 'PDF to JPG',
        description: 'Convert each PDF page into a JPG or extract all images contained in a PDF.',
        icon: <Image size={32} />,
        color: '#fbbf24',
    },
    {
        id: 'jpg-to-pdf',
        title: 'JPG to PDF',
        description: 'Convert JPG images to PDF in seconds. Easily adjust orientation and margins.',
        icon: <Image size={32} />,
        color: '#fbbf24',
    },
    {
        id: 'watermark',
        title: 'Watermark',
        description: 'Stamp an image or text over your PDF in seconds.',
        icon: <Stamp size={32} />,
        color: '#8b5cf6',
    },
    {
        id: 'rotate-pdf',
        title: 'Rotate PDF',
        description: 'Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!',
        icon: <RotateCw size={32} />,
        color: '#8b5cf6',
    },
];

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function DocumentConverter() {
    const { token } = useAuth();
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [showMergePdf, setShowMergePdf] = useState(false);
    const [showSignPdf, setShowSignPdf] = useState(false);
    const [showCompressPdf, setShowCompressPdf] = useState(false);

    // PDF Merge state
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sign PDF state
    const [signFile, setSignFile] = useState<File | null>(null);
    const [signerName, setSignerName] = useState('');
    const [addTimestamp, setAddTimestamp] = useState(true);
    const signFileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // Compress PDF state
    const [compressFile, setCompressFile] = useState<File | null>(null);
    const [compressionStats, setCompressionStats] = useState<CompressionStats | null>(null);
    const compressFileInputRef = useRef<HTMLInputElement>(null);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleToolClick = (tool: Tool) => {
        if (tool.id === 'merge-pdf') {
            setShowMergePdf(true);
        } else if (tool.id === 'sign-pdf') {
            setShowSignPdf(true);
        } else if (tool.id === 'compress-pdf') {
            setShowCompressPdf(true);
        } else {
            setSelectedTool(tool.title);
            setShowComingSoon(true);
        }
    };

    // Canvas signature functions with improved touch support
    useEffect(() => {
        if (showSignPdf && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 2.5; // Slightly thicker for mobile visibility
            }
        }
    }, [showSignPdf]);

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling on touch devices
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const point = getCanvasPoint(e);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch devices

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const point = getCanvasPoint(e);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSignPdf = async () => {
        if (!signFile || !hasSignature) {
            setError('Please upload a PDF and draw your signature');
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);
        setError('');

        try {
            const signatureImage = canvas.toDataURL('image/png');

            const formData = new FormData();
            formData.append('file', signFile);
            formData.append('signatureImage', signatureImage);
            formData.append('signerName', signerName);
            formData.append('addTimestamp', addTimestamp.toString());

            const response = await axios.post(`${API_BASE_URL}/api/pdf-merge/sign`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `signed-${signFile.name}`);
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
                        setError(errorData.message || 'Failed to sign PDF');
                    } catch {
                        setError('Failed to sign PDF. Please try again.');
                    }
                };
                reader.readAsText(err.response.data);
            } else {
                setError(err.message || 'Failed to sign PDF');
            }
        } finally {
            setLoading(false);
        }
    };

    // Compress PDF handler
    const handleCompressPdf = async () => {
        if (!compressFile) {
            setError('Please upload a PDF file');
            return;
        }

        setLoading(true);
        setError('');
        setCompressionStats(null);

        try {
            const formData = new FormData();
            formData.append('file', compressFile);

            const response = await axios.post(`${API_BASE_URL}/api/pdf-merge/compress`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob',
            });

            // Get compression stats from headers
            const originalSize = parseInt(response.headers['x-original-size'] || '0');
            const compressedSize = parseInt(response.headers['x-compressed-size'] || '0');
            const savedPercentage = parseFloat(response.headers['x-saved-percentage'] || '0');

            setCompressionStats({
                originalSize,
                compressedSize,
                savedPercentage,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `compressed-${compressFile.name}`);
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
                        setError(errorData.message || 'Failed to compress PDF');
                    } catch {
                        setError('Failed to compress PDF. Please try again.');
                    }
                };
                reader.readAsText(err.response.data);
            } else {
                setError(err.message || 'Failed to compress PDF');
            }
        } finally {
            setLoading(false);
        }
    };

    // PDF Merge handlers
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
        <div className="document-converter">
            <div className="converter-header">
                <FileText size={24} />
                <div>
                    <h2>Document Converter</h2>
                    <p>Convert, merge, split, and edit your documents with ease</p>
                </div>
            </div>

            <div className="tools-grid">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className={`tool-card ${tool.isActive ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool)}
                    >
                        <div className="tool-icon" style={{ color: tool.color }}>
                            {tool.icon}
                        </div>
                        <h3>{tool.title}</h3>
                        <p>{tool.description}</p>
                        <div className={`tool-status ${tool.isActive ? 'ready' : ''}`}>
                            {tool.isActive ? (
                                <>
                                    <CheckCircle size={16} />
                                    <span>Ready</span>
                                </>
                            ) : (
                                <>
                                    <Construction size={16} />
                                    <span>Under Progress</span>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Coming Soon Modal */}
            {showComingSoon && (
                <div className="coming-soon-overlay" onClick={() => setShowComingSoon(false)}>
                    <div className="coming-soon-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="coming-soon-close"
                            onClick={() => setShowComingSoon(false)}
                        >
                            <X size={24} />
                        </button>
                        <div className="coming-soon-content">
                            <Construction size={64} className="coming-soon-icon" />
                            <h2>Coming Soon!</h2>
                            <p className="coming-soon-tool">{selectedTool}</p>
                            <p className="coming-soon-message">
                                We're working hard to bring you this feature.
                                It will be available soon!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Merge Modal */}
            {showMergePdf && (
                <div className="merge-pdf-overlay" onClick={() => setShowMergePdf(false)}>
                    <div className="merge-pdf-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="merge-close-btn"
                            onClick={() => {
                                setShowMergePdf(false);
                                setFiles([]);
                                setError('');
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div className="merge-header">
                            <div className="merge-icon">
                                <FilePlus size={24} />
                            </div>
                            <div>
                                <h2>Merge PDF</h2>
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
                    </div>
                </div>
            )}

            {/* Sign PDF Modal */}
            {showSignPdf && (
                <div className="merge-pdf-overlay" onClick={() => setShowSignPdf(false)}>
                    <div className="merge-pdf-modal sign-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="merge-close-btn"
                            onClick={() => {
                                setShowSignPdf(false);
                                setSignFile(null);
                                setSignerName('');
                                setError('');
                                clearSignature();
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div className="merge-header">
                            <div className="merge-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                                <PenTool size={24} />
                            </div>
                            <div>
                                <h2>Sign PDF</h2>
                                <p>Draw your signature and apply it to your document</p>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div
                            className="pdf-drop-zone"
                            onClick={() => signFileInputRef.current?.click()}
                        >
                            <input
                                ref={signFileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        setSignFile(e.target.files[0]);
                                        setError('');
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                            {signFile ? (
                                <>
                                    <FileText size={48} />
                                    <h3>{signFile.name}</h3>
                                    <p>{formatFileSize(signFile.size)} • Click to change</p>
                                </>
                            ) : (
                                <>
                                    <FileText size={48} />
                                    <h3>Select PDF to sign</h3>
                                    <p>Click to browse</p>
                                </>
                            )}
                        </div>

                        {/* Signature Pad - Mobile optimized */}
                        <div className="signature-section">
                            <div className="signature-header">
                                <h3>Draw your signature</h3>
                                <button onClick={clearSignature} className="clear-signature-btn">
                                    <RotateCcw size={16} />
                                    Clear
                                </button>
                            </div>
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={150}
                                className="signature-canvas"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            <p className="signature-hint">Works on all devices - use finger or stylus on mobile</p>
                        </div>

                        {/* Options */}
                        <div className="sign-options">
                            <div className="sign-option">
                                <label htmlFor="signerName">Your Name (Optional)</label>
                                <input
                                    type="text"
                                    id="signerName"
                                    placeholder="Enter your name"
                                    value={signerName}
                                    onChange={(e) => setSignerName(e.target.value)}
                                />
                            </div>
                            <label className="checkbox-option">
                                <input
                                    type="checkbox"
                                    checked={addTimestamp}
                                    onChange={(e) => setAddTimestamp(e.target.checked)}
                                />
                                <span>Add date and time</span>
                            </label>
                        </div>

                        {error && <div className="pdf-error-message">{error}</div>}

                        {/* Sign Button */}
                        <button
                            onClick={handleSignPdf}
                            disabled={!signFile || !hasSignature || loading}
                            className="merge-btn"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)' }}
                        >
                            {loading ? (
                                <>
                                    <Loader className="spin" size={20} />
                                    Signing...
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Sign & Download PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Compress PDF Modal */}
            {showCompressPdf && (
                <div className="merge-pdf-overlay" onClick={() => setShowCompressPdf(false)}>
                    <div className="merge-pdf-modal compress-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="merge-close-btn"
                            onClick={() => {
                                setShowCompressPdf(false);
                                setCompressFile(null);
                                setCompressionStats(null);
                                setError('');
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div className="merge-header">
                            <div className="merge-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                <Minimize2 size={24} />
                            </div>
                            <div>
                                <h2>Compress PDF</h2>
                                <p>Reduce file size while preserving quality</p>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div
                            className="pdf-drop-zone"
                            onClick={() => compressFileInputRef.current?.click()}
                        >
                            <input
                                ref={compressFileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        setCompressFile(e.target.files[0]);
                                        setCompressionStats(null);
                                        setError('');
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                            {compressFile ? (
                                <>
                                    <FileText size={48} />
                                    <h3>{compressFile.name}</h3>
                                    <p>{formatFileSize(compressFile.size)} • Click to change</p>
                                </>
                            ) : (
                                <>
                                    <Minimize2 size={48} />
                                    <h3>Select PDF to compress</h3>
                                    <p>Click to browse</p>
                                    <span className="file-limit">Max 50MB</span>
                                </>
                            )}
                        </div>

                        {/* Compression Info */}
                        <div className="compression-info">
                            <div className="info-item">
                                <Zap size={20} />
                                <div>
                                    <h4>Lossless Compression</h4>
                                    <p>Uses Flate compression to reduce size without quality loss</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <CheckCircle size={20} />
                                <div>
                                    <h4>Optimized Structure</h4>
                                    <p>Removes metadata and optimizes document structure</p>
                                </div>
                            </div>
                        </div>

                        {/* Compression Stats */}
                        {compressionStats && (
                            <div className="compression-stats">
                                <div className="stat">
                                    <span className="stat-label">Original</span>
                                    <span className="stat-value">{formatFileSize(compressionStats.originalSize)}</span>
                                </div>
                                <div className="stat-arrow">→</div>
                                <div className="stat">
                                    <span className="stat-label">Compressed</span>
                                    <span className="stat-value success">{formatFileSize(compressionStats.compressedSize)}</span>
                                </div>
                                <div className="stat-saved">
                                    <span>Saved {compressionStats.savedPercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}

                        {error && <div className="pdf-error-message">{error}</div>}

                        {/* Compress Button */}
                        <button
                            onClick={handleCompressPdf}
                            disabled={!compressFile || loading}
                            className="merge-btn"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                        >
                            {loading ? (
                                <>
                                    <Loader className="spin" size={20} />
                                    Compressing...
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Compress & Download PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
