import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeFlags } from '../../src/app.mjs';
import { filterGuests, normalizeGuests, slugify } from '../../src/lib/roster.mjs';
import { createScrollProbe } from '../../src/screens/roster.mjs';

class FakeElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.parentElement = null;
    this.scrollTop = 0;
    this.textContent = '';
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }
}

const fakeDocument = {
  createElement(tag) {
    return new FakeElement(tag);
  },
};

test('slugifies accents and punctuation', () => {
  assert.equal(slugify(' Renée Aubénas! '), 'renee-aubenas');
});

test('dedupes names and suffixes colliding ids', () => {
  const { guests, droppedDuplicates } = normalizeGuests([
    { id: 'agent', name: 'Ava', table: 'One' },
    { id: 'agent', name: 'Bea', table: 'Two' },
    { name: ' ava ', table: 'Three' },
  ]);
  assert.deepEqual(
    guests.map((guest) => guest.id),
    ['agent', 'agent-2'],
  );
  assert.equal(droppedDuplicates, 1);
});

test('search is case and diacritic insensitive', () => {
  const { guests } = normalizeGuests([{ name: 'Renée Aubénas', table: 'Casino' }]);
  assert.equal(filterGuests(guests, 'renee').length, 1);
  assert.equal(filterGuests(guests, 'casino').length, 1);
});

test('runtime flags require exact scrollProbe activation', () => {
  assert.deepEqual(readRuntimeFlags(''), { scrollProbe: false, buildVersion: null });
  assert.deepEqual(readRuntimeFlags('?scrollProbe=1&buildVersion=abc'), {
    scrollProbe: true,
    buildVersion: 'abc',
  });
  assert.deepEqual(readRuntimeFlags('?scrollProbe=true'), {
    scrollProbe: false,
    buildVersion: null,
  });
});

test('scroll probe is inert by default', () => {
  const host = new FakeElement();
  const list = new FakeElement('ul');
  host.append(list);
  const probe = createScrollProbe(list, { enabled: false, documentRef: fakeDocument });
  assert.equal(host.children.length, 1);
  assert.equal(list.listeners.size, 0);
  probe.dispose();
});

test('scroll probe appends outside the list, updates from scrollTop, and disposes', () => {
  const host = new FakeElement();
  const list = new FakeElement('ul');
  host.append(list);
  const probe = createScrollProbe(list, { enabled: true, documentRef: fakeDocument });
  assert.equal(host.children.length, 2);
  assert.equal(list.children.length, 0);
  const status = host.children[1];
  assert.equal(status.id, 'scroll-probe-status');
  assert.equal(status.textContent, 'scroll-probe:0');
  assert.equal(status.getAttribute('aria-label'), 'scroll-probe:0');

  list.scrollTop = 47.6;
  list.dispatch('scroll');
  assert.equal(status.textContent, 'scroll-probe:48');
  assert.equal(status.getAttribute('aria-label'), 'scroll-probe:48');

  probe.dispose();
  assert.equal(host.children.length, 1);
  assert.equal(list.listeners.size, 0);
});

test('scroll probe rejects malformed enabled lists', () => {
  assert.throws(
    () => createScrollProbe(null, { enabled: true, documentRef: fakeDocument }),
    /scrollable list/,
  );
  assert.throws(
    () =>
      createScrollProbe(
        { addEventListener() {}, removeEventListener() {} },
        { enabled: true, documentRef: fakeDocument },
      ),
    /appendable parent/,
  );
});
