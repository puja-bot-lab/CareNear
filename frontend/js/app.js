const API = window.CARENEAR_API;
let userLocation = null;
let hospitals = [];
let allDepartments = [];
let map, userMarker, hospitalLayer;
let filters = { department: "", open: false, emergency: false };

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupMap();
  setupEvents();
  updateLoginUI();
  requestLocation();
});

function setupMap() {                                         
  map = L.map("map").setView([20.5937, 78.9629], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  hospitalLayer = L.layerGroup().addTo(map);
}

function setupEvents() {
  $("locationBtn").onclick = requestLocation;
  $("refreshBtn").onclick = () => userLocation ? loadHospitals() : requestLocation();
  $("openBtn").onclick = () => { filters.open = !filters.open; toggleActive($("openBtn"), filters.open); renderHospitals(); };
  $("emergencyBtn").onclick = () => { filters.emergency = !filters.emergency; toggleActive($("emergencyBtn"), filters.emergency); renderHospitals(); };
  $("resetBtn").onclick = resetFilters;
  $("searchInput").oninput = renderHospitals;
  $("radiusSelect").onchange = () => userLocation && loadHospitals();
  $("departmentBtn").onclick = e => { e.stopPropagation(); $("departmentMenu").classList.toggle("show"); };
  document.addEventListener("click", e => {
    if (!$("departmentMenu").contains(e.target) && e.target !== $("departmentBtn")) $("departmentMenu").classList.remove("show");
  });
  $("loginBtn").onclick = () => $("loginModal").classList.remove("hidden");
  $("closeLogin").onclick = () => $("loginModal").classList.add("hidden");
  $("loginForm").onsubmit = login;
}

function toggleActive(el, active) { el.classList.toggle("active", active); }

function requestLocation() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location services.");
    return;
  }
  $("locationStatus").textContent = "Requesting location permission...";
  $("locationText").textContent = "Locating...";
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      $("locationStatus").textContent = "Location enabled";
      $("coordsText").textContent = `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
      $("locationText").textContent = "Location enabled";
      map.setView([userLocation.lat, userLocation.lng], 13);
      if (userMarker) userMarker.remove();
      userMarker = L.marker([userLocation.lat, userLocation.lng]).addTo(map).bindPopup("You are here").openPopup();
      loadHospitals();
    },
    err => {
      $("locationStatus").textContent = "Location permission needed";
      $("locationText").textContent = "Use my location";
      showError("Please allow location access in your browser, then tap “Use my location” again.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function loadHospitals() {
  showLoading(true); clearError();
  const radius = Number($("radiusSelect").value) * 1000;
  try {
    // Local MongoDB hospitals: contains token/booking information.
    const url = `${API}/hospitals?lat=${userLocation.lat}&lng=${userLocation.lng}&maxDistance=${radius/1000}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load hospitals.");
    hospitals = data.hospitals || [];

    // Also ask OSM for real nearby hospitals. They may not have token data.
    if (hospitals.length === 0) {
      const nearby = await fetch(`${API}/hospitals/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`).then(r => r.json());
      hospitals = Array.isArray(nearby) ? nearby : [];
    }

    buildDepartments();
    renderHospitals();
    renderMap();
  } catch (e) {
    showError(`${e.message} Make sure the CareNear backend is running on port 5000.`);
  } finally {
    showLoading(false);
  }
}

