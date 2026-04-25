import React from 'react';

export default function LoadingScreen() {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#0e1015',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, zIndex: 9999,
        }}>
            {/* 웨이브 파형 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
                {[
                    { h: 14, delay: '0s' },
                    { h: 30, delay: '0.15s' },
                    { h: 40, delay: '0.05s' },
                    { h: 24, delay: '0.25s' },
                    { h: 36, delay: '0.1s' },
                    { h: 18, delay: '0.35s' },
                    { h: 28, delay: '0.2s' },
                ].map((bar, i) => (
                    <div key={i} style={{
                        width: 4,
                        height: bar.h,
                        borderRadius: 3,
                        background: 'linear-gradient(to top, #f97316, #fb923c)',
                        animationName: 'waveLoadBar',
                        animationDuration: '1s',
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate',
                        animationDelay: bar.delay,
                    }} />
                ))}
            </div>

            {/* ARCHIVIEW 텍스트 */}
            <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.3em',
                color: '#f97316',
                textTransform: 'uppercase',
            }}>ARCHIVIEW</span>

            <style>{`
                @keyframes waveLoadBar {
                    from { transform: scaleY(0.3); opacity: 0.5; }
                    to   { transform: scaleY(1);   opacity: 1; }
                }
            `}</style>
        </div>
    );
}
