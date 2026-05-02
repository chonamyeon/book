import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adsenseBooks } from '../data/adsense/books';

const userReviews = [
  { name: "3년차 마케터", text: "출퇴근 시간이 낭비되지 않아 너무 좋아요. 15분 만에 핵심만 듣고 출근합니다." },
  { name: "스타트업 CEO", text: "매주 선별된 책이 카톡으로 오니까 무슨 책을 읽을지 고민할 필요가 없습니다." },
  { name: "프로덕트 매니저", text: "팟캐스트를 듣고 나니 원작 내용이 너무 궁금해져서 바로 책을 주문했어요." },
  { name: "프리랜서 디자이너", text: "오디오와 요약 텍스트를 함께 볼 수 있어서 이해가 훨씬 빠르고 남는 게 많아요." },
  { name: "5년차 기획자", text: "요즘 번아웃이 와서 우울하고 무기력했는데, 퇴근길에 들으면서 큰 위로가 되었습니다." },
  { name: "영업 팀장", text: "바빠서 책 읽을 엄두를 못 냈는데, 짧은 시간 안에 제 성장에 진짜 큰 도움이 되고 있어요." },
  { name: "7년차 인사담당자", text: "라디오 듣는 것처럼 편안하게 넘어가는데 머릿속에 남는 인사이트는 묵직합니다." },
];

export default function RightSidebar() {
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % userReviews.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden xl:block w-72 p-6 border-l border-slate-200 h-[calc(100vh-64px)] fixed right-0 top-16 overflow-y-auto bg-white z-40">
      <div className="mb-8">
        <h4 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-slate-900">
          <span className="material-symbols-outlined text-blue-500 text-[20px]">trending_up</span> 인기 인사이트
        </h4>
        <div className="space-y-4">
          {adsenseBooks.filter(b => b.fullReview).slice(0, 5).map((item, i) => (
            <Link
              key={item.id}
              to={`/story/${item.id}`}
              className="group cursor-pointer block"
            >
              <div className={`text-[11px] font-bold mb-1 ${i === 0 ? 'text-blue-500' : 'text-slate-400'}`}>BEST {i + 1}</div>
              <h5 className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 truncate transition-colors">{item.title}</h5>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400">{item.author}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-5">
        <h4 className="text-[11px] font-bold text-blue-600 mb-2 uppercase tracking-wider">이용자 리뷰</h4>
        <p className="text-[12px] text-slate-600 leading-relaxed italic">
          "{userReviews[reviewIndex].text}"
        </p>
        <p className="text-[11px] text-blue-500 font-bold mt-2">— {userReviews[reviewIndex].name}</p>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">서비스 안내</h4>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Whiteboard는 도서 원문을 낭독하지 않으며, 각 도서의 핵심 철학을 분석한 독창적인 2차 창작물을 제공합니다.
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <Link to="/about" className="text-[11px] text-blue-500 hover:underline">서비스 소개</Link>
          <Link to="/privacy" className="text-[11px] text-blue-500 hover:underline">개인정보처리방침</Link>
        </div>
      </div>
    </aside>
  );
}
