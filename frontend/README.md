# CareNear Frontend

This frontend is designed to connect to the uploaded CareNear Node/Express backend.

## Files
- `index.html` - nearby hospital search, filters, login and map.
- `hospital.html` - patient details, token booking and distance map.
- `css/style.css` - responsive UI.
- `js/config.js` - backend URL.
- `js/app.js` - location, hospital list, filters, login.
- `js/hospital.js` - hospital details and authenticated booking.

## Run

### 1. Start MongoDB
Make sure MongoDB is running locally.

### 2. Start your backend
Inside your backend folder:
```bash
npm install
```
Create `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/carenear
JWT_SECRET=my_carenear_secret_123456
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

Then:
```bash
npm start
```

If you have not seeded the sample hospitals:
```bash
node seed.js
```

### 3. Serve this frontend
Do NOT open `index.html` directly with `file://` because browser geolocation/CORS behavior can be restricted.

If you have VS Code Live Server:
- Open the `CareNear-Frontend` folder.
- Right-click `index.html`
- Choose "Open with Live Server".
- Use the URL shown by Live Server, normally `http://127.0.0.1:5500`.

Make sure the backend `.env` FRONTEND_ORIGIN matches that exact origin. If Live Server uses another port, change it.

### 4. Login
On the home page click **Log in**.
The current backend creates the user automatically on first login.
Use a valid 10-digit phone number and a password with at least 4 characters.

## Location
Click **Use my location** and allow browser location permission. The frontend sends:
`lat`, `lng`, and radius to the backend.

## Important data behavior
- MongoDB hospitals contain CareNear token counts and can be booked.
- `/api/hospitals/nearby` uses OpenStreetMap/Overpass to find real nearby hospitals.
- OpenStreetMap does not provide live token counts, so external hospitals show "Token data unavailable" and cannot be booked by this CareNear backend yet.
- Maps use Leaflet + OpenStreetMap tiles.

## Backend connection
If your backend is not on `http://localhost:5000`, edit:
`js/config.js`
and change:
`window.CARENEAR_API = "http://YOUR-BACKEND-HOST:PORT/api";`
