import React from 'react';

// index.html에서 정의된 .av-loader / .av-loader-bars / .av-loader-label CSS 재사용
export default function LoadingScreen() {
    return (
        <div className="av-loader">
            <div className="av-loader-bars">
                <span /><span /><span /><span />
                <span /><span /><span />
            </div>
            <div className="av-loader-label">ARCHIVIEW</div>
        </div>
    );
}
