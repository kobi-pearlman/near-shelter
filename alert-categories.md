# Pikud HaOref Alert Categories — Observed from Real Data

> Sourced from actual alerts received via the API. Not official documentation.

| `cat` | `title` (Hebrew) | `desc` (Hebrew) | Notes |
|-------|-----------------|-----------------|-------|
| `1` | ירי רקטות וטילים | היכנסו למרחב המוגן ושהו בו 10 דקות | Rocket/missile fire |
| `6` | חדירת כלי טיס עוין | היכנסו מייד למרחב המוגן | Hostile aircraft / UAV intrusion |
| `10` | (multiple titles — see below) | (varies) | Informational/update category — used for both pre-warnings and event-ended notices |

### `cat: "10"` observed titles

| `title` | `desc` | Meaning |
|---------|--------|---------|
| חדירת כלי טיס עוין - האירוע הסתיים | באזורים הבאים בהמשך לדיווח...האירוע הסתיים. | Event ended — sent after UAV/aircraft alert clears |
| בדקות הקרובות צפויות להתקבל התרעות באזורך | על תושבי האזורים הבאים לשפר את המיקום למיגון המיטבי בקרבתך. במקרה של קבלת התרעה, יש להיכנס למרחב המוגן ולשהות בו עד להודעה חדשה. | Pre-warning — alerts expected soon in your area, find best shelter nearby |

## Notes

- `cat: "10"` is **not a real threat** — it's informational. Titles vary based on context. Our app currently sends push notifications for these, which may be undesirable.
- **"האירוע הסתיים"** alerts: sent as a new active alert with a new `id`, followed shortly by an empty API response (the actual CLEAR).
- **Pre-warning** ("בדקות הקרובות..."): sent before actual rockets/UAV alerts hit — a heads-up to find shelter. Followed by a real `cat: "1"` or `cat: "6"` alert.
- `cat` is a string (not a number) in the JSON response.

## To Add

Add new rows here whenever a new `cat` value is observed in the logs.
