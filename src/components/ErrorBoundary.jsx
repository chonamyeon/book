import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
                    <div className="text-center space-y-4">
                        <p className="text-4xl">⚠️</p>
                        <h1 className="text-white font-black text-lg">화면을 불러오는 중 오류가 발생했습니다</h1>
                        <p className="text-slate-500 text-sm">{this.state.error?.message}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 px-6 py-3 bg-amber-400 text-black font-black text-sm rounded-2xl hover:bg-amber-300 transition-all"
                        >
                            새로고침
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
