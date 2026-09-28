const AIR_QUALITY_URL = "../../../data/environment/air_quality.csv";
const CITIES_URL = "../../../data/cities/cities.csv";
const TREND_MINIMUM_DATES = 3;

const cityFilter = document.querySelector("#city-filter");
const cityList = document.querySelector("#city-list");
const errorMessage = document.querySelector("#error-message");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  if (rows.length < 2) throw new Error("The CSV does not contain any readings.");

  const headers = rows.shift().map((header) => header.trim());
  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV contains duplicate column names.");
  }

  return rows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has a different number of fields than the header.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
  });
}

function validateReadings(rows) {
  const required = ["city_id", "date", "aqi"];
  if (required.some((field) => !Object.hasOwn(rows[0], field))) {
    throw new Error("The air-quality CSV must include city_id, date, and aqi columns.");
  }

  return rows.map((row, index) => {
    const date = new Date(`${row.date}T00:00:00Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(row.date)
      && !Number.isNaN(date.valueOf())
      && date.toISOString().slice(0, 10) === row.date;
    const aqi = Number(row.aqi);

    if (!row.city_id || !validDate || !Number.isInteger(aqi)) {
      throw new Error(`Air-quality CSV row ${index + 2} has an invalid city_id, date, or AQI value.`);
    }
    return { cityId: row.city_id, date: row.date, timestamp: date.valueOf(), aqi, sourceIndex: index };
  });
}

function groupReadings(readings) {
  const cities = new Map();
  for (const reading of readings) {
    if (!cities.has(reading.cityId)) cities.set(reading.cityId, []);
    cities.get(reading.cityId).push(reading);
  }

  for (const series of cities.values()) {
    series.sort((left, right) => left.timestamp - right.timestamp || left.sourceIndex - right.sourceIndex);
  }
  return cities;
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

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function createChart(series, cityName) {
  const width = 640;
  const height = 150;
  const left = 44;
  const right = 14;
  const top = 17;
  const bottom = 29;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = series.map((reading) => reading.aqi);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.18, 5);
  const low = minimum - padding;
  const high = maximum + padding;
  const firstTime = series[0].timestamp;
  const lastTime = series[series.length - 1].timestamp;
  const timeSpan = lastTime - firstTime;

  const points = series.map((reading, index) => {
    const x = timeSpan === 0
      ? left + plotWidth / 2
      : left + ((reading.timestamp - firstTime) / timeSpan) * plotWidth;
    const y = top + ((high - reading.aqi) / (high - low)) * plotHeight;
    return { x, y, reading, index };
  });
  const yTicks = [0, 1, 2].map((step) => ({
    value: Math.round(high - ((high - low) * step) / 2),
    y: top + (plotHeight * step) / 2,
  }));
  const startLabel = formatDate(series[0].date);
  const endLabel = formatDate(series[series.length - 1].date);

  return `
    <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Air Quality Index readings for ${escapeHtml(cityName)} over time">
      ${yTicks.map((tick) => `
        <line class="chart-grid" x1="${left}" y1="${tick.y}" x2="${width - right}" y2="${tick.y}"></line>
        <text class="chart-axis-label" x="${left - 8}" y="${tick.y + 3}" text-anchor="end">${tick.value}</text>
      `).join("")}
      ${points.length > 1 ? `<polyline class="chart-line" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>` : ""}
      ${points.map(({ x, y, reading, index }) => `
        <circle class="chart-point" cx="${x}" cy="${y}" r="4.5">
          <title>${escapeHtml(formatDate(reading.date))}: AQI ${reading.aqi}</title>
        </circle>
        ${points.length <= 6 ? `<text class="chart-point-label" x="${x}" y="${y - 9}" text-anchor="middle">${reading.aqi}</text>` : ""}
        ${index === 0 ? `<text class="chart-axis-label" x="${left}" y="${height - 7}" text-anchor="start">${escapeHtml(startLabel)}</text>` : ""}
        ${index === points.length - 1 && points.length > 1 ? `<text class="chart-axis-label" x="${width - right}" y="${height - 7}" text-anchor="end">${escapeHtml(endLabel)}</text>` : ""}
      `).join("")}
      ${points.length === 1 ? `<text class="chart-axis-label" x="${left + plotWidth / 2}" y="${height - 7}" text-anchor="middle">${escapeHtml(startLabel)}</text>` : ""}
    </svg>`;
}

function renderCityCard(cityId, series, cityNames) {
  const uniqueDateCount = new Set(series.map((reading) => reading.date)).size;
  const trendReady = uniqueDateCount >= TREND_MINIMUM_DATES;
  const cityName = cityNames.get(cityId) || cityId;
  const timeline = series.map((reading) => `
    <div class="timeline-row">
      <time class="timeline-date" datetime="${escapeHtml(reading.date)}">${escapeHtml(formatDate(reading.date))}</time>
      <span class="timeline-aqi">${reading.aqi}<span class="timeline-aqi-label">AQI</span></span>
    </div>
  `).join("");

  return `
    <article class="city-card" data-city-id="${escapeHtml(cityId)}">
      <header class="city-card-header">
        <h3 class="city-title">${escapeHtml(cityName)} <span class="city-id">${escapeHtml(cityId)}</span></h3>
        <span class="reading-total">${series.length} ${series.length === 1 ? "READING" : "READINGS"}</span>
      </header>
      <div class="city-card-content">
        <div class="chart-column">
          <div class="chart-heading">
            <span class="trend-label">AQI <span aria-hidden="true">/</span> DATE</span>
            <span class="trend-status${trendReady ? " ready" : ""}">${trendReady ? "TREND AVAILABLE" : "INSUFFICIENT DATA"}</span>
          </div>
          ${createChart(series, cityName)}
        </div>
        <div class="timeline-column">
          <h4 class="timeline-heading">READING LOG <span aria-hidden="true">·</span> OLDEST FIRST</h4>
          ${!trendReady ? `
            <p class="insufficient-note">
              <span class="insufficient-icon" aria-hidden="true">i</span>
              <span>${uniqueDateCount === 0 ? "No dated readings yet." : `Only ${uniqueDateCount} ${uniqueDateCount === 1 ? "distinct date" : "distinct dates"} recorded. A trend needs at least ${TREND_MINIMUM_DATES} readings on different dates.`}</span>
            </p>
          ` : ""}
          <div class="timeline">${timeline}</div>
        </div>
      </div>
    </article>`;
}

function renderDashboard(readings, cityNames) {
  const cities = groupReadings(readings);
  const trendReadyCount = [...cities.values()].filter(
    (series) => new Set(series.map((reading) => reading.date)).size >= TREND_MINIMUM_DATES,
  ).length;

  document.querySelector("#reading-count").textContent = readings.length;
  document.querySelector("#city-count").textContent = cities.size;
  document.querySelector("#trend-count").textContent = trendReadyCount;
  document.querySelector("#overview-note").textContent = trendReadyCount === cities.size
    ? "Every city has enough observations for a time-based trend."
    : `Not enough repeated readings yet. A trend needs at least ${TREND_MINIMUM_DATES} readings on distinct dates per city.`;

  const options = [...cities.keys()].sort((left, right) => left.localeCompare(right));
  cityFilter.innerHTML = `<option value="all">All cities</option>${options.map((cityId) => `
    <option value="${escapeHtml(cityId)}">${escapeHtml(cityNames.get(cityId) || cityId)} (${escapeHtml(cityId)})</option>
  `).join("")}`;
  cityFilter.disabled = false;

  const render = () => {
    const selectedCity = cityFilter.value;
    const visibleCities = options.filter((cityId) => selectedCity === "all" || cityId === selectedCity);
    cityList.innerHTML = visibleCities.map((cityId) => (
      renderCityCard(cityId, cities.get(cityId), cityNames)
    )).join("");
  };

  cityFilter.addEventListener("change", render);
  render();
  cityList.setAttribute("aria-busy", "false");
}

async function loadCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`);
  return parseCsv(await response.text());
}

async function start() {
  try {
    const [airQualityRows, cityRows] = await Promise.all([
      loadCsv(AIR_QUALITY_URL),
      loadCsv(CITIES_URL),
    ]);
    const cityNames = new Map(cityRows.map((city) => [city.city_id, city.name]));
    renderDashboard(validateReadings(airQualityRows), cityNames);
  } catch (error) {
    errorMessage.textContent = `Unable to load the air-quality view: ${error.message} Check the CSV files and serve this example over HTTP.`;
    errorMessage.hidden = false;
    cityList.setAttribute("aria-busy", "false");
    document.querySelector("#overview-note").textContent = "The dataset could not be loaded.";
  }
}

start();
