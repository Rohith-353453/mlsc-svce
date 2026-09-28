const weatherUrl = "../../data/environment/weather.csv";
const citiesUrl = "../../data/cities/cities.csv";
const requiredWeatherColumns = ["city_id", "date", "temp_c", "precipitation_mm"];

const cityFilter = document.querySelector("#city-filter");
const dateFrom = document.querySelector("#date-from");
const dateTo = document.querySelector("#date-to");
const filterError = document.querySelector("#filter-error");
const loadError = document.querySelector("#load-error");
const weatherRows = document.querySelector("#weather-rows");
const chartGrid = document.querySelector("#chart-grid");
const emptyState = document.querySelector("#empty-state");
const resultCount = document.querySelector("#result-count");

let readings = [];
let cities = new Map();

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
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("A CSV value has an unterminated quote.");
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV contains duplicate column names.");
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has an unexpected number of columns.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
  });
}

function parseWeatherRows(text) {
  const records = parseCsv(text);
  if (records.length === 0) throw new Error("The weather CSV has no readings.");

  const missingColumns = requiredWeatherColumns.filter(
    (column) => !Object.hasOwn(records[0], column),
  );
  if (missingColumns.length > 0) {
    throw new Error(`The weather CSV is missing required columns: ${missingColumns.join(", ")}.`);
  }

  return records.map((record, index) => {
    const temperature = Number(record.temp_c);
    const precipitation = Number(record.precipitation_mm);
    const parsedDate = new Date(`${record.date}T00:00:00Z`);
    if (
      !record.city_id ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== record.date ||
      !Number.isFinite(temperature) ||
      !Number.isFinite(precipitation)
    ) {
      throw new Error(`Weather CSV row ${index + 2} contains an invalid date or measurement.`);
    }

    return {
      cityId: record.city_id,
      date: record.date,
      temperature,
      precipitation,
    };
  });
}

