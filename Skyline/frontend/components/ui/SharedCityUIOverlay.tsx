'use client';
import React from 'react';

export const SharedCityUIOverlay: React.FC = () => {
  return <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 50, padding: '12px 20px', borderRadius: 12, background: 'rgba(6,40,30,0.9)', backdropFilter: 'blur(15px)', border: '1px solid rgba(139,92,246,0.3)', color: '#d1fae5', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>Shared City Mode</div>;
};

export default SharedCityUIOverlay;
