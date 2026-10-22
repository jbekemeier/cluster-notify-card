import test from 'node:test';
import assert from 'node:assert/strict';

// Minimale Browser-Attrappen, damit die Karte ohne Home Assistant geladen werden kann
const defined = {};
globalThis.HTMLElement = class { attachShadow() { this.shadowRoot = { innerHTML: '', querySelectorAll: () => [] }; return this.shadowRoot; } };
globalThis.customElements = { get: (n) => defined[n], define: (n, c) => { defined[n] = c; } };
globalThis.window = globalThis;
globalThis.CustomEvent = class {};

await import('../cluster-notify-card.js');
const Card = defined['cluster-notify-card'];

const sensor = (meldungen) => ({ states: { 'sensor.cluster_meldungen': { attributes: { meldungen } } } });
const entry = (o = {}) => ({ zeit: new Date().toISOString(), titel: 'T', text: 'x', stufe: 'warning', quelle: 'q', ...o });

const make = (config, hass) => {
  const c = new Card();
  c.setConfig({ entity: 'sensor.cluster_meldungen', ...config });
  c.hass = hass;
  return c.shadowRoot.innerHTML;
};

test('registers the card', () => {
  assert.ok(Card);
  assert.ok(window.customCards.some((c) => c.type === 'cluster-notify-card'));
});

test('setConfig requires an entity', () => {
  assert.throws(() => new Card().setConfig({}), /entity fehlt/);
});

test('renders entries and escapes HTML', () => {
  const html = make({}, sensor([entry({ titel: '<b>x</b>' })]));
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>x/);
});

test('respects max', () => {
  const html = make({ max: 2 }, sensor([entry(), entry(), entry()]));
  assert.equal(html.match(/class="entry"/g).length, 2);
});

test('shows empty text and missing entity', () => {
  assert.match(make({}, sensor([])), /Keine Meldungen/);
  assert.match(make({ entity: 'sensor.weg' }, sensor([])), /nicht gefunden/);
});

test('unknown severity falls back to info, broken entries are skipped', () => {
  const html = make({}, sensor([entry({ stufe: 'huh' }), null, { text: 'ohne Titel' }]));
  assert.equal(html.match(/class="entry"/g).length, 1);
  assert.match(html, /mdi:information/);
});
