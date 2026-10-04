const router = require("express").Router();
const Hospital = require("../models/Hospital");
const { haversineKm } = require("../utils/distance");
const { isOpenNow } = require("../utils/openStatus");

const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

function serializeHospital(hospital, userLat, userLng) {
  const distance =
    Number.isFinite(userLat) && Number.isFinite(userLng)
      ? haversineKm(
          userLat,
          userLng,
          hospital.location.lat,
          hospital.location.lng
        )
      : null;

  return {
    id: hospital._id,
    name: hospital.name,
    address: hospital.address,
    timings: hospital.timings,
    open: isOpenNow(hospital),
    emergency24x7: hospital.emergency24x7,
    distance: distance === null ? null : Number(distance.toFixed(1)),
    departments: hospital.departments,
    tokens: hospital.tokens,
    wait: hospital.tokens.wait,
    lat: hospital.location.lat,
    lng: hospital.location.lng,
    phone: hospital.phone
  };
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapOsmHospital(element, userLat, userLng) {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || "Hospital";

  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"]
  ].filter(Boolean);

  const address =
    addressParts.join(", ") ||
    tags["addr:full"] ||
    tags["addr:street"] ||
    "Address unavailable";

  const distance = haversineKm(userLat, userLng, lat, lng);

  const emergencyValue = String(
    tags.emergency || tags["emergency:ambulance"] || ""
  ).toLowerCase();

  const emergency24x7 =
    emergencyValue === "yes" ||
    emergencyValue === "24/7" ||
    emergencyValue.includes("24");

  const departments = [];
  if (tags["healthcare:speciality"]) {
    departments.push(...String(tags["healthcare:speciality"]).split(/[;,]/));
  }
  if (tags["healthcare:speciality:en"]) {
    departments.push(...String(tags["healthcare:speciality:en"]).split(/[;,]/));
  }

  return {
    id: `osm-${element.type}-${element.id}`,
    osmType: element.type,
    osmId: element.id,
    name,
    address,
    timings: tags.opening_hours || "Timings unavailable",
    open: null,
    emergency24x7,
    distance: Number(distance.toFixed(1)),
    departments: [...new Set(departments.map(x => x.trim()).filter(Boolean))],
    // OSM does not provide live token availability. These values are placeholders
    // so the existing frontend can render the card without claiming live data.
    tokens: {
      total: null,
      current: null,
      available: null,
      wait: null
    },
    wait: null,
    lat,
    lng,
    phone: tags.phone || tags["contact:phone"] || "Phone unavailable",
    source: "OpenStreetMap"
  };
}

// GET /api/hospitals/nearby?lat=19.076&lng=72.877&radius=5000
// Finds real hospitals around the user's current GPS coordinates using OpenStreetMap.
router.get("/nearby", async (req, res, next) => {
  try {
    const lat = parseNumber(req.query.lat);
    const lng = parseNumber(req.query.lng);
    const requestedRadius = parseNumber(req.query.radius);
    const radius = Math.min(Math.max(requestedRadius || 5000, 500), 20000);

    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query parameters are required."
      });
    }

    const query = `
      [out:json][timeout:25];
      (
        nwr[amenity=hospital](around:${radius},${lat},${lng});
        nwr[healthcare=hospital](around:${radius},${lat},${lng});
      );
      out center tags;
    `;

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "CareNear/1.0"
      },
      body: new URLSearchParams({ data: query }).toString()
    });

    if (!response.ok) {
      throw new Error(`Hospital location service returned HTTP ${response.status}`);
    }

    const data = await response.json();

    const hospitals = data.elements
      .map(element => mapOsmHospital(element, lat, lng))
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .filter((hospital, index, list) => {
        return index === list.findIndex(other =>
          other.name.toLowerCase() === hospital.name.toLowerCase() &&
          Math.abs(other.lat - hospital.lat) < 0.0001 &&
          Math.abs(other.lng - hospital.lng) < 0.0001
        );
      });

    res.json(hospitals);
  } catch (error) {
    next(error);
  }
});

// GET /api/hospitals
router.get("/", async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      search = "",
      department = "",
      open = "false",
      emergency = "false",
      maxDistance
    } = req.query;

    const userLat = Number(lat);
    const userLng = Number(lng);

    const hospitals = await Hospital.find().sort({ name: 1 });

    let result = hospitals.map(h =>
      serializeHospital(
        h,
        Number.isFinite(userLat) ? userLat : NaN,
        Number.isFinite(userLng) ? userLng : NaN
      )
    );

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.departments.some(d => d.toLowerCase().includes(q))
      );
    }

    if (department) {
      result = result.filter(h => h.departments.includes(department));
    }

    if (open === "true") {
      result = result.filter(h => h.open);
    }

    if (emergency === "true") {
      result = result.filter(h => h.emergency24x7);
    }

    if (maxDistance && Number.isFinite(userLat) && Number.isFinite(userLng)) {
      const max = Number(maxDistance);
      result = result.filter(h => h.distance !== null && h.distance <= max);
    }

    result.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    res.json({
      success: true,
      count: result.length,
      hospitals: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/hospitals/:id
router.get("/:id", async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found"
      });
    }

    const userLat = Number(req.query.lat);
    const userLng = Number(req.query.lng);

    res.json({
      success: true,
      hospital: serializeHospital(
        hospital,
        Number.isFinite(userLat) ? userLat : NaN,
        Number.isFinite(userLng) ? userLng : NaN
      )
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
