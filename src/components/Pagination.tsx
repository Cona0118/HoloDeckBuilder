interface Props {
  page: number;        // 1-based 현재 페이지
  total: number;       // 전체 항목 수
  pageSize: number;
  onChange: (page: number) => void;
}

const WINDOW = 5; // 한 번에 보여줄 페이지 번호 수

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // 윈도우 계산: 현재 페이지를 중심으로 +-2
  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), totalPages - WINDOW + 1));
  const end = Math.min(totalPages, start + WINDOW - 1);
  const numbers: number[] = [];
  for (let i = start; i <= end; i++) numbers.push(i);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40"
      >
        이전
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`min-w-8 px-2 py-1.5 text-xs rounded border ${
            n === page
              ? 'bg-indigo-700 text-white border-indigo-600'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
