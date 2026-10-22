# Cluster Notify Card

**Deutsch:** Lovelace-Karte für Home Assistant, die die letzten Meldungen eines Clusters (oder jedes anderen Systems) als Liste zeigt, farbig nach Schweregrad. Push-Benachrichtigungen aufs Handy speichert Home Assistant nicht. Diese Karte liest deshalb eine Liste aus dem Attribut eines Sensors, den Ihr System selbst pflegt.

**English:** Lovelace card for Home Assistant that shows the latest messages of a cluster (or any other system) as a list, colored by severity. Home Assistant keeps no history of mobile app pushes, so this card reads a list from an attribute of a sensor that your system maintains itself.

Die Karte ist rein darstellend. Tippen auf einen Eintrag öffnet den „Mehr Infos"-Dialog des Sensors. Reines JavaScript, keine Abhängigkeiten, kein Build-Schritt.

## Installation

HACS → Dashboard (Frontend) → Benutzerdefiniertes Repository → `https://github.com/jbekemeier/cluster-notify-card` → Kategorie *Dashboard*. Danach die Karte hinzufügen.

## Konfiguration

```yaml
type: custom:cluster-notify-card
entity: sensor.cluster_meldungen
title: Cluster-Meldungen
max: 10
```

| Option | Standard | Bedeutung |
|---|---|---|
| `entity` | – (Pflicht) | Sensor, dessen Attribut die Meldungen enthält |
| `attribute` | `meldungen` | Name des Attributs |
| `title` | `Cluster-Meldungen` | Überschrift, leer lassen für keine |
| `max` | `10` | Anzahl der angezeigten Einträge |
| `show_text` | `true` | Meldungstext unter dem Titel |
| `show_source` | `true` | Quelle neben der Zeitangabe |
| `empty_text` | `Keine Meldungen` | Text, wenn die Liste leer ist |

## Datenformat

Das Attribut ist eine Liste, der neueste Eintrag steht vorne:

```json
{
  "zeit": "2026-10-22T19:48:07Z",
  "titel": "KRITISCH: KubePodCrashLooping",
  "text": "- Pod haengt in der Neustartschleife (monitoring)",
  "stufe": "critical",
  "quelle": "alertmanager"
}
```

`stufe` ist `critical`, `warning`, `ok` oder `info` (unbekannte Werte zählen als `info`). Einträge ohne `titel` werden übersprungen.

Den Sensor setzen Sie mit der REST-API von Home Assistant, zum Beispiel:

```bash
curl -X POST "$HA_URL/api/states/sensor.cluster_meldungen" \
  -H "Authorization: Bearer $HA_TOKEN" -H "Content-Type: application/json" \
  -d '{"state":"Test","attributes":{"meldungen":[{"zeit":"2026-10-22T19:48:07Z","titel":"Test","text":"Hallo","stufe":"info","quelle":"curl"}]}}'
```

Über die REST-API gesetzte Zustände überstehen keinen Neustart von Home Assistant. Schreiben Sie den Sensor deshalb regelmäßig neu, damit er danach wieder auftaucht.

## Entwicklung

```bash
npm test
```

## Lizenz

MIT
