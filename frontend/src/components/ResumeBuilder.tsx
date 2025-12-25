import React, { useState, useRef } from 'react';
import {
    Palette, Layout, Download, Wand2, FileDown, Loader2,
    GripVertical, List, ChevronDown, ChevronUp
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import './ResumeBuilder.css';

// Types
export interface ResumeSection {
    id: string;
    type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
    title: string;
    isVisible: boolean;
}

export interface Experience {
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    achievements: string[];
}

export interface Education {
    id: string;
    school: string;
    degree: string;
    field: string;
    year: string;
    gpa?: string;
}

export interface ResumeData {
    personalInfo: {
        name: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        linkedin?: string;
        website?: string;
    };
    summary: string;
    experience: Experience[];
    education: Education[];
    skills: string[];
    sections: ResumeSection[];
}

export interface DesignSettings {
    templateId: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: 'small' | 'normal' | 'large';
    sectionSpacing: number;
    lineSpacing: number;
    showPhoto: boolean;
    accentStyle: 'underline' | 'background' | 'border' | 'none';
}

// Template layouts
export type TemplateLayout = 'classic' | 'modern' | 'sidebar-left' | 'sidebar-right' | 'two-column' | 'minimal' | 'executive' | 'creative';

interface Template {
    id: TemplateLayout;
    name: string;
    description: string;
    layout: 'single' | 'sidebar-left' | 'sidebar-right' | 'two-column';
    isPremium: boolean;
    previewColor: string;
}

const TEMPLATES: Template[] = [
    { id: 'classic', name: 'Classic', description: 'Traditional single-column layout', layout: 'single', isPremium: false, previewColor: '#1e3a5f' },
    { id: 'modern', name: 'Modern', description: 'Clean with colored header', layout: 'single', isPremium: false, previewColor: '#0ea5e9' },
    { id: 'sidebar-left', name: 'Professional', description: 'Left sidebar with contact info', layout: 'sidebar-left', isPremium: false, previewColor: '#059669' },
    { id: 'sidebar-right', name: 'Creative', description: 'Right sidebar for skills', layout: 'sidebar-right', isPremium: false, previewColor: '#7c3aed' },
    { id: 'two-column', name: 'Executive', description: 'Balanced two-column layout', layout: 'two-column', isPremium: false, previewColor: '#374151' },
    { id: 'minimal', name: 'Minimal', description: 'Clean and simple', layout: 'single', isPremium: false, previewColor: '#000000' },
    { id: 'executive', name: 'Corporate', description: 'Bold professional style', layout: 'sidebar-left', isPremium: false, previewColor: '#1e40af' },
    { id: 'creative', name: 'Designer', description: 'Stand out visually', layout: 'sidebar-right', isPremium: false, previewColor: '#db2777' },
];

const COLORS = [
    '#000000', '#1e3a5f', '#0ea5e9', '#059669', '#7c3aed',
    '#dc2626', '#ea580c', '#eab308', '#164e63', '#1e40af',
    '#db2777', '#78350f', '#374151', '#065f46', '#7e22ce'
];

const FONTS = [
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: '"Open Sans", sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
];

const DEFAULT_RESUME: ResumeData = {
    personalInfo: {
        name: 'Saanvi Patel',
        title: 'Software Engineer',
        email: 'saanvi.patel@example.com',
        phone: '+91 22 1234 5677',
        location: 'New Delhi, India',
        linkedin: 'linkedin.com/in/saanvipatel',
        website: '',
    },
    summary: 'Innovative and results-driven Full Stack Developer with 5+ years of experience designing, developing, and optimizing scalable applications. Skilled in modern web technologies with a proven track record of delivering high-impact solutions.',
    experience: [
        {
            id: '1',
            company: 'Tech Solutions Inc.',
            role: 'Senior Software Engineer',
            location: 'New Delhi',
            startDate: '2021',
            endDate: 'Present',
            current: true,
            achievements: [
                'Led development of microservices architecture reducing system latency by 40%',
                'Mentored team of 5 junior developers improving code quality by 35%',
                'Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes',
            ],
        },
        {
            id: '2',
            company: 'StartupXYZ',
            role: 'Full Stack Developer',
            location: 'Mumbai',
            startDate: '2019',
            endDate: '2021',
            current: false,
            achievements: [
                'Built customer-facing portal serving 100K+ daily active users',
                'Developed RESTful APIs improving data retrieval speed by 60%',
            ],
        },
    ],
    education: [
        {
            id: '1',
            school: 'Indian Institute of Technology',
            degree: 'Bachelor of Technology',
            field: 'Computer Science',
            year: '2019',
            gpa: '8.5/10',
        },
    ],
    skills: [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
        'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git'
    ],
    sections: [
        { id: 'header', type: 'header', title: 'Personal Info', isVisible: true },
        { id: 'summary', type: 'summary', title: 'Professional Summary', isVisible: true },
        { id: 'experience', type: 'experience', title: 'Work Experience', isVisible: true },
        { id: 'education', type: 'education', title: 'Education', isVisible: true },
        { id: 'skills', type: 'skills', title: 'Skills', isVisible: true },
    ],
};

const DEFAULT_DESIGN: DesignSettings = {
    templateId: 'sidebar-left',
    primaryColor: '#1e3a5f',
    secondaryColor: '#f8fafc',
    fontFamily: '"Times New Roman", serif',
    fontSize: 'normal',
    sectionSpacing: 50,
    lineSpacing: 50,
    showPhoto: false,
    accentStyle: 'underline',
};

interface ResumeBuilderProps {
    onClose?: () => void;
    initialData?: {
        name?: string;
        email?: string;
    };
}

export default function ResumeBuilder({ onClose, initialData }: ResumeBuilderProps) {
    const [resume, setResume] = useState<ResumeData>(() => ({
        ...DEFAULT_RESUME,
        personalInfo: {
            ...DEFAULT_RESUME.personalInfo,
            name: initialData?.name || DEFAULT_RESUME.personalInfo.name,
            email: initialData?.email || DEFAULT_RESUME.personalInfo.email,
        }
    }));
    const [design, setDesign] = useState<DesignSettings>(DEFAULT_DESIGN);
    const [activePanel, setActivePanel] = useState<'templates' | 'design' | 'sections' | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [draggedSection, setDraggedSection] = useState<string | null>(null);
    const resumeRef = useRef<HTMLDivElement>(null);

    // Get current template
    const currentTemplate = TEMPLATES.find(t => t.id === design.templateId) || TEMPLATES[0];

    // Section drag handlers
    const handleDragStart = (sectionId: string) => {
        setDraggedSection(sectionId);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedSection || draggedSection === targetId) return;

        const sections = [...resume.sections];
        const dragIndex = sections.findIndex(s => s.id === draggedSection);
        const targetIndex = sections.findIndex(s => s.id === targetId);

        if (dragIndex === -1 || targetIndex === -1) return;

        const [removed] = sections.splice(dragIndex, 1);
        sections.splice(targetIndex, 0, removed);

        setResume(prev => ({ ...prev, sections }));
    };

    const handleDragEnd = () => {
        setDraggedSection(null);
    };

    // Update handlers
    const updatePersonalInfo = (field: string, value: string) => {
        setResume(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, [field]: value }
        }));
    };

    const updateSummary = (value: string) => {
        setResume(prev => ({ ...prev, summary: value }));
    };

    const updateExperience = (id: string, field: string, value: any) => {
        setResume(prev => ({
            ...prev,
            experience: prev.experience.map(exp =>
                exp.id === id ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const updateEducation = (id: string, field: string, value: string) => {
        setResume(prev => ({
            ...prev,
            education: prev.education.map(edu =>
                edu.id === id ? { ...edu, [field]: value } : edu
            )
        }));
    };

    const updateSkills = (skills: string[]) => {
        setResume(prev => ({ ...prev, skills }));
    };

    // AI Enhancement
    const handleAIEnhance = async () => {
        setIsEnhancing(true);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/ats/ai/enhance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    text: resume.summary,
                    type: 'summary',
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setResume(prev => ({ ...prev, summary: result.enhanced }));
            }
        } catch (error) {
            console.error('AI Enhancement error:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    // Export handlers
    const handleExportPDF = async () => {
        if (!resumeRef.current) return;
        setIsExporting(true);

        try {
            const dataUrl = await toPng(resumeRef.current, {
                quality: 1,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
            });

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
            pdf.save(`${resume.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportWord = async () => {
        setIsExporting(true);
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: resume.personalInfo.name, bold: true, size: 48 })],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: resume.personalInfo.title, size: 24 })],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: `${resume.personalInfo.email} | ${resume.personalInfo.phone}`, size: 20 })],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 },
                        }),
                        new Paragraph({ text: 'PROFESSIONAL SUMMARY', heading: HeadingLevel.HEADING_2 }),
                        new Paragraph({ text: resume.summary, spacing: { after: 300 } }),
                        new Paragraph({ text: 'EXPERIENCE', heading: HeadingLevel.HEADING_2 }),
                        ...resume.experience.flatMap(exp => [
                            new Paragraph({ children: [new TextRun({ text: exp.role, bold: true }), new TextRun({ text: ` at ${exp.company}` })] }),
                            new Paragraph({ children: [new TextRun({ text: `${exp.startDate} - ${exp.endDate}`, italics: true })] }),
                            ...exp.achievements.map(ach => new Paragraph({ text: `• ${ach}` })),
                        ]),
                        new Paragraph({ text: 'EDUCATION', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
                        ...resume.education.map(edu => new Paragraph({ text: `${edu.degree} in ${edu.field} - ${edu.school} (${edu.year})` })),
                        new Paragraph({ text: 'SKILLS', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
                        new Paragraph({ text: resume.skills.join(' • ') }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${resume.personalInfo.name.replace(/\s+/g, '_')}_Resume.docx`);
        } catch (error) {
            console.error('Word export error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Get font size value
    const getFontSize = () => {
        switch (design.fontSize) {
            case 'small': return '13px';
            case 'large': return '16px';
            default: return '14px';
        }
    };

    // Render resume based on template
    const renderResume = () => {
        const layout = currentTemplate.layout;

        const headerSection = (
            <div className="resume-header-section">
                <h1
                    className="resume-name"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo('name', e.currentTarget.textContent || '')}
                >
                    {resume.personalInfo.name}
                </h1>
                <p
                    className="resume-title"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo('title', e.currentTarget.textContent || '')}
                >
                    {resume.personalInfo.title}
                </p>
            </div>
        );

        const contactSection = (
            <div className="contact-info">
                <div className="contact-item">
                    <span contentEditable suppressContentEditableWarning onBlur={(e) => updatePersonalInfo('email', e.currentTarget.textContent || '')}>{resume.personalInfo.email}</span>
                </div>
                <div className="contact-item">
                    <span contentEditable suppressContentEditableWarning onBlur={(e) => updatePersonalInfo('phone', e.currentTarget.textContent || '')}>{resume.personalInfo.phone}</span>
                </div>
                <div className="contact-item">
                    <span contentEditable suppressContentEditableWarning onBlur={(e) => updatePersonalInfo('location', e.currentTarget.textContent || '')}>{resume.personalInfo.location}</span>
                </div>
                {resume.personalInfo.linkedin && (
                    <div className="contact-item">
                        <span contentEditable suppressContentEditableWarning onBlur={(e) => updatePersonalInfo('linkedin', e.currentTarget.textContent || '')}>{resume.personalInfo.linkedin}</span>
                    </div>
                )}
            </div>
        );

        const summarySection = (
            <section className="resume-section">
                <h2 className="section-title">Professional Summary</h2>
                <p
                    className="summary-text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateSummary(e.currentTarget.textContent || '')}
                >
                    {resume.summary}
                </p>
            </section>
        );

        const experienceSection = (
            <section className="resume-section">
                <h2 className="section-title">Work Experience</h2>
                {resume.experience.map((exp) => (
                    <div key={exp.id} className="experience-item">
                        <div className="exp-header">
                            <div>
                                <h3 className="exp-role" contentEditable suppressContentEditableWarning onBlur={(e) => updateExperience(exp.id, 'role', e.currentTarget.textContent)}>{exp.role}</h3>
                                <p className="exp-company" contentEditable suppressContentEditableWarning onBlur={(e) => updateExperience(exp.id, 'company', e.currentTarget.textContent)}>{exp.company}</p>
                            </div>
                            <span className="exp-date">{exp.startDate} - {exp.endDate}</span>
                        </div>
                        <ul className="achievements">
                            {exp.achievements.map((ach, i) => (
                                <li key={i} contentEditable suppressContentEditableWarning onBlur={(e) => {
                                    const newAch = [...exp.achievements];
                                    newAch[i] = e.currentTarget.textContent || '';
                                    updateExperience(exp.id, 'achievements', newAch);
                                }}>{ach}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        );

        const educationSection = (
            <section className="resume-section">
                <h2 className="section-title">Education</h2>
                {resume.education.map((edu) => (
                    <div key={edu.id} className="education-item">
                        <h3 className="edu-degree" contentEditable suppressContentEditableWarning onBlur={(e) => updateEducation(edu.id, 'degree', e.currentTarget.textContent || '')}>{edu.degree}</h3>
                        <p className="edu-field" contentEditable suppressContentEditableWarning onBlur={(e) => updateEducation(edu.id, 'field', e.currentTarget.textContent || '')}>{edu.field}</p>
                        <p className="edu-school">{edu.school} • {edu.year}</p>
                    </div>
                ))}
            </section>
        );

        const skillsSection = (
            <section className="resume-section skills-section">
                <h2 className="section-title">Skills</h2>
                <div className="skills-list">
                    {resume.skills.map((skill, idx) => (
                        <span key={idx} className="skill-item" contentEditable suppressContentEditableWarning onBlur={(e) => {
                            const newSkills = [...resume.skills];
                            newSkills[idx] = e.currentTarget.textContent || '';
                            updateSkills(newSkills);
                        }}>{skill}</span>
                    ))}
                </div>
            </section>
        );

        const sectionMap: Record<string, React.ReactNode> = {
            summary: summarySection,
            experience: experienceSection,
            education: educationSection,
            skills: skillsSection
        };

        // Render based on layout
        if (layout === 'sidebar-left') {
            return (
                <div className="resume-layout sidebar-left">
                    <aside className="sidebar" style={{ backgroundColor: design.primaryColor }}>
                        {headerSection}
                        {contactSection}
                        {skillsSection}
                        {educationSection}
                    </aside>
                    <main className="main-content">
                        {/* Dynamic main content based on order */}
                        {resume.sections.filter(s => ['summary', 'experience'].includes(s.type)).map(s => (
                            <div key={s.id}>{sectionMap[s.type]}</div>
                        ))}
                    </main>
                </div>
            );
        }

        if (layout === 'sidebar-right') {
            return (
                <div className="resume-layout sidebar-right">
                    <main className="main-content">
                        {headerSection}
                        {/* Dynamic main content */}
                        {resume.sections.filter(s => ['summary', 'experience'].includes(s.type)).map(s => (
                            <div key={s.id}>{sectionMap[s.type]}</div>
                        ))}
                    </main>
                    <aside className="sidebar" style={{ backgroundColor: design.primaryColor }}>
                        {contactSection}
                        {skillsSection}
                        {educationSection}
                    </aside>
                </div>
            );
        }

        if (layout === 'two-column') {
            return (
                <div className="resume-layout two-column">
                    <header className="full-header" style={{ borderColor: design.primaryColor }}>
                        {headerSection}
                        {contactSection}
                    </header>
                    <div className="columns">
                        <div className="column-left">
                            {/* Dynamic left column */}
                            {resume.sections.filter(s => ['summary', 'experience'].includes(s.type)).map(s => (
                                <div key={s.id}>{sectionMap[s.type]}</div>
                            ))}
                        </div>
                        <div className="column-right">
                            {skillsSection}
                            {educationSection}
                        </div>
                    </div>
                </div>
            );
        }

        // Default single column - Fully dynamic
        return (
            <div className="resume-layout single-column">
                <header className="single-header" style={{ borderColor: design.primaryColor }}>
                    {headerSection}
                    <div className="header-contact">{contactSection}</div>
                </header>
                {resume.sections.filter(s => s.id !== 'header').map(s => (
                    <div key={s.id}>{sectionMap[s.type]}</div>
                ))}
            </div>
        );
    };

    return (
        <div className="resume-builder">
            {/* Top Toolbar */}
            <div className="builder-toolbar">
                <div className="toolbar-left">
                    <button className="toolbar-btn" onClick={() => setActivePanel(activePanel === 'templates' ? null : 'templates')}>
                        <Layout size={18} />
                        Templates
                        {activePanel === 'templates' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="toolbar-btn" onClick={() => setActivePanel(activePanel === 'design' ? null : 'design')}>
                        <Palette size={18} />
                        Design
                        {activePanel === 'design' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="toolbar-btn" onClick={() => setActivePanel(activePanel === 'sections' ? null : 'sections')}>
                        <List size={18} />
                        Sections
                        {activePanel === 'sections' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="toolbar-btn ai-btn" onClick={handleAIEnhance} disabled={isEnhancing}>
                        {isEnhancing ? <Loader2 size={18} className="spin" /> : <Wand2 size={18} />}
                        {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                    </button>
                </div>
                <div className="toolbar-right">
                    <button className="toolbar-btn" onClick={handleExportWord} disabled={isExporting}>
                        <FileDown size={18} />
                        DOCX
                    </button>
                    <button className="toolbar-btn primary" onClick={handleExportPDF} disabled={isExporting}>
                        <Download size={18} />
                        {isExporting ? 'Exporting...' : 'Download PDF'}
                    </button>
                    {onClose && (
                        <button className="toolbar-btn close-btn" onClick={onClose}>
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Templates Panel */}
            {activePanel === 'templates' && (
                <div className="panel templates-panel">
                    <div className="templates-grid">
                        {TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                className={`template-card ${design.templateId === template.id ? 'selected' : ''}`}
                                onClick={() => setDesign(prev => ({ ...prev, templateId: template.id }))}
                            >
                                <div className="template-preview" style={{ '--preview-color': template.previewColor } as any}>
                                    <div className={`preview-layout ${template.layout}`}>
                                        {template.layout.includes('sidebar') && <div className="preview-sidebar"></div>}
                                        <div className="preview-content">
                                            <div className="preview-line"></div>
                                            <div className="preview-line short"></div>
                                        </div>
                                    </div>
                                </div>
                                <span className="template-name">{template.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Design Panel */}
            {activePanel === 'design' && (
                <div className="panel design-panel">
                    <div className="design-section">
                        <h4>Colors</h4>
                        <div className="color-picker">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`color-btn ${design.primaryColor === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setDesign(prev => ({ ...prev, primaryColor: color }))}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="design-section">
                        <h4>Font Style</h4>
                        <div className="font-size-options">
                            {(['small', 'normal', 'large'] as const).map(size => (
                                <button
                                    key={size}
                                    className={`size-btn ${design.fontSize === size ? 'selected' : ''}`}
                                    onClick={() => setDesign(prev => ({ ...prev, fontSize: size }))}
                                >
                                    <span className={`size-preview ${size}`}>A</span>
                                    <span className="size-label">{size.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="design-section">
                        <h4>Font Family</h4>
                        <select
                            className="font-select"
                            value={design.fontFamily}
                            onChange={(e) => setDesign(prev => ({ ...prev, fontFamily: e.target.value }))}
                        >
                            {FONTS.map(font => (
                                <option key={font.value} value={font.value}>{font.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="design-section">
                        <h4>Section Spacing</h4>
                        <input
                            type="range"
                            min="20"
                            max="100"
                            value={design.sectionSpacing}
                            onChange={(e) => setDesign(prev => ({ ...prev, sectionSpacing: parseInt(e.target.value) }))}
                            className="slider"
                        />
                    </div>

                    <div className="design-section">
                        <h4>Line Spacing</h4>
                        <input
                            type="range"
                            min="20"
                            max="100"
                            value={design.lineSpacing}
                            onChange={(e) => setDesign(prev => ({ ...prev, lineSpacing: parseInt(e.target.value) }))}
                            className="slider"
                        />
                    </div>

                    <button className="reset-btn" onClick={() => setDesign(DEFAULT_DESIGN)}>
                        Reset to Default
                    </button>
                </div>
            )}

            {/* Sections Panel */}
            {activePanel === 'sections' && (
                <div className="panel design-panel">
                    <h4>Reorder Sections</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Drag to reorder sections. Some layouts may enforce fixed positions.</p>
                    <div className="sections-list">
                        {resume.sections.filter(s => s.id !== 'header').map((section) => (
                            <div
                                key={section.id}
                                className="section-drag-item"
                                draggable
                                onDragStart={() => handleDragStart(section.id)}
                                onDragOver={(e) => handleDragOver(e, section.id)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    opacity: draggedSection === section.id ? 0.5 : 1,
                                    padding: '12px',
                                    border: '1px solid #e5e7eb',
                                    marginBottom: '8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'move',
                                    background: 'white'
                                }}
                            >
                                <GripVertical size={16} color="#9ca3af" />
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>{section.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Resume Preview */}
            <div className="resume-container">
                <div
                    ref={resumeRef}
                    className={`resume-paper template-${design.templateId}`}
                    style={{
                        '--primary-color': design.primaryColor,
                        '--font-family': design.fontFamily,
                        '--font-size': getFontSize(),
                        '--section-spacing': `${design.sectionSpacing * 0.3}px`,
                        '--line-spacing': `${1.2 + design.lineSpacing * 0.01}`,
                    } as React.CSSProperties}
                >
                    {renderResume()}
                </div>
            </div>
        </div>
    );
}