function cityLabel(cityId) {
  const city = cities.get(cityId);
  return city ? `${city.name}, ${city.state}` : cityId;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function visibleReadings() {
  const selectedCity = cityFilter.value;
  const from = dateFrom.value;
  const to = dateTo.value;

  return readings
    .filter((reading) => selectedCity === "all" || reading.cityId === selectedCity)
    .filter((reading) => (!from || reading.date >= from) && (!to || reading.date <= to))
    .sort((left, right) => (
      left.date.localeCompare(right.date) || left.cityId.localeCompare(right.cityId)
    ));
}

function renderSummary(filtered) {
  const hasReadings = filtered.length > 0;
  document.querySelector("#reading-count").textContent = formatNumber(filtered.length, 0);
  document.querySelector("#average-temperature").textContent = hasReadings
    ? `${formatNumber(filtered.reduce((sum, item) => sum + item.temperature, 0) / filtered.length)}°`
    : "—";
  document.querySelector("#total-precipitation").textContent = hasReadings
    ? `${formatNumber(filtered.reduce((sum, item) => sum + item.precipitation, 0))} mm`
    : "—";

  const warmest = hasReadings
    ? filtered.reduce((highest, item) => (
      item.temperature > highest.temperature ? item : highest
    ))
    : null;
  document.querySelector("#warmest-reading").textContent = warmest
    ? `${formatNumber(warmest.temperature)}°`
    : "—";
  document.querySelector("#warmest-note").textContent = warmest
    ? `${cityLabel(warmest.cityId)} · ${formatDate(warmest.date)}`
    : "degrees Celsius (°C)";
}

function renderChart(filtered, key, title, unit, color) {
  const maximum = Math.max(...filtered.map((reading) => reading[key]), 0);
  const scaleMaximum = maximum === 0 ? 1 : maximum;
  const width = 520;
  const rowHeight = 43;
  const height = Math.max(rowHeight * filtered.length, 35);
  const barStart = 198;
  const barWidth = 240;
  const rows = filtered.map((reading, index) => {
    const y = index * rowHeight + 5;
    const value = reading[key];
    const length = Math.max((value / scaleMaximum) * barWidth, value > 0 ? 2 : 0);
    const label = `${cityLabel(reading.cityId)} · ${formatDate(reading.date)}`;
    return `
      <g>
        <title>${label}: ${formatNumber(value)} ${unit}</title>
        <text x="0" y="${y + 14}" class="chart-city">${escapeHtml(cityLabel(reading.cityId))}</text>
        <text x="0" y="${y + 28}" class="chart-date">${formatDate(reading.date)}</text>
        <rect x="${barStart}" y="${y + 5}" width="${barWidth}" height="9" rx="4.5" class="chart-track"></rect>
        <rect x="${barStart}" y="${y + 5}" width="${length}" height="9" rx="4.5" fill="${color}"></rect>
        <text x="${width - 2}" y="${y + 14}" text-anchor="end" class="chart-value">${formatNumber(value)} ${unit}</text>
      </g>`;
  }).join("");

  return `
    <article class="chart-card">
      <div class="chart-title"><span>${title}</span><span>Scale: 0–${formatNumber(maximum)} ${unit}</span></div>
      <div class="chart-scroll">
        <svg class="weather-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} by city and date">
          ${rows}
        </svg>
      </div>
    </article>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderTable(filtered) {
  weatherRows.replaceChildren(...filtered.map((reading) => {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(reading.date);
    const cityCell = document.createElement("td");
    const cityName = document.createElement("span");
    cityName.className = "city-name";
    cityName.textContent = cityLabel(reading.cityId);
    cityCell.append(cityName);
    if (cities.has(reading.cityId)) {
      const cityId = document.createElement("span");
      cityId.className = "city-id";
      cityId.textContent = reading.cityId;
      cityCell.append(cityId);
    }

    const temperatureCell = document.createElement("td");
    temperatureCell.className = "numeric temperature-value";
    temperatureCell.textContent = `${formatNumber(reading.temperature)} °C`;
    const precipitationCell = document.createElement("td");
    precipitationCell.className = "numeric";
    precipitationCell.textContent = `${formatNumber(reading.precipitation)} mm`;

    row.append(dateCell, cityCell, temperatureCell, precipitationCell);
    return row;
  }));
}

function updateView() {
  const from = dateFrom.value;
  const to = dateTo.value;
  const invalidRange = Boolean(from && to && from > to);
  filterError.hidden = !invalidRange;
  filterError.textContent = invalidRange ? "The start date must be on or before the end date." : "";

  const filtered = invalidRange ? [] : visibleReadings();
  renderSummary(filtered);
  renderTable(filtered);
  chartGrid.innerHTML = filtered.length === 0
    ? ""
    : renderChart(filtered, "temperature", "Temperature", "°C", "#4f8d67")
      + renderChart(filtered, "precipitation", "Precipitation", "mm", "#df9268");
  emptyState.hidden = filtered.length !== 0;
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "reading" : "readings"}`;
}

async function loadWeather() {
  try {
    const [weatherResponse, citiesResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(citiesUrl),
    ]);
    if (!weatherResponse.ok) {
      throw new Error(`Could not load weather data (HTTP ${weatherResponse.status}).`);
    }
    if (!citiesResponse.ok) {
      throw new Error(`Could not load city data (HTTP ${citiesResponse.status}).`);
    }

    const [weatherText, citiesText] = await Promise.all([
      weatherResponse.text(),
      citiesResponse.text(),
    ]);
    readings = parseWeatherRows(weatherText);
    cities = new Map(parseCsv(citiesText)
      .filter((city) => city.city_id && city.name)
      .map((city) => [city.city_id, { name: city.name, state: city.state || "" }]));

    const dates = readings.map((reading) => reading.date).sort();
    dateFrom.min = dates[0];
    dateFrom.max = dates.at(-1);
    dateTo.min = dates[0];
    dateTo.max = dates.at(-1);

    const cityIds = [...new Set(readings.map((reading) => reading.cityId))].sort();
    cityFilter.replaceChildren(new Option("All cities", "all"));
    for (const cityId of cityIds) {
      cityFilter.add(new Option(cityLabel(cityId), cityId));
    }
    updateView();
  } catch (error) {
    loadError.textContent = `Weather data could not be loaded: ${error.message} Check that the app is served from the repository root and the CSV files are available.`;
    loadError.hidden = false;
    resultCount.textContent = "Data unavailable";
  }
}

cityFilter.addEventListener("change", updateView);
dateFrom.addEventListener("change", updateView);
dateTo.addEventListener("change", updateView);
document.querySelector("#reset-filters").addEventListener("click", () => {
  cityFilter.value = "all";
  dateFrom.value = "";
  dateTo.value = "";
  updateView();
});

loadWeather();
