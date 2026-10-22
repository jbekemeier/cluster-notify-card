/* cluster-notify-card: die letzten Meldungen eines Clusters als Liste (Sensor mit Attribut "meldungen") */
const CNC_LEVELS = {
  critical: { color: 'var(--error-color, #db4437)', icon: 'mdi:alert-circle', label: 'Kritisch' },
  warning: { color: 'var(--warning-color, #ffa600)', icon: 'mdi:alert', label: 'Warnung' },
  ok: { color: 'var(--success-color, #43a047)', icon: 'mdi:check-circle', label: 'In Ordnung' },
  info: { color: 'var(--info-color, #039be5)', icon: 'mdi:information', label: 'Info' },
};

const cncEsc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

// "vor 5 Min", "vor 3 Std", "vor 2 Tagen"; ungueltige Zeiten ergeben ""
const cncAgo = (iso, now = Date.now()) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std`;
  const d = Math.floor(s / 86400);
  return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
};

// Attribut lesen und auf bekannte Felder bringen; kaputte Eintraege werden uebersprungen
const cncEntries = (stateObj, attribute = 'meldungen') => {
  const list = stateObj && stateObj.attributes && stateObj.attributes[attribute];
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e === 'object' && e.titel)
    .map((e) => ({
      zeit: e.zeit || '',
      titel: String(e.titel),
      text: e.text ? String(e.text) : '',
      stufe: CNC_LEVELS[e.stufe] ? e.stufe : 'info',
      quelle: e.quelle ? String(e.quelle) : '',
    }));
};

class ClusterNotifyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = null;
  }

  static getStubConfig() {
    return { entity: 'sensor.cluster_meldungen', title: 'Cluster-Meldungen' };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error('entity fehlt: Bitte den Sensor mit den Meldungen angeben, z. B. sensor.cluster_meldungen.');
    this._config = Object.assign({
      title: 'Cluster-Meldungen',
      attribute: 'meldungen',
      max: 10,
      show_text: true,
      show_source: true,
      empty_text: 'Keine Meldungen',
    }, config);
    this._sig = null;
    this._render();
  }

  getCardSize() {
    return Math.min(this._config ? this._config.max : 3, 10) + 1;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config) return;
    const stateObj = this._hass && this._hass.states[this._config.entity];
    const entries = cncEntries(stateObj, this._config.attribute).slice(0, this._config.max);
    const minute = Math.floor(Date.now() / 60000); // Zeitangaben einmal pro Minute auffrischen
    const sig = JSON.stringify([stateObj ? 1 : 0, entries, minute]);
    if (sig === this._sig) return;
    this._sig = sig;

    const c = this._config;
    let body;
    if (!stateObj) {
      body = `<div class="empty">Entität ${cncEsc(c.entity)} nicht gefunden</div>`;
    } else if (entries.length === 0) {
      body = `<div class="empty">${cncEsc(c.empty_text)}</div>`;
    } else {
      body = entries.map((e) => {
        const lv = CNC_LEVELS[e.stufe];
        const meta = [cncAgo(e.zeit), c.show_source ? e.quelle : ''].filter(Boolean).join(' · ');
        return `<div class="entry" style="--lv:${lv.color}" title="${cncEsc(lv.label)}">
          <ha-icon icon="${lv.icon}"></ha-icon>
          <div class="main">
            <div class="head"><span class="titel">${cncEsc(e.titel)}</span><span class="meta">${cncEsc(meta)}</span></div>
            ${c.show_text && e.text ? `<div class="text">${cncEsc(e.text)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 0 0 8px; overflow: hidden; }
        .title { padding: 16px 16px 8px; font-size: 1.2em; font-weight: 500; color: var(--primary-text-color); }
        .entry { display: flex; gap: 12px; padding: 8px 16px; border-left: 4px solid var(--lv); cursor: pointer; }
        .entry:hover { background: var(--secondary-background-color); }
        ha-icon { color: var(--lv); flex: none; margin-top: 2px; }
        .main { min-width: 0; flex: 1; }
        .head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
        .titel { font-weight: 500; color: var(--primary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .meta { flex: none; font-size: 0.8em; color: var(--secondary-text-color); }
        .text { margin-top: 2px; font-size: 0.9em; color: var(--secondary-text-color); white-space: pre-line; overflow-wrap: anywhere; }
        .empty { padding: 16px; color: var(--secondary-text-color); }
      </style>
      <ha-card>${c.title ? `<div class="title">${cncEsc(c.title)}</div>` : ''}${body}</ha-card>`;

    this.shadowRoot.querySelectorAll('.entry').forEach((el) => {
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          detail: { entityId: c.entity }, bubbles: true, composed: true,
        }));
      });
    });
  }
}

if (!customElements.get('cluster-notify-card')) customElements.define('cluster-notify-card', ClusterNotifyCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'cluster-notify-card')) {
  window.customCards.push({
    type: 'cluster-notify-card',
    name: 'Cluster Notify Card',
    description: 'Die letzten Meldungen eines Clusters als Liste, farbig nach Schweregrad',
  });
}
