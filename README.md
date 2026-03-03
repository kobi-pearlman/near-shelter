# מקלט קרוב — Near Shelter PWA

PWA (אפליקציית ווב מתקדמת) שמאזינה להתראות פיקוד העורף בזמן אמת, שולחת התראות Push גם כשהאפליקציה סגורה, ומציגה כפתורי ניווט ל-Google Maps ו-Waze לאיתור המקלט הקרוב.

---

## מבנה הפרויקט

```
near_shelter/
├── backend/   # Node.js + Express — מאזין ל-API של פיקוד העורף + שולח Push
└── frontend/  # React + Vite PWA — ממשק המשתמש
```

---

## הגדרה ראשונית

### Backend

```bash
cd backend
cp .env.example .env        # Already filled in — see .env
npm run dev                 # Starts on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm run dev                 # Starts on http://localhost:5173
```

פתח `http://localhost:5173` בדפדפן.

---

## שימוש

1. **אפשר מיקום GPS** — הדפדפן יבקש הרשאה בטעינה
2. **אפשר התראות** — לחץ על "🔔 אפשר התראות" בסרגל הסטטוס
3. **בזמן אזעקה** — האפליקציה תציג באנר אדום + כפתורי ניווט למקלט
4. **Push Notification** — תישלח גם כשהאפליקציה סגורה (לאחר הרשמה)

---

## בדיקת האפליקציה (Development)

### סימולציה של אזעקה

```bash
curl -X POST http://localhost:3001/api/test-alert
```

זה ישלח Push לכל המנויים הרשומים ויוכל לבדוק את זרימת ההתראות.

### בדיקת מצב האזעקה הנוכחי

```bash
curl http://localhost:3001/api/alert
```

---

## פריסה לייצור (Production)

> ⚠️ **חשוב:** ה-API של פיקוד העורף חסום גיאוגרפית לכתובות IP ישראליות בלבד.
> השרת חייב לרוץ בישראל (למשל Google Cloud `me-west1` — תל אביב) או עם proxy ישראלי.

### Backend

```bash
cd backend
npm start
```

ניתן להוסיף `PROXY_URL` ב-`.env` לעקיפת חסימה גיאוגרפית:

```
PROXY_URL=http://user:pass@israeli-proxy:port/
```

### Frontend

```bash
cd frontend
npm run build    # Builds to frontend/dist/
```

העלה את `frontend/dist/` לשרת סטטי (Nginx, Vercel, Netlify וכו').
ה-frontend חייב לתקשר עם ה-backend — הגדר Reverse Proxy כך ש-`/api/*` יעביר לשרת ה-backend.

---

## איקונים

האיקונים ב-`frontend/public/icons/` הם placeholders (ריבועים אדומים).
להחלפה באיקונים אמיתיים, השתמש ב-[realfavicongenerator.net](https://realfavicongenerator.net) וצור:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `badge-72.png` (72×72)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alert` | מצב האזעקה הנוכחי |
| GET | `/api/vapid-public-key` | מפתח VAPID ציבורי לרישום Push |
| POST | `/api/subscribe` | רישום Push subscription |
| DELETE | `/api/subscribe` | ביטול רישום |
| POST | `/api/test-alert` | שליחת אזעקת בדיקה (dev) |
