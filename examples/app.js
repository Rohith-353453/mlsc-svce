const DATASETS = {
  cities: "../data/cities/cities.csv",
  institutions: "../data/education/institutions.csv",
  airQuality: "../data/environment/air_quality.csv",
  weather: "../data/environment/weather.csv",
  stations: "../data/transportation/railway_stations.csv",
  routes: "../data/transportation/routes.csv",
  hospitals: "../data/public_services/hospitals.csv",
  schools: "../data/public_services/schools.csv",
  facilities: "../data/public_services/public_facilities.csv",
};

const COLORS = {
  hospitals: "#da774c",
  schools: "#8174ad",
  facilities: "#d9ae52",
};

const numberFormat = new Intl.NumberFormat("en-US");
const gallery = document.querySelector("#gallery-grid");
const errorMessage = document.querySelector("#error-message");
const chartCount = document.querySelector("#chart-count");
let activeFilter = "all";
let dataset;

function parseCsv(text, source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }
  if (quoted) throw new Error(`The CSV file ${source} contains an unterminated quoted value.`);
  if (rows.length < 2) throw new Error(`The CSV file ${source} has no data rows.`);

  const [headers, ...records] = rows;
  return records.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`Row ${index + 2} in ${source} has ${values.length} fields; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
  return parseCsv(await response.text(), path);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function format(value) {
  return numberFormat.format(value);
}

function sourceLink(path, label) {
  return `<a href="${path}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a>`;
}

function card({ domain, title, description, sources, chart, className = "" }) {
  return `<article class="chart-card ${className}" data-domain="${domain}">
    <div class="card-topline"><span class="card-category">${domain === "transportation" ? "Getting around" : domain}</span><span class="chart-index"></span></div>
    <h3>${escapeHtml(title)}</h3>
    <p class="chart-description">${escapeHtml(description)}</p>
    <div class="chart-visual">${chart}</div>
    <div class="chart-footer"><span>Measures shown as recorded</span><span>${sources.map(([path, label]) => sourceLink(path, label)).join(" · ")}</span></div>
  </article>`;
}

function horizontalBars(records, { label, value, color = "", formatter = format, max = null }) {
  if (!records.length) return '<p class="empty-state">No rows are available for this view.</p>';
  const limit = max ?? Math.max(...records.map((record) => Number(record[value]) || 0), 1);
  return `<div class="bar-list">${records.map((record) => {
    const amount = Number(record[value]) || 0;
    const width = Math.max(amount > 0 ? 1.5 : 0, amount / limit * 100);
    return `<div class="bar-row">
      <span class="bar-label" title="${escapeHtml(record[label])}">${escapeHtml(record[label])}</span>
      <span class="bar-track"><span class="bar-fill ${color}" style="width:${width}%"></span></span>
      <span class="bar-value">${escapeHtml(formatter(amount))}</span>
    </div>`;
  }).join("")}</div>`;
}

function columnBars(records, { label, value, color = "", formatter = format }) {
  const max = Math.max(...records.map((record) => Number(record[value]) || 0), 1);
  return `<div class="column-chart" role="img" aria-label="${escapeHtml(records.map((record) => `${record[label]} ${formatter(Number(record[value]) || 0)}`).join(", "))}">
    ${records.map((record) => {
      const amount = Number(record[value]) || 0;
      const height = Math.max(amount > 0 ? 2 : 0, amount / max * 100);
      return `<div class="column-item"><span class="column-bar ${color}" style="height:${height}%" data-value="${escapeHtml(formatter(amount))}"></span><span class="column-label" title="${escapeHtml(record[label])}">${escapeHtml(record[label])}</span></div>`;
    }).join("")}
  </div>`;
}

function cityName(cityId) {
  return dataset.cities.find((city) => city.city_id === cityId)?.name ?? `Unknown city (${cityId})`;
}

