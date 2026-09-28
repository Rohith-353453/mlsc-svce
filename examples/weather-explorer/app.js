const WEATHER_URL = "../../data/environment/weather.csv";
const CITIES_URL = "../../data/cities/cities.csv";

const elements = {
  city: document.querySelector("#city-filter"),
  start: document.querySelector("#start-date"),
  end: document.querySelector("#end-date"),
  reset: document.querySelector("#reset-filters"),
  emptyReset: document.querySelector("#empty-reset"),
  status: document.querySelector("#load-status"),
  average: document.querySelector("#average-temperature"),
  precipitation: document.querySelector("#total-precipitation"),
  cityCount: document.querySelector("#city-count"),
  recordCount: document.querySelector("#record-count"),
  warmestCity: document.querySelector("#warmest-city"),
  warmestLocation: document.querySelector("#warmest-location"),
  warmestTemperature: document.querySelector("#warmest-temperature"),
  warmestDate: document.querySelector("#warmest-date"),
  chart: document.querySelector("#chart-container"),
  chartCaption: document.querySelector("#chart-caption"),
  rows: document.querySelector("#weather-rows"),
  visibleCount: document.querySelector("#visible-count"),
  tableSummary: document.querySelector("#table-summary"),
  emptyState: document.querySelector("#empty-state"),
  sortLabel: document.querySelector("#sort-label"),
};