function buildDepartments() {
  allDepartments = [...new Set(hospitals.flatMap(h => h.departments || []))].sort();
  $("departmentMenu").innerHTML = `<button data-dept="">All departments</button>` +
    allDepartments.map(d => `<button data-dept="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join("");
  $("departmentMenu").querySelectorAll("button").forEach(btn => btn.onclick = () => {
    filters.department = btn.dataset.dept;
    $("departmentBtn").textContent = filters.department ? `${filters.department} ▾` : "Departments ▾";
    $("departmentMenu").classList.remove("show");
    renderHospitals();
  });
}

function renderHospitals() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filtered = hospitals.filter(h => {
    const matchesDept = !filters.department || (h.departments || []).includes(filters.department);
    const matchesOpen = !filters.open || h.open === true;
    const matchesEmergency = !filters.emergency || h.emergency24x7 === true;
    const text = `${h.name} ${h.address} ${(h.departments || []).join(" ")}`.toLowerCase();
    return matchesDept && matchesOpen && matchesEmergency && text.includes(query);
  });

  $("resultText").textContent = `${filtered.length} hospital${filtered.length === 1 ? "" : "s"} found`;
  $("hospitalList").innerHTML = filtered.length ? filtered.map(hospitalCard).join("") :
    `<div class="empty"><div>🏥</div><h3>No hospitals match these filters</h3><p>Try a larger radius, another department, or reset the filters.</p></div>`;
}

function hospitalCard(h) {
  const canBook = Boolean(h.id && String(h.id).length === 24 && h.tokens && h.tokens.available !== null);
  const openLabel = h.open === null ? "Hours unknown" : h.open ? "Open now" : "Closed now";
  const tokenLabel = h.tokens?.available === null || h.tokens?.available === undefined
    ? "Token data unavailable"
    : h.tokens.available > 0 ? `${h.tokens.available} tokens available` : "No tokens available";
  const link = canBook ? `hospital.html?id=${encodeURIComponent(h.id)}&lat=${userLocation.lat}&lng=${userLocation.lng}` : "#";

  return `<article class="hospital-card">
    <div class="card-top">
      <div class="hospital-symbol">🏥</div>
      <div class="card-title"><h3>${escapeHtml(h.name)}</h3><p>${escapeHtml(h.address)}</p></div>
      <span class="distance">${h.distance == null ? "—" : h.distance + " km"}</span>
    </div>
    <div class="badges">
      <span class="${h.open ? "badge green" : "badge gray"}">${openLabel}</span>
      ${h.emergency24x7 ? `<span class="badge red">24/7 Emergency</span>` : ""}
      ${h.source === "OpenStreetMap" ? `<span class="badge blue">OpenStreetMap</span>` : ""}
    </div>
    <div class="info-grid">
      <div><small>Timings</small><strong>${escapeHtml(h.timings || "Unavailable")}</strong></div>
      <div><small>Tokens</small><strong>${escapeHtml(tokenLabel)}</strong></div>
      <div><small>Departments</small><strong>${escapeHtml((h.departments || []).slice(0,3).join(", ") || "Not listed")}</strong></div>
    </div>
    ${canBook ? `<a class="hospital-action" href="${link}">View hospital & book token →</a>` :
      `<div class="hospital-action disabled">Booking unavailable for this external hospital</div>`}
  </article>`;
}

function renderMap() {
  hospitalLayer.clearLayers();
  hospitals.forEach(h => {
    if (!Number.isFinite(Number(h.lat)) || !Number.isFinite(Number(h.lng))) return;
    const marker = L.marker([h.lat, h.lng]).addTo(hospitalLayer);
    marker.bindPopup(`<strong>${escapeHtml(h.name)}</strong><br>${h.distance ?? "—"} km away`);
  });
}

async function login(e) {
  e.preventDefault();
  $("loginMessage").textContent = "Logging in...";
  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ phone: $("loginPhone").value.trim(), password: $("loginPassword").value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem("carenear_token", data.token);
    localStorage.setItem("carenear_user", JSON.stringify(data.user));
    $("loginModal").classList.add("hidden");
    $("loginMessage").textContent = "";
    updateLoginUI();
  } catch (e) { $("loginMessage").textContent = e.message; }
}

function updateLoginUI() {
  const logged = Boolean(localStorage.getItem("carenear_token"));
  $("loginBtn").classList.toggle("hidden", logged);
  $("logoutBtn").classList.toggle("hidden", !logged);
  $("logoutBtn").onclick = () => { localStorage.removeItem("carenear_token"); localStorage.removeItem("carenear_user"); updateLoginUI(); };
}

function resetFilters() {
  filters = {department:"", open:false, emergency:false};
  $("departmentBtn").textContent = "Departments ▾";
  $("searchInput").value = "";
  toggleActive($("openBtn"), false); toggleActive($("emergencyBtn"), false);
  renderHospitals();
}

function showLoading(v) { $("loading").classList.toggle("hidden", !v); }
function showError(msg) { $("error").textContent = msg; $("error").classList.remove("hidden"); }
function clearError() { $("error").classList.add("hidden"); }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
