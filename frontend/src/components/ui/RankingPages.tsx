'use client';

export const RANKING_PAGE_SIZE = 20;

interface RankingPagesProps {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function RankingPages({
  page,
  pageCount,
  total,
  onPageChange,
}: RankingPagesProps) {
  if (total === 0 || pageCount <= 1) {
    return null;
  }

  const from = (page - 1) * RANKING_PAGE_SIZE + 1;
  const to = Math.min(page * RANKING_PAGE_SIZE, total);
  const pages = visiblePages(page, pageCount);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-400">
        Hoja {page} de {pageCount}
        <span className="mx-2 text-slate-600">·</span>
        {from}–{to} de {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        {pages.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-slate-500">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-black ${
                item === page
                  ? 'bg-red-500 text-white'
                  : 'border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function visiblePages(current: number, count: number): Array<number | 'gap'> {
  const start = Math.max(1, current - 2);
  const end = Math.min(count, current + 2);
  const pages = new Set<number>([1, count]);

  for (let page = start; page <= end; page += 1) {
    pages.add(page);
  }

  const sorted = [...pages].sort((left, right) => left - right);
  const result: Array<number | 'gap'> = [];

  for (const page of sorted) {
    const previous = result[result.length - 1];

    if (typeof previous === 'number' && page - previous > 1) {
      result.push('gap');
    }

    result.push(page);
  }

  return result;
}
