'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, MemoryCategory } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { LogOut, X, Plus, Home, Heart, Briefcase, Activity, Share2, Calendar, MapPin, Trash2, Camera, User, ChevronLeft, ChevronRight, Download, Clock, HelpCircle } from 'lucide-react';
import { CATEGORY_COLORS } from '@/store/useStore';

export const UIOverlay: React.FC = () => {
    const router = useRouter();
    const { 
        memories, 
        buildings, 
        selectedBuildingId, 
        isRepositioning, 
        repositioningBuildingId,
        previewPosition,
        isLoading,
        gridSize,
        addMemory, 
        removeMemory, 
        selectBuilding,
        fetchMemories,
        theme,
        startRepositioning,
        cancelRepositioning,
        commitReposition,
        setPreviewPosition,
        isTileValidForReposition,
        timelineActive,
        timelinePercent,
        setTimelineActive,
        setTimelinePercent,
        getVisibleBuildingIds,
    } = useStore() as any;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCore, setIsCore] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [draftId, setDraftId] = useState('');
    const [relocCoordX, setRelocCoordX] = useState('');
    const [relocCoordZ, setRelocCoordZ] = useState('');
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [timelinePanelOpen, setTimelinePanelOpen] = useState(false);
    const [exportNotification, setExportNotification] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<MemoryCategory | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        caption: '',
        category: MemoryCategory.OTHER,
        impact: 50,
        fondness: 50,
        date: new Date().toISOString().split('T')[0],
        image: null as File | null
    });

    useEffect(() => {
        if (isModalOpen && !draftId) {
            setDraftId(`MEM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
        } else if (!isModalOpen) {
            setDraftId('');
        }
    }, [isModalOpen]);

    // Sync coordinate inputs when previewPosition changes (e.g. user clicks a tile)
    useEffect(() => {
        if (previewPosition) {
            setRelocCoordX(String(previewPosition.x));
            setRelocCoordZ(String(previewPosition.z));
        }
    }, [previewPosition]);

    useEffect(() => {
        fetchMemories();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error.message);
        } else {
            window.location.href = '/';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addMemory({
            ...formData,
            date: new Date(formData.date),
            isCore
        });
        setIsModalOpen(false);
        setIsCore(false);
        setFormData({
            title: '',
            caption: '',
            category: MemoryCategory.OTHER,
            impact: 5,
            fondness: 5,
            date: new Date().toISOString().split('T')[0],
            image: null
        });
    };

    const handleCancelModal = () => {
        setIsModalOpen(false);
        setIsCore(false);
        setFormData({
            title: '',
            caption: '',
            category: MemoryCategory.OTHER,
            impact: 50,
            fondness: 50,
            date: new Date().toISOString().split('T')[0],
            image: null
        });
        setIsDropdownOpen(false);
    };

    /* ── 2D Map Export ── */
    const handleExport2DMap = () => {
        const cellSize = 48;
        const padding = 80;
        const legendW = 200;
        const canvasW = gridSize * cellSize + padding * 2 + legendW;
        const canvasH = gridSize * cellSize + padding * 2 + 60;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(canvasW, 1920);
        canvas.height = Math.max(canvasH, 1920);
        const ctx = canvas.getContext('2d')!;

        // Background
        ctx.fillStyle = '#0f1a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#d1fae5';
        ctx.font = 'bold 28px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Skyline City Map — ${gridSize}×${gridSize} Grid`, canvas.width / 2, 40);

        const offsetX = padding;
        const offsetY = padding + 20;

        // Grid lines
        ctx.strokeStyle = 'rgba(110,231,183,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + i * cellSize, offsetY);
            ctx.lineTo(offsetX + i * cellSize, offsetY + gridSize * cellSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + i * cellSize);
            ctx.lineTo(offsetX + gridSize * cellSize, offsetY + i * cellSize);
            ctx.stroke();
        }

        // Axis labels
        ctx.fillStyle = '#6ee7b780';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < gridSize; i++) {
            ctx.fillText(String(i), offsetX + i * cellSize + cellSize / 2, offsetY - 6);
            ctx.fillText(String(i), offsetX - 14, offsetY + i * cellSize + cellSize / 2 + 4);
        }

        // Draw empty cells (light grey)
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.fillRect(offsetX + x * cellSize + 1, offsetY + z * cellSize + 1, cellSize - 2, cellSize - 2);
            }
        }

        // Draw buildings
        buildings.forEach((b: any) => {
            const mem = memories.find((m: any) => m.id === b.memoryId);
            if (!mem) return;
            const color = b.color || '#FFD700';
            const isCore = !!b.isCore;
            const footprint = isCore ? 5 : 2;
            const halfFp = Math.floor(footprint / 2);
            const startX = b.position.x - halfFp;
            const startZ = b.position.z - halfFp;

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.75;
            for (let dx = 0; dx < footprint; dx++) {
                for (let dz = 0; dz < footprint; dz++) {
                    const gx = startX + dx;
                    const gz = startZ + dz;
                    if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
                        ctx.fillRect(
                            offsetX + gx * cellSize + 2,
                            offsetY + gz * cellSize + 2,
                            cellSize - 4,
                            cellSize - 4
                        );
                    }
                }
            }
            ctx.globalAlpha = 1;

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Inter, Arial, sans-serif';
            ctx.textAlign = 'center';
            const title = (mem.title || '').replace('[CORE] ', '').substring(0, 12);
            ctx.fillText(
                title,
                offsetX + b.position.x * cellSize + cellSize / 2,
                offsetY + b.position.z * cellSize + cellSize / 2 + 3
            );
        });

        // Legend
        const legendX = offsetX + gridSize * cellSize + 40;
        const legendY = offsetY + 20;
        ctx.fillStyle = '#d1fae5';
        ctx.font = 'bold 14px Inter, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Legend', legendX, legendY);

        const categories = [
            { name: 'Career', color: '#4A90E2' },
            { name: 'Health', color: '#FF69B4' },
            { name: 'Relationships', color: '#90EE90' },
            { name: 'Personal', color: '#FF6B6B' },
            { name: 'Other', color: '#FFD700' },
        ];
        categories.forEach((cat, i) => {
            const y = legendY + 24 + i * 28;
            ctx.fillStyle = cat.color;
            ctx.globalAlpha = 0.75;
            ctx.fillRect(legendX, y - 10, 18, 18);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#d1fae5';
            ctx.font = '12px Inter, Arial, sans-serif';
            ctx.fillText(cat.name, legendX + 26, y + 4);
        });

        // Footer
        const now = new Date();
        ctx.fillStyle = '#6ee7b760';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Exported: ${now.toISOString().split('T')[0]} | ${memories.length} memories | Skyline Engine`,
            canvas.width / 2,
            canvas.height - 20
        );

        // Download
        const link = document.createElement('a');
        const ts = now.toISOString().replace(/[:.]/g, '').replace('T', '_').substring(0, 15);
        link.download = `skyline_map_${ts}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setExportNotification(true);
        setTimeout(() => setExportNotification(false), 3000);
    };

    const selectedBuilding = buildings.find((b: any) => b.id === selectedBuildingId);

    /* ─── inline styles for glass sidebar ─── */
    const sidebarStyles: React.CSSProperties = {
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        borderRadius: '20px',
        position: 'relative' as const,
        overflow: 'hidden',
    };

    const glassCard: React.CSSProperties = {
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    };

    return (
        <div className="relative w-full h-full pointer-events-none" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ─── Bottom Right: Logout + Navigator (beside music icon) ─── */}
            <div
                className="pointer-events-auto"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '72px', // music icon is at right:20px, so we start at 72px
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                {/* Navigator HUD */}
                <div style={{
                    ...glassCard,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    height: '40px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={12} color="#6ee7b7" />
                        <span style={{ fontSize: '9px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1px' }}>Nav</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontWeight: 700, fontSize: '12px', color: '#d1fae5' }}>
                        {['X', 'Y', 'Z'].map((axis, i) => (
                            <div key={axis} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '7px', color: '#6ee7b780', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>{axis}</span>
                                <span>{i === 0 ? (selectedBuilding?.position.x.toFixed(1) || '0.0') : i === 1 ? (selectedBuilding?.height.toFixed(1) || '0.0') : (selectedBuilding?.position.z.toFixed(1) || '0.0')}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Logout / Back Button */}
                <button
                    onClick={handleLogout}
                    title="Exit to Homepage"
                    style={{
                        ...glassCard,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: '#6ee7b7aa',
                        border: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#6ee7b7aa';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                    }}
                >
                    <LogOut size={16} />
                </button>
            </div>

            {/* ─── SIDEBAR ─── */}
            <div 
                className="absolute top-0 left-0 h-full pointer-events-auto"
                style={{
                    width: sidebarOpen ? '340px' : '60px',
                    padding: sidebarOpen ? '16px' : '16px 6px',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Toggle button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: '-14px',
                        transform: 'translateY(-50%)',
                        zIndex: 30,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #34d399, #10b981)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.5)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(1)')}
                >
                    {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                <div 
                    style={{
                        ...sidebarStyles,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: sidebarOpen ? '20px' : '8px',
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        ...(sidebarOpen ? {} : { alignItems: 'center', justifyContent: 'center' }),
                    }}
                >
                    {/* Subtle corner glow */}
                    <div style={{
                        position: 'absolute',
                        width: '200px',
                        height: '200px',
                        background: '#10b981',
                        filter: 'blur(120px)',
                        top: '-50px',
                        left: '-50px',
                        opacity: 0.3,
                        pointerEvents: 'none',
                    }} />

                    {/* ── Collapsed state ── */}
                    {!sidebarOpen && (
                        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #34d399, #10b981)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                boxShadow: '0 0 15px rgba(52,211,153,0.5)',
                            }}>
                                <Home size={20} />
                            </div>
                        </div>
                    )}

                    {/* ── Expanded state ── */}
                    {sidebarOpen && (
                        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ fontSize: '22px', fontWeight: 600, color: '#d1fae5', letterSpacing: '-0.3px' }}>
                                    Skyline
                                </div>
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    title="User Guide"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#6ee7b7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(16,185,129,0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)';
                                        e.currentTarget.style.color = '#34d399';
                                        e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.25)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                        e.currentTarget.style.color = '#6ee7b7';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <HelpCircle size={16} />
                                </button>
                            </div>

                            {/* Stats Card */}
                            <div style={{
                                ...glassCard,
                                padding: '22px',
                                textAlign: 'center',
                                marginBottom: '16px',
                            }}>
                                <div style={{ fontSize: '11px', color: '#6ee7b7', marginBottom: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                    Total Memories
                                </div>
                                <div style={{
                                    fontSize: '56px',
                                    fontWeight: 700,
                                    color: '#34d399',
                                    textShadow: '0 0 20px rgba(52,211,153,0.6)',
                                    lineHeight: 1,
                                }}>
                                    {memories.length}
                                </div>
                            </div>

                            {/* Add Memory Button */}
                            <button
                                onClick={() => setIsModalOpen(true)}
                                style={{
                                    ...glassCard,
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '999px',
                                    background: 'rgba(16,185,129,0.15)',
                                    border: '1px solid rgba(52,211,153,0.4)',
                                    color: '#a7f3d0',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginBottom: '20px',
                                    fontSize: '13px',
                                    letterSpacing: '0.5px',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.25)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.15)';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                                }}
                            >
                                <Plus size={16} /> New Memory
                            </button>

                            {/* Section Title */}
                            <div style={{ fontSize: '11px', color: '#6ee7b7', marginBottom: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                Memory Records
                            </div>

                            {/* Search bar */}
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Search memories..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 32px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#d1fae5',
                                        fontSize: '12px',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(52,211,153,0.4)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                />
                                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                            </div>

                            {/* Category Filters */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {[
                                        { key: MemoryCategory.HEALTH, label: 'Health', color: '#FF69B4' },
                                        { key: MemoryCategory.RELATIONSHIPS, label: 'Relation', color: '#90EE90' },
                                        { key: MemoryCategory.CAREER, label: 'Career', color: '#4A90E2' },
                                        { key: MemoryCategory.PERSONAL, label: 'Personal', color: '#FF6B6B' },
                                        { key: MemoryCategory.OTHER, label: 'Other', color: '#FFD700' },
                                    ].map((f) => {
                                        const isActive = activeFilter === f.key;
                                        return (
                                            <button
                                                key={f.key}
                                                onClick={() => setActiveFilter(f.key)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    fontFamily: 'inherit',
                                                    letterSpacing: '0.3px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    border: isActive
                                                        ? `1px solid ${f.color}80`
                                                        : '1px solid rgba(255,255,255,0.08)',
                                                    background: isActive
                                                        ? `${f.color}20`
                                                        : 'rgba(255,255,255,0.04)',
                                                    color: isActive ? f.color : '#6ee7b780',
                                                    boxShadow: isActive
                                                        ? `0 0 8px ${f.color}25`
                                                        : 'none',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.background = `${f.color}12`;
                                                        e.currentTarget.style.color = `${f.color}cc`;
                                                        e.currentTarget.style.borderColor = `${f.color}30`;
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                                        e.currentTarget.style.color = '#6ee7b780';
                                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                                    }
                                                }}
                                            >
                                                {f.label}
                                            </button>
                                        );
                                    })}
                                    {activeFilter && (
                                        <button
                                            onClick={() => setActiveFilter(null)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '20px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                fontFamily: 'inherit',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                border: '1px solid rgba(239,68,68,0.25)',
                                                background: 'rgba(239,68,68,0.08)',
                                                color: '#f87171',
                                                letterSpacing: '0.3px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                                            }}
                                        >
                                            <X size={10} /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Memory List */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }} className="scrollbar-hide">
                                {memories.filter((m: any) => {
                                    const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesFilter = !activeFilter || m.category === activeFilter;
                                    return matchesSearch && matchesFilter;
                                }).map((memory: any) => {
                                    const isSelected = selectedBuildingId === memory.id;
                                    const building = buildings.find((b: any) => b.memoryId === memory.id);
                                    const accentColor = building?.color || '#34d399';

                                    return (
                                        <div
                                            key={memory.id}
                                            onClick={() => selectBuilding(memory.id)}
                                            style={{
                                                ...glassCard,
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.25s ease',
                                                ...(isSelected ? {
                                                    border: '1px solid rgba(52,211,153,0.5)',
                                                    boxShadow: '0 0 20px rgba(52,211,153,0.25), 0 10px 30px rgba(0,0,0,0.4)',
                                                    background: 'rgba(255,255,255,0.1)',
                                                } : {}),
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }
                                            }}
                                        >
                                            {/* Accent bar */}
                                            <div style={{
                                                width: '5px',
                                                height: '38px',
                                                borderRadius: '4px',
                                                marginRight: '14px',
                                                flexShrink: 0,
                                                background: `linear-gradient(${accentColor}, ${accentColor}dd)`,
                                                boxShadow: `0 0 10px ${accentColor}99`,
                                            }} />
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#d1fae5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {memory.title || 'Untitled Record'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '3px', fontWeight: 400 }}>
                                                    {memory.category?.charAt(0).toUpperCase() + memory.category?.slice(1)} · Impact: {memory.impact}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {memories.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                        <p style={{ fontSize: '12px', color: '#6ee7b780', fontStyle: 'italic' }}>No memories yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '9px', color: '#6ee7b760', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Skyline Engine V1.2</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── FIXED TOP-RIGHT DETAILS PANEL ─── */}
            {selectedBuildingId && (() => {
                const selMemory = memories.find((m: any) => m.id === selectedBuildingId);
                const selBuilding = buildings.find((b: any) => b.id === selectedBuildingId);
                if (!selMemory) return null;
                const isCore = selMemory.title?.startsWith('[CORE]');
                const displayTitle = isCore ? selMemory.title.replace('[CORE] ', '') : selMemory.title;
                const accentColor = isCore ? '#fcd34d' : '#34d399';

                return (
                    <div
                        className="fixed pointer-events-auto"
                        style={{
                            top: '24px',
                            right: '24px',
                            width: '380px',
                            maxHeight: 'calc(100vh - 48px)',
                            overflowY: 'auto',
                            zIndex: 55,
                            background: 'rgba(6, 40, 30, 0.92)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${isCore ? 'rgba(252,211,77,0.35)' : 'rgba(52,211,153,0.2)'}`,
                            borderRadius: '20px',
                            padding: '28px',
                            boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 25px ${isCore ? 'rgba(252,211,77,0.12)' : 'rgba(52,211,153,0.1)'}`,
                            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            color: 'white',
                        }}
                    >
                        {/* Close X */}
                        <button
                            onClick={() => selectBuilding(null)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                width: '28px', height: '28px', borderRadius: '50%',
                                border: `1px solid ${accentColor}40`,
                                background: 'transparent', color: accentColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >✕</button>

                        {/* Core badge */}
                        {isCore && (
                            <div style={{
                                display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                                background: 'rgba(252,211,77,0.15)', border: '1px solid rgba(252,211,77,0.3)',
                                fontSize: '10px', fontWeight: 600, color: '#fcd34d',
                                textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px',
                            }}>Core Memory</div>
                        )}

                        {/* Title */}
                        <div style={{
                            fontSize: '22px', fontWeight: 700, color: accentColor,
                            marginBottom: '4px', paddingRight: '30px', lineHeight: 1.2,
                        }}>{displayTitle}</div>

                        {/* Caption */}
                        {selMemory.caption && (
                            <p style={{
                                fontSize: '13px', color: '#e2e8f0', fontStyle: 'italic',
                                opacity: 0.7, lineHeight: 1.5, margin: '6px 0 16px 0',
                            }}>"{selMemory.caption}"</p>
                        )}

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0 16px 0' }} />

                        {/* Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Memory ID */}
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '5px' }}>Memory ID</div>
                                <div style={{
                                    padding: '8px 12px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace',
                                }}>{selMemory.id}</div>
                            </div>

                            {/* Date */}
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '5px' }}>Date</div>
                                <div style={{
                                    padding: '8px 12px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '13px', color: '#d1fae5',
                                }}>{selMemory.date ? new Date(selMemory.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
                            </div>

                            {/* Fondness */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Fondness</span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: accentColor }}>{selMemory.fondness}</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${selMemory.fondness}%`, borderRadius: '3px', background: `linear-gradient(to right, ${accentColor}88, ${accentColor})`, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>

                            {/* Impact */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Impact</span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: accentColor }}>{selMemory.impact}</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${selMemory.impact}%`, borderRadius: '3px', background: `linear-gradient(to right, ${accentColor}88, ${accentColor})`, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>

                            {/* Position */}
                            {selBuilding && (
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '5px' }}>Position</div>
                                    <div style={{
                                        padding: '8px 12px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace',
                                    }}>X: {selBuilding.position.x} &nbsp;·&nbsp; Z: {selBuilding.position.z}</div>
                                </div>
                            )}

                            {/* Image */}
                            {selMemory.imageUrl && (
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>Attached Image</div>
                                    <img
                                        src={selMemory.imageUrl}
                                        alt="Memory"
                                        style={{
                                            width: '100%', borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            maxHeight: '180px', objectFit: 'cover',
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '18px 0 16px 0' }} />

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => selectBuilding(null)}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${accentColor}60`,
                                    color: accentColor, fontWeight: 600, fontSize: '12px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 15px ${accentColor}40`; e.currentTarget.style.background = `${accentColor}15`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            >Close</button>
                            <button
                                onClick={() => startRepositioning(selectedBuildingId)}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: '12px',
                                    background: 'rgba(124,207,255,0.08)',
                                    border: '1px solid rgba(124,207,255,0.4)',
                                    color: '#7ecfff', fontWeight: 600, fontSize: '12px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(124,207,255,0.3)'; e.currentTarget.style.background = 'rgba(124,207,255,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(124,207,255,0.08)'; }}
                            >Relocate</button>
                            <button
                                onClick={() => setConfirmAction({ message: `Are you sure you want to demolish "${displayTitle}"? This action cannot be undone.`, onConfirm: () => { removeMemory(selMemory.id); setConfirmAction(null); } })}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: '12px',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.4)',
                                    color: '#ef4444', fontWeight: 600, fontSize: '12px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                            >Demolish</button>
                        </div>
                    </div>
                );
            })()}

            {/* ─── RELOCATION BAR ─── */}
            {isRepositioning && repositioningBuildingId && (() => {
                const relocBuilding = buildings.find((b: any) => b.id === repositioningBuildingId);
                const relocMemory = memories.find((m: any) => m.id === repositioningBuildingId);
                const isValid = previewPosition ? isTileValidForReposition(previewPosition.x, previewPosition.z) : false;

                return (
                    <div
                        className="fixed bottom-8 left-1/2 pointer-events-auto"
                        style={{
                            transform: 'translateX(-50%)',
                            zIndex: 60,
                            background: 'rgba(6, 40, 30, 0.92)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(124,207,255,0.3)',
                            borderRadius: '20px',
                            padding: '18px 28px',
                            boxShadow: '0 15px 50px rgba(0,0,0,0.6), 0 0 30px rgba(124,207,255,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '24px',
                            fontFamily: "'Inter', sans-serif",
                            minWidth: '500px',
                        }}
                    >
                        {/* Pulsing indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: '#7ecfff',
                                boxShadow: '0 0 10px #7ecfff',
                                animation: 'pulse 1.5s infinite',
                            }} />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#d1fae5' }}>
                                    Relocating: {relocMemory?.title?.replace('[CORE] ', '') || 'Building'}
                                </div>
                                <div style={{ fontSize: '10px', color: '#6ee7b780', marginTop: '2px' }}>Click a blue tile to select position</div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Coordinate inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px', color: '#7ecfff', fontWeight: 600 }}>X</span>
                                <input
                                    type="number"
                                    value={relocCoordX || (previewPosition ? String(previewPosition.x) : '')}
                                    onChange={(e) => {
                                        setRelocCoordX(e.target.value);
                                        const nx = parseInt(e.target.value);
                                        if (!isNaN(nx) && previewPosition) setPreviewPosition({ x: nx, z: previewPosition.z });
                                    }}
                                    style={{
                                        width: '50px', padding: '6px 8px', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(124,207,255,0.3)',
                                        color: 'white', outline: 'none', fontSize: '13px', textAlign: 'center',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px', color: '#7ecfff', fontWeight: 600 }}>Z</span>
                                <input
                                    type="number"
                                    value={relocCoordZ || (previewPosition ? String(previewPosition.z) : '')}
                                    onChange={(e) => {
                                        setRelocCoordZ(e.target.value);
                                        const nz = parseInt(e.target.value);
                                        if (!isNaN(nz) && previewPosition) setPreviewPosition({ x: previewPosition.x, z: nz });
                                    }}
                                    style={{
                                        width: '50px', padding: '6px 8px', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(124,207,255,0.3)',
                                        color: 'white', outline: 'none', fontSize: '13px', textAlign: 'center',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div style={{
                            fontSize: '11px', fontWeight: 600,
                            color: isValid ? '#7ecfff' : '#ff8a8a',
                            minWidth: '60px', textAlign: 'center',
                        }}>
                            {previewPosition ? (isValid ? '✓ Valid' : '✗ Invalid') : '—'}
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => {
                                    if (isValid) { commitReposition(); setRelocCoordX(''); setRelocCoordZ(''); }
                                }}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px',
                                    background: isValid ? 'rgba(124,207,255,0.2)' : 'rgba(124,207,255,0.05)',
                                    border: '1px solid rgba(124,207,255,0.4)',
                                    color: isValid ? '#7ecfff' : '#7ecfff60',
                                    fontWeight: 600, fontSize: '12px', cursor: isValid ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { if (isValid) e.currentTarget.style.boxShadow = '0 0 15px rgba(124,207,255,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                Commit
                            </button>
                            <button
                                onClick={() => { cancelRepositioning(); setRelocCoordX(''); setRelocCoordZ(''); }}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px',
                                    background: 'rgba(255,138,138,0.1)',
                                    border: '1px solid rgba(255,138,138,0.4)',
                                    color: '#ff8a8a', fontWeight: 600, fontSize: '12px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(255,138,138,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Pulse animation for relocation indicator */}
            {isRepositioning && (
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(0.85); }
                    }
                `}</style>
            )}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto overflow-y-auto"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={handleCancelModal}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            background: 'rgba(6, 40, 30, 0.9)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(52,211,153,0.2)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
                            borderRadius: '20px',
                            position: 'relative' as const,
                            width: '35vw',
                            minWidth: '380px',
                            padding: '22px 26px',
                        }}
                    >
                        {/* Corner glow */}
                        <div style={{ position: 'absolute', width: '180px', height: '180px', background: '#10b981', filter: 'blur(100px)', top: '-40px', left: '-40px', opacity: 0.25, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', width: '150px', height: '150px', background: '#34d399', filter: 'blur(100px)', bottom: '-30px', right: '-30px', opacity: 0.15, pointerEvents: 'none' }} />

                        {/* Close */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCancelModal(); }} 
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                zIndex: 10,
                                width: '32px', height: '32px', borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'transparent', color: '#6ee7b7',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d1fae5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6ee7b7'; }}
                        >
                            <X size={16} />
                        </button>

                        {/* Header */}
                        <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#d1fae5', letterSpacing: '-0.3px', marginBottom: '2px', lineHeight: 1.2 }}>Record Memory</h2>
                            <p style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 400, fontStyle: 'italic' }}>{draftId}</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
                            {/* Title */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Memory Title</label>
                                <input
                                    style={{
                                        width: '100%', padding: '9px 14px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#d1fae5', outline: 'none', fontSize: '13px', fontWeight: 500,
                                        fontFamily: 'inherit', transition: 'all 0.2s', boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(52,211,153,0.5)'; e.target.style.boxShadow = '0 0 10px rgba(52,211,153,0.15)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            {/* Caption (optional) */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Caption <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: '0' }}>(optional)</span></label>
                                <textarea
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#d1fae5', outline: 'none', fontSize: '12px', fontWeight: 400,
                                        fontFamily: 'inherit', transition: 'all 0.2s', boxSizing: 'border-box',
                                        resize: 'none', height: '48px',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(52,211,153,0.5)'; e.target.style.boxShadow = '0 0 10px rgba(52,211,153,0.15)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                                    placeholder="A short note about this memory..."
                                    value={formData.caption}
                                    onChange={e => setFormData({...formData, caption: e.target.value})}
                                />
                            </div>

                            {/* Category + Date row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                {/* Category */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Category</label>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            style={{
                                                width: '100%', padding: '14px 18px', borderRadius: '14px',
                                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#d1fae5', fontSize: '15px', cursor: 'pointer',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                transition: 'all 0.2s', boxSizing: 'border-box',
                                            }}
                                        >
                                            <span>{formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}</span>
                                            <svg width="12" height="7" viewBox="0 0 14 8" fill="none" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                <path d="M1 1L7 7L13 1" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        {isDropdownOpen && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, marginTop: '6px',
                                                width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 50,
                                                background: 'rgba(6, 40, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
                                            }}>
                                                {Object.values(MemoryCategory).map(cat => (
                                                    <div 
                                                        key={cat}
                                                        onClick={() => { setFormData({...formData, category: cat}); setIsDropdownOpen(false); }}
                                                        style={{
                                                            padding: '12px 18px', color: '#d1fae5', fontSize: '14px',
                                                            cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500,
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.15)'; e.currentTarget.style.color = '#6ee7b7'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d1fae5'; }}
                                                    >
                                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Event Date</label>
                                    <input
                                        type="date"
                                        style={{
                                            width: '100%', padding: '14px 18px', borderRadius: '14px',
                                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#d1fae5', outline: 'none', fontSize: '15px', fontWeight: 500,
                                            fontFamily: 'inherit', transition: 'all 0.2s', boxSizing: 'border-box',
                                            colorScheme: 'dark',
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = 'rgba(52,211,153,0.5)'; e.target.style.boxShadow = '0 0 15px rgba(52,211,153,0.15)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Sliders */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                                {/* Impact */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Impact Score</label>
                                        <span style={{ fontSize: '20px', fontWeight: 600, color: '#67e8f9' }}>{formData.impact}</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={formData.impact}
                                        onChange={e => setFormData({...formData, impact: parseInt(e.target.value)})}
                                        style={{ width: '100%', accentColor: '#67e8f9', height: '4px', cursor: 'pointer' }}
                                        className="appearance-none bg-white/10 rounded-lg outline-none"
                                    />
                                </div>
                                {/* Fondness */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Fondness Score</label>
                                        <span style={{ fontSize: '20px', fontWeight: 600, color: '#fda4af' }}>{formData.fondness}</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={formData.fondness}
                                        onChange={e => setFormData({...formData, fondness: parseInt(e.target.value)})}
                                        style={{ width: '100%', accentColor: '#fda4af', height: '4px', cursor: 'pointer' }}
                                        className="appearance-none bg-white/10 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            {/* Image upload */}
                            <div style={{ marginBottom: '20px' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="image-upload"
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            setFormData({...formData, image: e.target.files[0]});
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="image-upload"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        width: '100%', padding: '16px', borderRadius: '14px',
                                        border: '1.5px dashed rgba(52,211,153,0.4)', background: 'transparent',
                                        color: '#6ee7b7', fontSize: '11px', fontWeight: 600,
                                        textTransform: 'uppercase', letterSpacing: '1.5px',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.6)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; }}
                                >
                                    <Plus size={16} /> Attach Image
                                </label>
                                {formData.image && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ height: '70px', width: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <img src={URL.createObjectURL(formData.image)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Core Memory checkbox */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                <div
                                    onClick={() => setIsCore(!isCore)}
                                    style={{
                                        width: '22px', height: '22px', borderRadius: '6px',
                                        border: isCore ? '2px solid #34d399' : '2px solid rgba(255,255,255,0.3)',
                                        background: isCore ? '#34d399' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                    }}
                                >
                                    {isCore && (
                                        <svg width="12" height="10" viewBox="0 0 20 20" fill="white">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <span 
                                    onClick={() => setIsCore(!isCore)}
                                    style={{ fontSize: '12px', fontWeight: 600, color: '#d1fae5', cursor: 'pointer', letterSpacing: '0.5px' }}
                                >
                                    🏰 Core Memory (Castle)
                                </span>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '999px',
                                    background: 'linear-gradient(135deg, #34d399, #10b981)',
                                    color: 'white', fontWeight: 700, fontSize: '13px',
                                    textTransform: 'uppercase', letterSpacing: '1.5px',
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 8px 25px rgba(16,185,129,0.4)',
                                    transition: 'all 0.2s',
                                    opacity: isLoading ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.boxShadow = '0 12px 35px rgba(16,185,129,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {isLoading ? 'Processing...' : 'Construct Instance'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* ─── CUSTOM CONFIRMATION MODAL ─── */}
            {confirmAction && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
                    onClick={() => setConfirmAction(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '400px',
                            padding: '32px',
                            borderRadius: '24px',
                            background: 'rgba(6, 40, 30, 0.95)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(239,68,68,0.1)',
                            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            color: 'white',
                            textAlign: 'center',
                            position: 'relative',
                        }}
                    >
                        {/* Corner glow */}
                        <div style={{ position: 'absolute', width: '120px', height: '120px', background: '#ef4444', filter: 'blur(80px)', top: '-30px', left: '50%', transform: 'translateX(-50%)', opacity: 0.15, pointerEvents: 'none' }} />

                        {/* Warning icon */}
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px auto', fontSize: '28px',
                        }}>⚠️</div>

                        {/* Title */}
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fecaca', marginBottom: '10px' }}>Confirm Action</div>

                        {/* Message */}
                        <p style={{ fontSize: '14px', color: '#d1fae5', opacity: 0.8, lineHeight: 1.6, margin: '0 0 28px 0' }}>
                            {confirmAction.message}
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setConfirmAction(null)}
                                style={{
                                    flex: 1, padding: '12px 0', borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#94a3b8', fontWeight: 600, fontSize: '13px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#e2e8f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                            >Cancel</button>
                            <button
                                onClick={() => confirmAction.onConfirm()}
                                style={{
                                    flex: 1, padding: '12px 0', borderRadius: '14px',
                                    background: 'rgba(239,68,68,0.2)',
                                    border: '1px solid rgba(239,68,68,0.5)',
                                    color: '#ef4444', fontWeight: 600, fontSize: '13px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.35)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(239,68,68,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >Demolish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TIME SCROLLER (Top of screen) ─── */}
            {timelineActive && (
                <div
                    className="fixed pointer-events-auto"
                    style={{
                        top: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 58,
                        width: '60vw',
                        minWidth: '500px',
                        maxWidth: '900px',
                        background: 'rgba(6, 40, 30, 0.92)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: '20px',
                        padding: '18px 28px',
                        boxShadow: '0 15px 50px rgba(0,0,0,0.6), 0 0 30px rgba(168,85,247,0.12)',
                        fontFamily: "'Inter', sans-serif",
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: '#a855f7', boxShadow: '0 0 10px #a855f7',
                                animation: 'pulse 1.5s infinite',
                            }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e9d5ff' }}>Timeline Mode</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Construction count */}
                            <span style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 600 }}>
                                {(() => {
                                    const sorted = [...memories].sort((a: any, b: any) =>
                                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                                    );
                                    const visibleCount = Math.round((timelinePercent / 100) * sorted.length);
                                    return `${visibleCount} of ${sorted.length} buildings`;
                                })()}
                            </span>
                            {/* Percentage */}
                            <span style={{
                                fontSize: '18px', fontWeight: 700, color: '#a855f7',
                                minWidth: '50px', textAlign: 'right',
                                textShadow: '0 0 10px rgba(168,85,247,0.5)',
                            }}>{Math.round(timelinePercent)}%</span>
                            {/* Exit button */}
                            <button
                                onClick={() => { setTimelineActive(false); setTimelinePanelOpen(false); }}
                                style={{
                                    padding: '6px 14px', borderRadius: '10px',
                                    background: 'rgba(168,85,247,0.15)',
                                    border: '1px solid rgba(168,85,247,0.4)',
                                    color: '#c4b5fd', fontWeight: 600, fontSize: '11px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                    letterSpacing: '0.5px',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.3)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(168,85,247,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >Return to Present</button>
                        </div>
                    </div>

                    {/* Slider */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={timelinePercent}
                            onChange={(e) => setTimelinePercent(parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                accentColor: '#a855f7',
                                height: '6px',
                                cursor: 'pointer',
                            }}
                            className="appearance-none bg-white/10 rounded-lg outline-none"
                        />
                        {/* Date indicator */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#c4b5fd80', fontWeight: 500 }}>
                                {(() => {
                                    const sorted = [...memories].sort((a: any, b: any) =>
                                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                                    );
                                    return sorted.length > 0
                                        ? new Date(sorted[0].createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                        : 'Start';
                                })()}
                            </span>
                            <span style={{ fontSize: '9px', color: '#c4b5fd80', fontWeight: 500 }}>
                                {(() => {
                                    const sorted = [...memories].sort((a: any, b: any) =>
                                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                                    );
                                    const visibleCount = Math.round((timelinePercent / 100) * sorted.length);
                                    const currentMem = sorted[Math.max(0, visibleCount - 1)];
                                    return currentMem
                                        ? new Date(currentMem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : '—';
                                })()}
                            </span>
                            <span style={{ fontSize: '9px', color: '#c4b5fd80', fontWeight: 500 }}>Now</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Pulse animation for timeline indicator */}
            {timelineActive && (
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(0.85); }
                    }
                `}</style>
            )}

            {/* ─── BOTTOM BAR: Export + Timeline Toggle ─── */}
            {!isModalOpen && (
            <div
                className="pointer-events-auto"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                {/* Export 2D Map */}
                <button
                    onClick={handleExport2DMap}
                    style={{
                        ...glassCard,
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6ee7b7',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.5px',
                        border: '1px solid rgba(52,211,153,0.3)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)'; }}
                >
                    <Download size={14} /> Export 2D Map
                </button>

                {/* Timeline Toggle */}
                <button
                    onClick={() => {
                        if (timelineActive) {
                            setTimelineActive(false);
                        } else {
                            setTimelineActive(true);
                        }
                    }}
                    style={{
                        ...glassCard,
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: timelineActive ? '#c4b5fd' : '#a78bfa',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.5px',
                        border: timelineActive ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.3)',
                        background: timelineActive ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)'; }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = timelineActive ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                    }}
                >
                    <Clock size={14} /> {timelineActive ? 'Exit Timeline' : 'View Timeline'}
                </button>
            </div>
            )}

            {/* ─── EXPORT SUCCESS NOTIFICATION ─── */}
            {exportNotification && (
                <div
                    className="fixed pointer-events-none"
                    style={{
                        bottom: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        background: 'rgba(16,185,129,0.2)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(52,211,153,0.5)',
                        borderRadius: '14px',
                        padding: '12px 24px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(52,211,153,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontFamily: "'Inter', sans-serif",
                        animation: 'fadeInUp 0.3s ease-out',
                    }}
                >
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(52,211,153,0.3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px',
                    }}>✓</div>
                    <span style={{ fontSize: '13px', color: '#d1fae5', fontWeight: 600 }}>Map exported successfully!</span>
                </div>
            )}
            {exportNotification && (
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                `}</style>
            )}

            {/* ─── USER GUIDE MODAL ─── */}
            {isGuideOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', animation: 'guideBackdropIn 0.25s ease-out' }}
                    onClick={() => setIsGuideOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '680px',
                            maxWidth: '90vw',
                            maxHeight: '82vh',
                            overflowY: 'auto',
                            borderRadius: '24px',
                            background: 'rgba(6, 40, 30, 0.95)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(52,211,153,0.2)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(16,185,129,0.08)',
                            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            color: '#d1fae5',
                            position: 'relative',
                            animation: 'guidePanelIn 0.3s cubic-bezier(0.16,1,0.3,1)',
                        }}
                        className="scrollbar-hide"
                    >
                        {/* Decorative corner glow */}
                        <div style={{ position: 'absolute', width: '200px', height: '200px', background: '#10b981', filter: 'blur(120px)', top: '-60px', left: '-60px', opacity: 0.2, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', width: '150px', height: '150px', background: '#34d399', filter: 'blur(100px)', bottom: '-40px', right: '-40px', opacity: 0.12, pointerEvents: 'none' }} />

                        {/* Sticky header */}
                        <div style={{
                            position: 'sticky', top: 0, zIndex: 10,
                            background: 'rgba(6, 40, 30, 0.98)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            padding: '24px 32px 18px 32px',
                            borderRadius: '24px 24px 0 0',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))',
                                    border: '1px solid rgba(52,211,153,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <HelpCircle size={18} color="#34d399" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#d1fae5', letterSpacing: '-0.3px' }}>User Guide</div>
                                    <div style={{ fontSize: '10px', color: '#6ee7b780', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>Skyline Manual</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGuideOpen(false)}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'transparent', color: '#6ee7b7',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d1fae5'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6ee7b7'; }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '8px 32px 32px 32px', position: 'relative', zIndex: 1 }}>

                            {/* Section 1: Overview */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>🏙️</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Overview</h3>
                                </div>
                                <p style={{ fontSize: '13px', color: '#d1fae5cc', lineHeight: 1.7, margin: 0 }}>
                                    Skyline is a memory-tracking and 3D journaling application where your life experiences are visualized as a growing city. Each journal entry appears as a <strong style={{ color: '#6ee7b7' }}>skyscraper</strong>, while your most meaningful memories become <strong style={{ color: '#fcd34d' }}>castles</strong>. Over time, your city evolves into a visual map of your personal journey.
                                </p>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 2: Creating Entries */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>✏️</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Creating Entries</h3>
                                </div>
                                <p style={{ fontSize: '13px', color: '#d1fae5cc', lineHeight: 1.7, margin: '0 0 12px 0' }}>
                                    Each memory you add becomes a structure in your city. For every entry, you can:
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                                    {['Add a Title', 'Write Details / Caption', 'Attach an Image', 'Assign a Category'].map((item) => (
                                        <div key={item} style={{
                                            padding: '8px 12px', borderRadius: '10px',
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                            fontSize: '12px', color: '#a7f3d0', fontWeight: 500,
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}>
                                            <span style={{ color: '#34d399', fontSize: '10px' }}>●</span> {item}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>Entry Categories</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[
                                        { name: 'Health', color: '#FF69B4' },
                                        { name: 'Relationship', color: '#90EE90' },
                                        { name: 'Career', color: '#4A90E2' },
                                        { name: 'Personal', color: '#FF6B6B' },
                                        { name: 'Other', color: '#FFD700' },
                                    ].map((cat) => (
                                        <div key={cat.name} style={{
                                            padding: '5px 12px', borderRadius: '20px',
                                            background: `${cat.color}18`, border: `1px solid ${cat.color}40`,
                                            fontSize: '11px', fontWeight: 600, color: cat.color,
                                        }}>
                                            {cat.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 3: Memory Visualization */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>🏢</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Memory Visualization</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{
                                        padding: '16px', borderRadius: '14px',
                                        background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)',
                                    }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#6ee7b7', marginBottom: '8px' }}>🏢 Skyscrapers</div>
                                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#d1fae5aa', lineHeight: 1.8 }}>
                                            <li>Standard journal entries</li>
                                            <li>1×1 tile footprint</li>
                                            <li>1 unit spacing required</li>
                                        </ul>
                                    </div>
                                    <div style={{
                                        padding: '16px', borderRadius: '14px',
                                        background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.15)',
                                    }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>🏰 Castles</div>
                                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#d1fae5aa', lineHeight: 1.8 }}>
                                            <li>Core memories only</li>
                                            <li>5×5 tile footprint</li>
                                            <li>2 units spacing required</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 4: Impact & Fondness */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>📊</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Impact &amp; Fondness</h3>
                                </div>
                                <p style={{ fontSize: '13px', color: '#d1fae5cc', lineHeight: 1.7, margin: '0 0 12px 0' }}>
                                    Each entry is shaped by two parameters that determine building height:
                                </p>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', background: 'rgba(103,232,249,0.08)', border: '1px solid rgba(103,232,249,0.2)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#67e8f9', marginBottom: '4px' }}>Impact</div>
                                        <div style={{ fontSize: '11px', color: '#d1fae5aa' }}>How significant the memory is</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', background: 'rgba(253,164,175,0.08)', border: '1px solid rgba(253,164,175,0.2)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fda4af', marginBottom: '4px' }}>Fondness</div>
                                        <div style={{ fontSize: '11px', color: '#d1fae5aa' }}>How emotionally meaningful it is</div>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '10px 14px', borderRadius: '10px',
                                    background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)',
                                    fontSize: '12px', color: '#a7f3d0', fontWeight: 500, textAlign: 'center',
                                }}>
                                    ↑ Higher values = Taller buildings &nbsp;·&nbsp; ↓ Lower values = Shorter buildings
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 5: City Layout */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>🗺️</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>City Layout</h3>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d1fae5cc', lineHeight: 2 }}>
                                    <li>Buildings are placed <strong style={{ color: '#6ee7b7' }}>automatically</strong> in available space</li>
                                    <li>The system ensures proper spacing between structures</li>
                                    <li>Your city grows organically as you add more entries</li>
                                </ul>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 6: Navigation */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>🖱️</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Navigation Controls</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[
                                        { action: 'Left Click + Drag', desc: 'Move across the city' },
                                        { action: 'Right Click + Drag', desc: 'Change camera orientation' },
                                        { action: 'Scroll Wheel', desc: 'Zoom in / out' },
                                        { action: 'W A S D Keys', desc: 'Keyboard pan' },
                                    ].map((ctrl) => (
                                        <div key={ctrl.action} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '8px 12px', borderRadius: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                        }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700, color: '#34d399',
                                                padding: '3px 8px', borderRadius: '6px',
                                                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)',
                                                whiteSpace: 'nowrap', fontFamily: 'monospace',
                                            }}>{ctrl.action}</span>
                                            <span style={{ fontSize: '12px', color: '#d1fae5aa' }}>{ctrl.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 7: Managing Entries */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>🔧</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Managing Entries</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>🗑️ Delete an Entry</div>
                                        <div style={{ fontSize: '12px', color: '#d1fae5aa' }}>Click a building → select <strong style={{ color: '#ef4444' }}>Demolish</strong> to permanently remove it</div>
                                    </div>
                                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', marginBottom: '4px' }}>📜 View Timeline</div>
                                        <div style={{ fontSize: '12px', color: '#d1fae5aa' }}>Toggle <strong style={{ color: '#a855f7' }}>View Timeline</strong> to see memories in chronological order</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 8: Exporting */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>📥</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Exporting Your City</h3>
                                </div>
                                <p style={{ fontSize: '13px', color: '#d1fae5cc', lineHeight: 1.7, margin: 0 }}>
                                    Click <strong style={{ color: '#6ee7b7' }}>Export 2D Map</strong> in the bottom bar to generate an image of your city layout — perfect for sharing or archiving your memory map.
                                </p>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 28px 0' }} />

                            {/* Section 9: Tips */}
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '16px' }}>💡</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', letterSpacing: '-0.2px', margin: 0 }}>Tips for Best Use</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[
                                        'Use Impact + Fondness wisely to highlight important memories',
                                        'Reserve Castles for truly defining moments',
                                        'Categorize entries properly for better filtering',
                                        'Regularly export your city to track growth over time',
                                    ].map((tip, i) => (
                                        <div key={i} style={{
                                            padding: '8px 12px', borderRadius: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            fontSize: '12px', color: '#d1fae5aa', lineHeight: 1.5,
                                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                                        }}>
                                            <span style={{ color: '#fcd34d', fontSize: '10px', marginTop: '3px', flexShrink: 0 }}>★</span>
                                            {tip}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer tagline */}
                            <div style={{
                                marginTop: '24px', paddingTop: '16px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '12px', color: '#6ee7b780', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                                    Your memories don't just sit in a list — they rise, expand,<br/>and shape a city that's uniquely yours.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isGuideOpen && (
                <style>{`
                    @keyframes guideBackdropIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes guidePanelIn {
                        from { opacity: 0; transform: scale(0.95) translateY(12px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            )}
        </div>
    );
};
