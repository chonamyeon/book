/**
 * PersonaAvatar — 유형별 실제 인물 사진
 */

const PERSONA_PHOTOS = {
    growth:        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&auto=format&q=80',
    entertainment: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&auto=format&q=80',
    empathy:       'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&auto=format&q=80',
    mindfulness:   'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face&auto=format&q=80',
};

const PERSONA_FALLBACK_BG = {
    growth:        'bg-blue-900',
    entertainment: 'bg-violet-900',
    empathy:       'bg-rose-900',
    mindfulness:   'bg-emerald-900',
};

export default function PersonaAvatar({ type = 'growth', className = '' }) {
    const src = PERSONA_PHOTOS[type] || PERSONA_PHOTOS.growth;
    const fallback = PERSONA_FALLBACK_BG[type] || 'bg-slate-800';

    return (
        <div className={`w-full h-full ${fallback} ${className}`}>
            <img
                src={src}
                alt={type}
                className="w-full h-full object-cover object-top"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer-when-downgrade"
                onError={(e) => { e.target.style.display = 'none'; }}
            />
        </div>
    );
}