let weatherRecords = [];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseCsvRow(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

async function loadWeatherData() {
  elements.status.textContent = "Loading dataset";
  try {
    const [weatherResponse, citiesResponse] = await Promise.all([
      fetch(WEATHER_URL),
      fetch(CITIES_URL),
    ]);
    if (!weatherResponse.ok || !citiesResponse.ok) {
      throw new Error("The weather or cities CSV could not be loaded.");
    }
    const [weatherText, citiesText] = await Promise.all([
      weatherResponse.text(),
      citiesResponse.text(),
    ]);
    const citiesById = new Map(parseCsv(citiesText).map((city) => [city.city_id, city]));
    weatherRecords = parseCsv(weatherText)
      .map((record) => {
        const city = citiesById.get(record.city_id);
        return {
          ...record,
          cityName: city?.name || record.city_id,
          state: city?.state || "",
          temperature: Number(record.temp_c),
          precipitation: Number(record.precipitation_mm),
        };
      })
      .filter((record) => (
        record.city_id
        && record.date
        && Number.isFinite(record.temperature)
        && Number.isFinite(record.precipitation)
      ))
      .sort((left, right) => left.date.localeCompare(right.date) || left.cityName.localeCompare(right.cityName));

    if (!weatherRecords.length) {
      throw new Error("No valid weather observations were found in the dataset.");
    }
    initializeFilters();
    elements.status.textContent = `${weatherRecords.length} records loaded`;
    render();
  } catch (error) {
    elements.status.textContent = "Dataset unavailable";
    elements.chart.innerHTML = `<div class="chart-empty"><span aria-hidden="true">!</span><strong>We couldn't load the weather data.</strong><span>${escapeHtml(error.message)} Serve this folder over HTTP and try again.</span></div>`;
    elements.rows.innerHTML = `<tr><td colspan="5">The weather dataset could not be loaded. Please serve this folder over HTTP and reload.</td></tr>`;
    elements.tableSummary.textContent = "Weather data unavailable";
    console.error("Unable to load the weather explorer datasets.", error);
  }
}

function initializeFilters() {
  const cityOptions = new Map(weatherRecords.map((record) => [
    record.city_id,
    `${record.cityName}${record.state ? `, ${record.state}` : ""}`,
  ]));
  [...cityOptions.entries()]
    .sort((left, right) => left[1].localeCompare(right[1]))
    .forEach(([cityId, label]) => {
      const option = document.createElement("option");
      option.value = cityId;
      option.textContent = label;
      elements.city.append(option);
    });

  const dates = weatherRecords.map((record) => record.date).sort();
  elements.start.min = dates[0];
  elements.start.max = dates.at(-1);
  elements.start.value = dates[0];
  elements.end.min = dates[0];
  elements.end.max = dates.at(-1);
  elements.end.value = dates.at(-1);
}

function getFilteredRecords() {
  return weatherRecords.filter((record) => (
    (elements.city.value === "all" || record.city_id === elements.city.value)
    && (!elements.start.value || record.date >= elements.start.value)
    && (!elements.end.value || record.date <= elements.end.value)
  ));
}

function render() {
  const records = getFilteredRecords();
  const cityCount = new Set(records.map((record) => record.city_id)).size;
  elements.average.textContent = records.length
    ? average(records.map((record) => record.temperature)).toFixed(1)
    : "—";
  elements.precipitation.textContent = records.length
    ? sum(records.map((record) => record.precipitation)).toFixed(1)
    : "—";
  elements.cityCount.textContent = String(cityCount);
  elements.recordCount.textContent = `${records.length} ${records.length === 1 ? "observation" : "observations"}`;
  elements.visibleCount.textContent = String(records.length);
  elements.tableSummary.textContent = `Showing ${records.length} of ${weatherRecords.length} ${weatherRecords.length === 1 ? "observation" : "observations"}`;
  elements.sortLabel.textContent = records.length ? "Sorted by date" : "No matching dates";
  elements.emptyState.hidden = records.length > 0;
  elements.rows.closest("table").hidden = records.length === 0;
  renderRecords(records);
  renderSpotlight(records);
  renderChart(records);
}

function renderRecords(records) {
  elements.rows.innerHTML = [...records]
    .sort((left, right) => right.date.localeCompare(left.date) || left.cityName.localeCompare(right.cityName))
    .map((record) => {
      const initials = record.cityName.slice(0, 1).toUpperCase();
      const condition = conditionFor(record);
      return `<tr>
        <td><div class="city-cell"><span class="city-avatar">${escapeHtml(initials)}</span><span class="city-name"><strong>${escapeHtml(record.cityName)}</strong><span>${escapeHtml(record.city_id)}${record.state ? ` · ${escapeHtml(record.state)}` : ""}</span></span></div></td>
        <td class="date-cell">${formatDate(record.date)}</td>
        <td class="temp-value">${record.temperature.toFixed(1)} <span>°C</span></td>
        <td class="precip-value">${record.precipitation.toFixed(1)} <span>mm</span></td>
        <td><span class="condition-chip ${condition.className}">${condition.label}</span></td>
      </tr>`;
    })
    .join("");
}

function renderSpotlight(records) {
  if (!records.length) {
    elements.warmestCity.textContent = "No readings";
    elements.warmestLocation.textContent = "Adjust your filters to explore";
    elements.warmestTemperature.textContent = "—";
    elements.warmestDate.textContent = "—";
    return;
  }
  const warmest = records.reduce((best, record) => (
    record.temperature > best.temperature ? record : best
  ));
  elements.warmestCity.textContent = warmest.cityName;
  elements.warmestLocation.textContent = [warmest.state, warmest.city_id].filter(Boolean).join(" · ");
  elements.warmestTemperature.textContent = warmest.temperature.toFixed(1);
  elements.warmestDate.textContent = formatDate(warmest.date);
}

function renderChart(records) {
  if (!records.length) {
    elements.chart.setAttribute("aria-label", "No weather observations match the selected filters");
    elements.chart.innerHTML = '<div class="chart-empty"><span aria-hidden="true">☁</span><strong>No readings in this date range</strong><span>Choose another city or date range.</span></div>';
    elements.chartCaption.textContent = "No matching daily readings";
    return;
  }
  const grouped = new Map();
  records.forEach((record) => {
    if (!grouped.has(record.date)) grouped.set(record.date, []);
    grouped.get(record.date).push(record);
  });
  const points = [...grouped.entries()].map(([date, dayRecords]) => ({
    date,
    temperature: average(dayRecords.map((record) => record.temperature)),
    precipitation: sum(dayRecords.map((record) => record.precipitation)),
  }));
  elements.chart.setAttribute(
    "aria-label",
    `Daily average temperature in degrees Celsius and total precipitation in millimeters for ${points.length} dates`,
  );
  elements.chart.innerHTML = createChartSvg(points);
  elements.chartCaption.textContent = points.length === 1
    ? `One date · ${records.length} ${records.length === 1 ? "city reading" : "city readings"}`
    : `${points.length} dates · Temperature averaged by day`;
}

function createChartSvg(points) {
  const width = 640;
  const height = 161;
  const left = 34;
  const right = 14;
  const top = 16;
  const bottom = 27;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const temperatures = points.map((point) => point.temperature);
  const maxTemperature = Math.max(...temperatures);
  const minTemperature = Math.min(...temperatures);
  const temperaturePadding = Math.max((maxTemperature - minTemperature) * 0.25, 1);
  const low = minTemperature - temperaturePadding;
  const high = maxTemperature + temperaturePadding;
  const maxPrecipitation = Math.max(...points.map((point) => point.precipitation), 1);
  const xAt = (index) => points.length === 1
    ? left + plotWidth / 2
    : left + (index * plotWidth) / (points.length - 1);
  const yAt = (value) => top + ((high - value) / (high - low)) * plotHeight;
  const barWidth = Math.min(22, Math.max(7, plotWidth / points.length * 0.38));
  const gridLines = [0, 1, 2, 3].map((step) => {
    const y = top + (step * plotHeight) / 3;
    const label = (high - ((high - low) * step) / 3).toFixed(0);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#edf1f2" stroke-dasharray="3 4"/><text x="${left - 9}" y="${y + 3}" text-anchor="end" fill="#a4afb3" font-size="8">${label}°</text>`;
  }).join("");
  const bars = points.map((point, index) => {
    const x = xAt(index) - barWidth / 2;
    const barHeight = point.precipitation === 0 ? 2 : Math.max((point.precipitation / maxPrecipitation) * plotHeight * 0.65, 3);
    const y = top + plotHeight - barHeight;
    const dateLabel = escapeHtml(formatDate(point.date));
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="#b8d3ec" opacity=".75"><title>${dateLabel}: ${point.precipitation.toFixed(1)} mm precipitation</title></rect>`;
  }).join("");
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.temperature)}`).join(" ");
  const area = `${line} L ${xAt(points.length - 1)} ${top + plotHeight} L ${xAt(0)} ${top + plotHeight} Z`;
  const dots = points.map((point, index) => {
    const dateLabel = escapeHtml(formatDate(point.date));
    return `<circle cx="${xAt(index)}" cy="${yAt(point.temperature)}" r="4" fill="#fff" stroke="#17a895" stroke-width="2"><title>${dateLabel}: ${point.temperature.toFixed(1)}°C average temperature</title></circle>`;
  }).join("");
  const labelIndexes = points.length <= 4
    ? points.map((point, index) => index)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const labels = [...new Set(labelIndexes)].map((index) => (
    `<text x="${xAt(index)}" y="${height - 5}" text-anchor="middle" fill="#9ca8ad" font-size="8">${escapeHtml(formatShortDate(points[index].date))}</text>`
  )).join("");
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#17a895" stop-opacity=".14"/><stop offset="100%" stop-color="#17a895" stop-opacity="0"/></linearGradient></defs>
    ${gridLines}${bars}<path d="${area}" fill="url(#temp-fill)"/><path d="${line}" fill="none" stroke="#17a895" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}
  </svg>`;
}

function conditionFor(record) {
  if (record.precipitation > 0) return { label: "Rain", className: "wet" };
  if (record.temperature < 20) return { label: "Cool", className: "cool" };
  if (record.temperature >= 27) return { label: "Warm", className: "warm" };
  return { label: "Clear", className: "" };
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
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

function resetFilters() {
  elements.city.value = "all";
  if (weatherRecords.length) {
    const dates = weatherRecords.map((record) => record.date).sort();
    elements.start.value = dates[0];
    elements.end.value = dates.at(-1);
  }
  render();
}

[elements.city, elements.start, elements.end].forEach((control) => {
  control.addEventListener("change", () => {
    if (elements.start.value && elements.end.value && elements.start.value > elements.end.value) {
      if (control === elements.start) elements.end.value = elements.start.value;
      else elements.start.value = elements.end.value;
    }
    render();
  });
});
elements.reset.addEventListener("click", resetFilters);
elements.emptyReset.addEventListener("click", resetFilters);

loadWeatherData();
