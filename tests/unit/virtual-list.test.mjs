import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVirtualWindow, shouldVirtualize } from '../../src/lib/virtual-list.mjs';

test('shouldVirtualize uses a strict greater-than threshold', () => {
  assert.equal(shouldVirtualize(499, 500), false);
  assert.equal(shouldVirtualize(500, 500), false);
  assert.equal(shouldVirtualize(501, 500), true);
  assert.equal(shouldVirtualize(-1, 500), false);
});

test('empty list returns an empty window', () => {
  assert.deepEqual(
    computeVirtualWindow({
      total: 0,
      scrollTop: 200,
      viewportHeight: 400,
      rowHeight: 66,
      overscan: 6,
    }),
    { startIndex: 0, endIndex: 0, topPadding: 0, bottomPadding: 0, visibleCount: 0 },
  );
});

test('first viewport starts at zero and includes overscan', () => {
  const windowState = computeVirtualWindow({
    total: 100,
    scrollTop: 0,
    viewportHeight: 360,
    rowHeight: 66,
    overscan: 6,
  });
  assert.equal(windowState.startIndex, 0);
  assert.equal(windowState.endIndex, 12);
  assert.equal(windowState.visibleCount, 6);
});

test('middle scroll window clamps around visible rows with overscan', () => {
  const windowState = computeVirtualWindow({
    total: 100,
    scrollTop: 33 * 66,
    viewportHeight: 360,
    rowHeight: 66,
    overscan: 6,
  });
  assert.equal(windowState.startIndex, 27);
  assert.equal(windowState.endIndex, 45);
  assert.equal(windowState.topPadding, 27 * 66);
});

test('end-of-list window clamps to total and preserves spacer invariant', () => {
  const rowHeight = 66;
  const windowState = computeVirtualWindow({
    total: 100,
    scrollTop: 99 * rowHeight,
    viewportHeight: 360,
    rowHeight,
    overscan: 6,
  });
  const renderedHeight = (windowState.endIndex - windowState.startIndex) * rowHeight;
  assert.equal(windowState.endIndex, 100);
  assert.equal(
    windowState.topPadding + renderedHeight + windowState.bottomPadding,
    100 * rowHeight,
  );
});

test('negative and zero measurement inputs are clamped', () => {
  const windowState = computeVirtualWindow({
    total: 8,
    scrollTop: -200,
    viewportHeight: 0,
    rowHeight: 0,
    overscan: 20,
  });
  assert.equal(windowState.startIndex, 0);
  assert.equal(windowState.endIndex, 8);
  assert.equal(windowState.visibleCount, 0);
});
