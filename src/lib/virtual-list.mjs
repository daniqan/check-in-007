export function shouldVirtualize(total, threshold) {
  return Math.max(0, Number(total) || 0) > Math.max(0, Number(threshold) || 0);
}

export function computeVirtualWindow({ total, scrollTop, viewportHeight, rowHeight, overscan }) {
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
  const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const safeRowHeight = Math.max(1, Number(rowHeight) || 0);
  const safeOverscan = Math.max(0, Math.floor(Number(overscan) || 0));

  if (safeTotal === 0) {
    return { startIndex: 0, endIndex: 0, topPadding: 0, bottomPadding: 0, visibleCount: 0 };
  }

  const firstVisible = Math.floor(safeScrollTop / safeRowHeight);
  const visibleCount = Math.ceil(safeViewportHeight / safeRowHeight);
  const startIndex = Math.max(0, Math.min(safeTotal, firstVisible - safeOverscan));
  const endIndex = Math.max(
    startIndex,
    Math.min(safeTotal, firstVisible + visibleCount + safeOverscan),
  );
  const topPadding = startIndex * safeRowHeight;
  const renderedHeight = (endIndex - startIndex) * safeRowHeight;
  const bottomPadding = Math.max(0, safeTotal * safeRowHeight - topPadding - renderedHeight);

  return { startIndex, endIndex, topPadding, bottomPadding, visibleCount };
}
