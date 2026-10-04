# CareNear Backend - Live Location Version

This version adds:

`GET /api/hospitals/nearby?lat=LAT&lng=LNG&radius=5000`

The endpoint uses OpenStreetMap data through the Overpass API to find real hospitals around the user's GPS coordinates.

## Run

1. Open this folder in VS Code.
2. Make sure Node.js is installed.
3. Run:

```bash
npm.cmd install
```

4. Create `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/carenear
JWT_SECRET=my_carenear_secret_123456
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

5. Start the server:

```bash
npm.cmd start
```

## Important

The nearby endpoint does NOT provide live token availability. OpenStreetMap supplies hospital/location information, not a hospital's live queue/token system. Token availability and booking should remain in CareNear's own backend or be connected to participating hospitals later.
