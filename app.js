const WEATHER_URL = "data/environment/weather.csv";
const CITIES_URL = "data/cities/cities.csv";

const state = { weather: [], cities: new Map(), city: "all", date: "" };
const $ = (selector) => document.querySelector(selector);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map((header) => header.trim());
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    return headers.reduce((record, header, index) => {
      record[header] = (values[index] || "").trim();
      return record;
    }, {});
  });
}

async function loadData() {
  const [weatherResponse, citiesResponse] = await Promise.all([fetch(WEATHER_URL), fetch(CITIES_URL)]);
  if (!weatherResponse.ok || !citiesResponse.ok) throw new Error("The source CSV files could not be loaded.");
  const [weatherText, citiesText] = await Promise.all([weatherResponse.text(), citiesResponse.text()]);
  state.weather = parseCsv(weatherText).map((record) => ({
    ...record,
    temp: Number(record.temp_c),
    precipitation: Number(record.precipitation_mm)
  }));
  parseCsv(citiesText).forEach((city) => state.cities.set(city.city_id, city));
  populateCities();
  render();
}

function populateCities() {
  const select = $("#city-filter");
  [...state.cities.entries()]
    .sort(([, first], [, second]) => first.name.localeCompare(second.name))
    .forEach(([cityId, city]) => {
      const option = document.createElement("option");
      option.value = cityId;
      option.textContent = `${city.name}, ${city.state}`;
      select.append(option);
    });
}

function filteredRecords() {
  return state.weather
    .filter((record) => state.city === "all" || record.city_id === state.city)
    .filter((record) => !state.date || record.date === state.date)
    .sort((first, second) => second.date.localeCompare(first.date));
}

function render() {
  const records = filteredRecords();
  const cityLabel = state.city === "all" ? "all cities" : (state.cities.get(state.city)?.name || state.city);
  $("#filter-status").textContent = `${records.length} observation${records.length === 1 ? "" : "s"} · ${cityLabel}${state.date ? ` · ${state.date}` : ""}`;
  $("#observation-count").textContent = records.length;
  $("#average-temp").textContent = records.length ? `${(records.reduce((total, record) => total + record.temp, 0) / records.length).toFixed(1)}°` : "—";
  $("#total-rain").textContent = records.length ? `${records.reduce((total, record) => total + record.precipitation, 0).toFixed(1)} mm` : "—";

  const body = $("#weather-rows");
  body.innerHTML = "";
  records.forEach((record) => {
    const city = state.cities.get(record.city_id);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="date-cell">${record.date}</td>
      <td class="city-cell">${city?.name || `Unknown city (${record.city_id})`}<span class="city-id">${record.city_id}</span></td>
      <td class="temp-value">${record.temp.toFixed(1)} °C</td>
      <td class="rain-value">${record.precipitation.toFixed(1)} mm</td>`;
    body.append(row);
  });
  $("#empty-state").hidden = records.length > 0;
  $(".table-wrap").hidden = records.length === 0;
}

function clearFilters() {
  state.city = "all";
  state.date = "";
  $("#city-filter").value = "all";
  $("#date-filter").value = "";
  render();
}

$("#city-filter").addEventListener("change", (event) => { state.city = event.target.value; render(); });
$("#date-filter").addEventListener("change", (event) => { state.date = event.target.value; render(); });
$("#clear-filters").addEventListener("click", clearFilters);
$("#empty-clear").addEventListener("click", clearFilters);

loadData().catch((error) => {
  $("#weather-rows").innerHTML = `<tr><td colspan="4" class="loading error">${error.message} Please run the app through a local web server.</td></tr>`;
  $("#filter-status").textContent = "Unable to load source data";
});
