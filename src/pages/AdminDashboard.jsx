import React from 'react';
import { Link } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';

/** Vercel·백오피스 미사용 정적 빌드용 안내 */
export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TopNavigation title="관리" type="sub" />
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <p className="text-4xl font-black text-amber-400">관리 콘솔</p>
        <p className="text-slate-300 text-sm leading-relaxed break-keep">
          이 사이트는 Vercel 없이 정적으로 빌드됩니다. DB/스토리지 기반 관리자 기능은 제공되지 않습니다.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-amber-400 text-black font-black text-sm"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
