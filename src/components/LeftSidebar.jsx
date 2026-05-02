import { Link } from 'react-router-dom';

const sideNavItems = [
  { id: 'NOW',        label: '전체',    icon: 'home' },
  { id: 'SELF_DEV',   label: '자기계발', icon: 'rocket_launch' },
  { id: 'ECONOMY',    label: '경제',    icon: 'payments' },
  { id: 'MANAGEMENT', label: '경영',    icon: 'business_center' },
  { id: 'HUMANITIES', label: '인문',    icon: 'history_edu' },
  { id: 'PSYCHOLOGY', label: '심리',    icon: 'psychology' },
];

const trendingKeywords = ['한강 작가 노벨상', '자기계발 베스트셀러', '경제경영 추천', '심리학 입문', '철학 고전'];

export default function LeftSidebar({ activeNav, onNavChange }) {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 p-6 flex flex-col gap-y-3 bg-white border-r border-slate-200 hidden lg:flex overflow-y-auto z-40">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">카테고리</div>
      <nav className="flex flex-col gap-y-0.5">
        {sideNavItems.map((item) => {
          const isActive = activeNav === item.id;
          if (onNavChange) {
            return (
              <button
                key={item.id}
                onClick={() => onNavChange(item.id)}
                className={`flex items-center gap-3 py-2 px-3 rounded-md transition-all text-left w-full ${
                  isActive
                    ? 'text-slate-900 font-semibold bg-slate-100 border-r-2 border-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-[13px]">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.id}
              to="/"
              className="flex items-center gap-3 py-2 px-3 rounded-md transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-[13px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">실시간 인기 키워드</div>
        <div className="flex flex-col gap-y-2">
          {trendingKeywords.map((kw, i) => (
            <div key={i} className="flex items-center gap-2 px-1 cursor-pointer hover:text-blue-500 transition-colors">
              <span className={`font-bold text-xs w-4 ${i === 0 ? 'text-blue-500' : 'text-slate-400'}`}>{i + 1}</span>
              <span className="truncate text-[13px] text-slate-600">{kw}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
