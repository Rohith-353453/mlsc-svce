import { filterWeather, joinWeatherToCities, parseCsv, summarizeWeather } from "./weather-data.mjs";

const cityFilter = document.querySelector("#city-filter");
const fromFilter = document.querySelector("#date-from");
const toFilter = document.querySelector("#date-to");
const errorElement = document.querySelector("#filter-error");
const tableBody = document.querySelector("#observations-body");
const resultCount = document.querySelector("#result-count");
const averageTemperature = document.querySelector("#average-temperature");
const totalPrecipitation = document.querySelector("#total-precipitation");
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
let observations = [];

function formatNumber(value) {
  return numberFormat.format(value);
}

function conditionFor(precipitation) {
  if (precipitation === 0) return { icon: "☼", label: "Dry" };
  if (precipitation < 2) return { icon: "◌", label: "Light rain" };
  return { icon: "☂", label: "Rain" };
}

function renderRows(rows) {
  if (rows.length === 0) {
    tableBody.innerHTML = '<tr><td class="status-cell" colspan="5">No observations match these filters. Try a different city or date range.</td></tr>';
    return;
  }

  const maximumPrecipitation = Math.max(...rows.map((row) => row.precipitation_mm), 1);
  tableBody.replaceChildren(...rows.map((row) => {
    const tr = document.createElement("tr");
    const condition = conditionFor(row.precipitation_mm);
    const cells = [
      ["date-cell", row.date],
      ["city-cell", ""],
      ["temperature-cell", `${formatNumber(row.temp_c)}°`],
      ["precipitation-cell", ""],
      ["", ""],
    ];
    cells.forEach(([className, text], index) => {
      const cell = document.createElement("td");
      if (className) cell.className = className;
      if (index === 1) {
        const name = document.createElement("span");
        name.textContent = row.city_name;
        cell.append(name);
        if (row.city_name !== row.city_id) {
          const id = document.createElement("span");
          id.className = "city-id";
          id.textContent = row.city_id;
          cell.append(id);
        }
      } else if (index === 3) {
        cell.append(document.createTextNode(formatNumber(row.precipitation_mm)));
        const meter = document.createElement("span");
        meter.className = "rain-meter";
        meter.setAttribute("aria-hidden", "true");
        const fill = document.createElement("span");
        fill.style.width = `${(row.precipitation_mm / maximumPrecipitation) * 100}%`;
        meter.append(fill);
        cell.append(meter);
      } else if (index === 4) {
        const badge = document.createElement("span");
        badge.className = "condition";
        const icon = document.createElement("span");
        icon.className = "condition-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = condition.icon;
        badge.append(icon, document.createTextNode(condition.label));
        cell.append(badge);
      } else {
        cell.textContent = text;
      }
      tr.append(cell);
    });
    return tr;
  }));
}

function render() {
  errorElement.hidden = true;
  try {
    const filtered = filterWeather(observations, {
      cityId: cityFilter.value,
      fromDate: fromFilter.value,
      toDate: toFilter.value,
    });
    const summary = summarizeWeather(filtered);
    resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "observation" : "observations"}`;
    averageTemperature.textContent = summary.averageTemperature === null ? "—" : `${formatNumber(summary.averageTemperature)}°`;
    totalPrecipitation.textContent = summary.totalPrecipitation === null ? "—" : `${formatNumber(summary.totalPrecipitation)} mm`;
    renderRows(filtered);
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
}

function populateCities(cities) {
  const choices = [...new Map(cities.map(({ city_id, city_name }) => [city_id, city_name])).entries()]
    .sort((first, second) => first[1].localeCompare(second[1]));
  for (const [cityId, cityName] of choices) {
    const option = document.createElement("option");
    option.value = cityId;
    option.textContent = cityName;
    cityFilter.append(option);
  }
}

async function loadWeatherData() {
  const [weatherResponse, citiesResponse] = await Promise.all([
    fetch("../../data/environment/weather.csv"),
    fetch("../../data/cities/cities.csv"),
  ]);
  if (!weatherResponse.ok) throw new Error(`Could not load weather data (${weatherResponse.status}).`);
  if (!citiesResponse.ok) throw new Error(`Could not load city data (${citiesResponse.status}).`);
  const [weatherCsv, citiesCsv] = await Promise.all([weatherResponse.text(), citiesResponse.text()]);
  const cityRows = parseCsv(citiesCsv);
  observations = joinWeatherToCities(parseCsv(weatherCsv), cityRows)
    .sort((first, second) => second.date.localeCompare(first.date) || first.city_name.localeCompare(second.city_name));
  populateCities(observations);
  render();
}

for (const control of [cityFilter, fromFilter, toFilter]) control.addEventListener("change", render);
document.querySelector("#reset-filters").addEventListener("click", () => {
  cityFilter.value = "";
  fromFilter.value = "";
  toFilter.value = "";
  render();
});

loadWeatherData().catch((error) => {
  resultCount.textContent = "Data unavailable";
  tableBody.innerHTML = '<tr><td class="status-cell" colspan="5">Weather data could not be loaded.</td></tr>';
  errorElement.textContent = error.message;
  errorElement.hidden = false;
});