function setSnapshot() {
  const population = dataset.cities.reduce((sum, city) => sum + Number(city.population), 0);
  const stats = [
    [dataset.cities.length, "Cities"],
    [format(population), "Combined city population"],
    [dataset.institutions.length, "Institutions"],
    [dataset.stations.length, "Rail stations"],
  ];
  document.querySelector("#stat-grid").innerHTML = stats.map(([value, label]) =>
    `<div class="stat"><span class="stat-value">${escapeHtml(value)}</span><span class="stat-label">${escapeHtml(label)}</span></div>`,
  ).join("");
  const dates = [...new Set([...dataset.airQuality, ...dataset.weather].map((row) => row.date))].sort();
  document.querySelector("#snapshot-date").textContent = dates.length
    ? `Source records · ${dates.join(" / ")}`
    : "Source records · date not provided";
}

function buildCards() {
  const citiesByPopulation = [...dataset.cities].sort((a, b) => Number(b.population) - Number(a.population));
  const institutionsByStudents = [...dataset.institutions].sort((a, b) => Number(b.students) - Number(a.students));
  const aqiRows = dataset.airQuality.map((record) => ({
    ...record,
    city: cityName(record.city_id),
    reading: Number(record.aqi),
  })).sort((a, b) => b.reading - a.reading);
  const temperatureRows = dataset.weather.map((record) => ({ ...record, city: cityName(record.city_id) }));
  const stationsByLines = dataset.stations.map((record) => ({
    ...record,
    city: cityName(record.city_id),
    lineCount: Number(record.lines),
  })).sort((a, b) => b.lineCount - a.lineCount);
  const routeTypes = Object.values(dataset.routes.reduce((groups, route) => {
    groups[route.type] ??= { type: route.type, count: 0 };
    groups[route.type].count += 1;
    return groups;
  }, {})).sort((a, b) => b.count - a.count);

  const weatherChart = `<div class="weather-grid">
    <section class="weather-panel"><h4>Temperature <span>°C</span></h4>${horizontalBars(temperatureRows, { label: "city", value: "temp_c", color: "temp", formatter: (value) => `${value.toFixed(1)}°` })}</section>
    <section class="weather-panel"><h4>Precipitation <span>mm</span></h4>${horizontalBars(temperatureRows, { label: "city", value: "precipitation_mm", color: "rain", formatter: (value) => `${value.toFixed(1)}` })}</section>
  </div>`;

  const serviceTypes = [
    { key: "hospitals", label: "Hospitals", color: COLORS.hospitals, rows: dataset.hospitals },
    { key: "schools", label: "Schools", color: COLORS.schools, rows: dataset.schools },
    { key: "facilities", label: "Facilities", color: COLORS.facilities, rows: dataset.facilities },
  ];
  const maxServices = Math.max(1, ...dataset.cities.map((city) =>
    serviceTypes.reduce((count, type) => count + type.rows.filter((row) => row.city_id === city.city_id).length, 0),
  ));
  const serviceChart = `<div class="service-legend">${serviceTypes.map((type) =>
    `<span class="legend-item"><i class="legend-dot" style="background:${type.color}"></i>${type.label}</span>`,
  ).join("")}</div><div class="service-bars">${dataset.cities.map((city) => {
    const counts = serviceTypes.map((type) => type.rows.filter((row) => row.city_id === city.city_id).length);
    return `<div class="service-row"><span class="service-city">${escapeHtml(city.name)}</span><div class="service-stack">${counts.map((count, index) =>
      count ? `<span class="service-segment" style="width:${count / maxServices * 100}%;background:${serviceTypes[index].color}" title="${serviceTypes[index].label}: ${count}"></span>` : "",
    ).join("")}</div><div class="service-counts">${counts.map((count, index) =>
      `<span class="service-count"><i class="legend-dot" style="background:${serviceTypes[index].color}"></i>${count}</span>`,
    ).join("")}</div></div>`;
  }).join("")}</div>`;

  const cards = [
    card({
      domain: "cities",
      title: "The shape of the cities",
      description: "Compare the population values recorded for each city. Bar lengths share one population scale.",
      sources: [[DATASETS.cities, "data/cities/cities.csv"]],
      chart: horizontalBars(citiesByPopulation, { label: "name", value: "population" }),
    }),
    card({
      domain: "education",
      title: "Students, by institution",
      description: "Student counts at each listed institution; this is not an enrollment rate or a per-city estimate.",
      sources: [[DATASETS.institutions, "data/education/institutions.csv"]],
      chart: columnBars(institutionsByStudents, { label: "name", value: "students" }),
    }),
    card({
      domain: "environment",
      title: "Air quality readings",
      description: "Recorded AQI for each city and date. Bars show relative values in this file, not health categories.",
      sources: [[DATASETS.airQuality, "data/environment/air_quality.csv"]],
      chart: horizontalBars(aqiRows.map((row) => ({ ...row, city: `${row.city} · ${row.date}` })), { label: "city", value: "reading", color: "temp", formatter: (value) => format(value) }),
    }),
    card({
      domain: "environment",
      title: "Weather, two ways",
      description: "Temperature and precipitation are separated to keep their different units and scales clear.",
      sources: [[DATASETS.weather, "data/environment/weather.csv"]],
      chart: weatherChart,
      className: "wide",
    }),
    card({
      domain: "transportation",
      title: "Rail lines served",
      description: "Compare the number of railway lines reported for each station. This does not imply passenger volume.",
      sources: [[DATASETS.stations, "data/transportation/railway_stations.csv"]],
      chart: columnBars(stationsByLines, { label: "name", value: "lineCount", color: "temp" }),
    }),
    card({
      domain: "transportation",
      title: "Routes, by type",
      description: "A count of route records by their listed type; route endpoints are not treated as ridership or distance.",
      sources: [[DATASETS.routes, "data/transportation/routes.csv"]],
      chart: horizontalBars(routeTypes, { label: "type", value: "count", color: "rain" }),
    }),
    card({
      domain: "services",
      title: "Services in each city",
      description: "Counts listed hospitals, schools, and public facilities by city. Categories come from three source files.",
      sources: [
        [DATASETS.hospitals, "hospitals.csv"],
        [DATASETS.schools, "schools.csv"],
        [DATASETS.facilities, "public_facilities.csv"],
      ],
      chart: serviceChart,
      className: "wide",
    }),
  ];
  chartCount.textContent = `· ${cards.length} views`;
  return cards.join("");
}

