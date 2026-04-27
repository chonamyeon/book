import { useRef, useEffect } from 'react';

export default function LazyVideo({ src, poster, className, style, ...rest }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.play().catch(() => {});
                } else {
                    el.pause();
                }
            },
            { rootMargin: '0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <video
            ref={ref}
            src={src}
            poster={poster || undefined}
            autoPlay
            loop
            muted
            playsInline
            className={className}
            style={style}
            {...rest}
        />
    );
}
