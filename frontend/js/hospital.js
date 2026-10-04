const API = window.CARENEAR_API;
let hospital = null, userLocation = null, detailMap, userMarker, hospitalMarker;

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return fail("Hospital ID is missing.");

  const lat = Number(params.get("lat")), lng = Number(params.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng)) userLocation = {lat,lng};
  else await getLocation();

  try {
    const query = userLocation ? `?lat=${userLocation.lat}&lng=${userLocation.lng}` : "";
    const response = await fetch(`${API}/hospitals/${encodeURIComponent(id)}${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Hospital not found.");
    hospital = data.hospital;
    renderHospital();
  } catch(e) { fail(e.message); }
}



function renderHospital() {
  $("detailLoading").classList.add("hidden");
  $("hospitalDetail").classList.remove("hidden");
  $("hospitalName").textContent = hospital.name;
  $("hospitalAddress").textContent = `${hospital.address} • ${hospital.phone || ""}`;
  $("statusBadge").innerHTML = hospital.open
    ? `<span class="badge green large">Open now</span>`
    : `<span class="badge gray large">Closed now</span>`;
  $("availableTokens").textContent = hospital.tokens?.available ?? "—";
  $("waitTime").textContent = hospital.wait != null ? `${hospital.wait} min` : "—";

  $("department").innerHTML = (hospital.departments || []).map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  if (!hospital.departments?.length) {
    $("department").innerHTML = `<option value="">Department unavailable</option>`;
    $("bookBtn").disabled = true;
  }

  const today = new Date();
  const yyyy = today.getFullYear(), mm = String(today.getMonth()+1).padStart(2,"0"), dd = String(today.getDate()).padStart(2,"0");
  $("date").min = `${yyyy}-${mm}-${dd}`;
  $("date").value = `${yyyy}-${mm}-${dd}`;

  setupDetailMap();
  $("bookingForm").onsubmit = bookToken;
}

function setupDetailMap() {
  detailMap = L.map("detailMap").setView([hospital.lat, hospital.lng], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
  }).addTo(detailMap);
  hospitalMarker = L.marker([hospital.lat,hospital.lng]).addTo(detailMap).bindPopup(hospital.name).openPopup();

  if (userLocation) {
    userMarker = L.marker([userLocation.lat,userLocation.lng]).addTo(detailMap).bindPopup("Your location");
    const line = L.polyline([[userLocation.lat,userLocation.lng],[hospital.lat,hospital.lng]]).addTo(detailMap);
    detailMap.fitBounds(line.getBounds(), {padding:[30,30]});
    const d = haversine(userLocation.lat,userLocation.lng,hospital.lat,hospital.lng);
    $("distanceText").textContent = `${d.toFixed(1)} km from you`;
    $("directionsLink").href = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}`;
  } else {
    $("distanceText").textContent = "Location unavailable";
    $("directionsLink").href = `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`;
  }
}

function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve();
    navigator.geolocation.getCurrentPosition(
      p => { userLocation={lat:p.coords.latitude,lng:p.coords.longitude}; resolve(); },
      () => resolve(), {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
    );
  });
}

async function bookToken(e) {
  e.preventDefault();
  const token = localStorage.getItem("carenear_token");
  if (!token) {
    $("bookingMessage").textContent = "Please go back to the home page and log in first.";
    return;
  }
  const payload = {
    hospitalId: hospital.id,
    department: $("department").value,
    patientName: $("patientName").value.trim(),
    age: Number($("age").value),
    phone: $("phone").value.trim(),
    issue: $("issue").value.trim(),
    date: $("date").value,
    distance: userLocation ? haversine(userLocation.lat,userLocation.lng,hospital.lat,hospital.lng) : null
  };
  $("bookBtn").disabled = true; $("bookBtn").textContent = "Booking...";
  $("bookingMessage").textContent = "";
  try {
    const response = await fetch(`${API}/bookings`, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.status === 401) {
      localStorage.removeItem("carenear_token");
      throw new Error("Your login session expired. Please log in again.");
    }
    if (!response.ok) throw new Error(data.message || "Could not book token.");
    $("successDetails").innerHTML = `Hospital: <strong>${escapeHtml(data.booking.hospitalName)}</strong><br>Token number: <strong>${data.booking.token}</strong><br>Appointment: <strong>${escapeHtml(data.booking.date)}</strong>`;
    $("successModal").classList.remove("hidden");
  } catch(e) {
    $("bookingMessage").textContent = e.message;
    $("bookBtn").disabled = false; $("bookBtn").textContent = "Book token";
  }
}

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, rad=x=>x*Math.PI/180;
  const dLat=rad(lat2-lat1), dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fail(msg) { $("detailLoading").classList.add("hidden"); $("detailError").textContent=msg; $("detailError").classList.remove("hidden"); }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
