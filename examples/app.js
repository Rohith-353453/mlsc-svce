const DATA_ROOT = "../data/";

const files = {
  cities: "cities/cities.csv",
  air: "environment/air_quality.csv",
  weather: "environment/weather.csv",
  education: "education/institutions.csv",
  stations: "transportation/railway_stations.csv",
  routes: "transportation/routes.csv",
  hospitals: "public_services/hospitals.csv",
  facilities: "public_services/public_facilities.csv",
  schools: "public_services/schools.csv",
};

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  });
}

async function loadData() {
  const entries = await Promise.all(Object.entries(files).map(async ([name, path]) => {
    const response = await fetch(DATA_ROOT + path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return [name, parseCsv(await response.text())];
  }));
  return Object.fromEntries(entries);
}

const number = (value) => Number(value).toLocaleString("en-US");
const byId = (rows) => Object.fromEntries(rows.map((row) => [row.city_id, row]));

function renderPopulation(cities) {
  const max = Math.max(...cities.map((city) => Number(city.population)));
  document.querySelector("#population-chart").innerHTML = cities
    .sort((a, b) => Number(b.population) - Number(a.population))
    .map((city) => `
      <div class="population-row">
        <div class="city-label">${city.name}<span class="city-state">${city.state} · ${city.city_id}</span></div>
        <div class="bar-track"><div class="bar" style="width:${(Number(city.population) / max) * 100}%"></div></div>
        <div class="population-value">${number(city.population)} people</div>
      </div>`).join("");
}

function renderEnvironment(data) {
  const cities = byId(data.cities);
  const air = byId(data.air);
  document.querySelector("#environment-list").innerHTML = data.weather.map((reading) => {
    const city = cities[reading.city_id];
    const quality = air[reading.city_id];
    return `<div class="environment-item">
      <div><strong>${city.name}</strong><small>${quality.main_pollutant} · ${reading.date}</small></div>
      <div class="metric"><b>${reading.temp_c}°</b><small>temp °C</small></div>
      <div class="metric"><b>${reading.precipitation_mm}</b><small>rain mm</small></div>
      <div class="aqi-pill" title="AQI reading">${quality.aqi}</div>
    </div>`;
  }).join("");
}

function renderCapacity(data) {
  const counts = [
    ["Institutions", data.education.length, "education/institutions.csv"],
    ["Railway stations", data.stations.length, "transportation/railway_stations.csv"],
    ["Hospital beds", data.hospitals.reduce((sum, row) => sum + Number(row.beds), 0), "public_services/hospitals.csv"],
    ["Civic listings", data.facilities.length + data.schools.length, "public_services/ + schools.csv"],
  ];
  document.querySelector("#capacity-list").innerHTML = counts.map(([label, value, source]) =>
    `<div class="capacity-card"><strong>${number(value)}</strong><span>${label} listed</span><small>${source}</small></div>`).join("");
}

function renderRoutes(data) {
  const stations = Object.fromEntries(data.stations.map((station) => [station.station_id, station]));
  const ordered = [data.routes[0]?.start_station_id, ...data.routes.map((route) => route.end_station_id)]
    .filter((id, index, list) => id && list.indexOf(id) === index);
  document.querySelector("#route-list").innerHTML = ordered.map((stationId, index) => {
    const station = stations[stationId];
    const city = data.cities.find((item) => item.city_id === station.city_id);
    const nextRoute = data.routes.find((route) => route.start_station_id === stationId);
    return `<div class="route-stop"><span class="stop-dot"></span><span class="stop-name">${station.name}</span><span class="stop-city">${city.name} · ${station.lines} lines</span>${nextRoute ? `<span class="route-label">${nextRoute.type} · ${nextRoute.route_id}</span>` : "<span class=\"route-label\">terminal</span>"}</div>`;
  }).join("");
}

loadData().then((data) => {
  renderPopulation(data.cities);
  renderEnvironment(data);
  renderCapacity(data);
  renderRoutes(data);
}).catch((error) => {
  document.querySelector("main").insertAdjacentHTML("afterbegin", `<p class="load-error">The atlas could not load the CSV files. Open this example through a local web server so relative data paths are available.</p>`);
  console.error(error);
});