function applyFilter() {
  let shown = 0;
  document.querySelectorAll(".chart-card").forEach((chart) => {
    const visible = activeFilter === "all" || chart.dataset.domain === activeFilter;
    chart.hidden = !visible;
    if (visible) shown += 1;
  });
  gallery.querySelector(".empty-state")?.remove();
  if (!shown) gallery.insertAdjacentHTML("beforeend", '<p class="empty-state">No examples are available for this collection.</p>');
}

document.querySelector("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-button").forEach((filterButton) => {
    const active = filterButton === button;
    filterButton.classList.toggle("active", active);
    filterButton.setAttribute("aria-pressed", String(active));
  });
  applyFilter();
});

async function start() {
  try {
    const keys = Object.keys(DATASETS);
    const rows = await Promise.all(keys.map((key) => loadCsv(DATASETS[key])));
    dataset = Object.fromEntries(keys.map((key, index) => [key, rows[index]]));
    setSnapshot();
    gallery.innerHTML = buildCards();
    gallery.querySelectorAll(".chart-index").forEach((index, position) => {
      index.textContent = String(position + 1).padStart(2, "0");
    });
    applyFilter();
  } catch (error) {
    gallery.innerHTML = "";
    errorMessage.hidden = false;
    errorMessage.textContent = `${error.message} Open this page through a local web server (for example, run python -m http.server 8000 from the repository root, then visit http://localhost:8000/examples/).`;
  }
}

start();
