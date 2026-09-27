const DATA_PATHS = {
  weather: "data/environment/weather.csv",
  cities: "data/cities/cities.csv",
};

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    return headers.reduce((record, header, index) => {
      record[header] = values[index]?.trim() ?? "";
      return record;
    }, {});
  });
}

export function joinWeatherToCities(weatherRows, cityRows) {
  const citiesById = new Map(cityRows.map((city) => [city.city_id, city]));
  return weatherRows
    .map((reading) => ({ ...reading, city: citiesById.get(reading.city_id) }))
    .filter((reading) => reading.city);
}

export function filterReadings(readings, cityId = "all", date = "all") {
  return readings.filter(
    (reading) =>
      (cityId === "all" || reading.city_id === cityId) &&
      (date === "all" || reading.date === date),
  );
}

const elements =
  typeof document === "undefined"
    ? null
    : {
        city: document.querySelector("#city-filter"),
        date: document.querySelector("#date-filter"),
        clear: document.querySelector("#clear-filters"),
        rows: document.querySelector("#weather-rows"),
        count: document.querySelector("#reading-count"),
        average: document.querySelector("#average-temperature"),
        rainfall: document.querySelector("#total-rainfall"),
        result: document.querySelector("#result-label"),
        empty: document.querySelector("#empty-message"),
        error: document.querySelector("#error-message"),
      };

let readings = [];

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

function populateFilters() {
  const cities = [...new Map(readings.map(({ city }) => [city.city_id, city])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  cities.forEach((city) => elements.city.add(new Option(`${city.name}, ${city.state}`, city.city_id)));
  [...new Set(readings.map(({ date }) => date))]
    .sort()
    .forEach((date) => elements.date.add(new Option(formatDate(date), date)));
}

function render() {
  const filtered = filterReadings(readings, elements.city.value, elements.date.value);
  const temperatures = filtered.map(({ temp_c }) => Number(temp_c));
  const rainfall = filtered.reduce((total, { precipitation_mm }) => total + Number(precipitation_mm), 0);
  elements.count.textContent = filtered.length;
  elements.average.textContent = temperatures.length
    ? `${(temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length).toFixed(1)}°`
    : "—";
  elements.rainfall.textContent = `${rainfall.toFixed(1)} mm`;
  elements.result.textContent = `${filtered.length} ${filtered.length === 1 ? "reading" : "readings"}`;
  elements.empty.hidden = filtered.length > 0;
  elements.rows.innerHTML = filtered
    .sort((a, b) => a.date.localeCompare(b.date) || a.city.name.localeCompare(b.city.name))
    .map(
      (reading) => `
        <tr>
          <td>${formatDate(reading.date)}</td>
          <td><div class="city-cell">${reading.city.name}<span class="city-id">${reading.city.city_id} · ${reading.city.state}</span></div></td>
          <td class="temp">${Number(reading.temp_c).toFixed(1)} °C</td>
          <td class="rain">${Number(reading.precipitation_mm).toFixed(1)} mm</td>
        </tr>`,
    )
    .join("");
}

async function loadData() {
  try {
    const [weatherResponse, citiesResponse] = await Promise.all(
      [DATA_PATHS.weather, DATA_PATHS.cities].map((path) => fetch(path)),
    );
    if (!weatherResponse.ok || !citiesResponse.ok) throw new Error("The weather data could not be loaded.");
    const [weatherText, citiesText] = await Promise.all([weatherResponse.text(), citiesResponse.text()]);
    readings = joinWeatherToCities(parseCsv(weatherText), parseCsv(citiesText));
    if (!readings.length) throw new Error("No valid city-linked weather readings were found.");
    populateFilters();
    render();
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
    elements.result.textContent = "Unable to load";
  }
}

if (elements) {
  elements.city.addEventListener("change", render);
  elements.date.addEventListener("change", render);
  elements.clear.addEventListener("click", () => {
    elements.city.value = "all";
    elements.date.value = "all";
    render();
  });
  loadData();
}
