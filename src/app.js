import { cities, describeCoverage, filterWeather, joinWeatherToCities, summarizeWeather, weatherRows } from "./data.js";

const joinedRows = joinWeatherToCities(weatherRows, cities);
const cityFilter = document.querySelector("#city-filter");
const dateFilter = document.querySelector("#date-filter");
const resetButton = document.querySelector("#reset-filters");
const tableBody = document.querySelector("#weather-table-body");
const resultCount = document.querySelector("#result-count");
const averageTemp = document.querySelector("#average-temp");
const totalRain = document.querySelector("#total-rain");
const wettestPlace = document.querySelector("#wettest-place");
const chart = document.querySelector("#rain-chart");
const coverageNote = document.querySelector("#coverage-note");

for (const city of cities) {
  const option = document.createElement("option");
  option.value = city.city_id;
  option.textContent = `${city.name}, ${city.state}`;
  cityFilter.append(option);
}

dateFilter.min = weatherRows.reduce((min, row) => row.date < min ? row.date : min, weatherRows[0].date);
dateFilter.max = weatherRows.reduce((max, row) => row.date > max ? row.date : max, weatherRows[0].date);

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function renderChart(rows) {
  chart.replaceChildren();
  const maxRain = Math.max(...joinedRows.map((row) => row.precipitation_mm), 1);
  const byCity = cities.map((city) => ({
    city,
    row: rows.find((item) => item.city_id === city.city_id)
  })).filter(({ row }) => row);

  for (const { city, row } of byCity) {
    const item = document.createElement("div");
    item.className = "chart-item";
    item.innerHTML = `<div class="chart-label"><span>${city.name}</span><strong>${row.precipitation_mm.toFixed(1)} mm</strong></div>
      <div class="bar-track"><div class="bar" style="width: ${Math.max((row.precipitation_mm / maxRain) * 100, 2)}%"></div></div>`;
    chart.append(item);
  }
}

function render() {
  const rows = filterWeather(joinedRows, { cityId: cityFilter.value, date: dateFilter.value });
  const summary = summarizeWeather(rows);
  resultCount.textContent = `${rows.length} ${rows.length === 1 ? "observation" : "observations"}`;
  coverageNote.textContent = describeCoverage(rows);
  averageTemp.textContent = summary.averageTemp === null ? "—" : `${summary.averageTemp.toFixed(1)}°C`;
  totalRain.textContent = `${summary.totalPrecipitation.toFixed(1)} mm`;
  wettestPlace.textContent = summary.wettest ? `${summary.wettest.city?.name ?? summary.wettest.city_id} · ${summary.wettest.precipitation_mm.toFixed(1)} mm` : "—";
  tableBody.replaceChildren();

  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No observations match these filters.</td></tr>';
  } else {
    for (const row of rows) {
      const tableRow = document.createElement("tr");
      tableRow.innerHTML = `<td><strong>${row.city?.name ?? "Unknown city"}</strong><span class="muted">${row.city?.state ?? row.city_id}</span></td>
        <td>${formatDate(row.date)}<span class="muted">${row.date}</span></td>
        <td class="value-cell">${row.temp_c.toFixed(1)}<span>°C</span></td>
        <td class="value-cell">${row.precipitation_mm.toFixed(1)}<span>mm</span></td>`;
      tableBody.append(tableRow);
    }
  }
  renderChart(rows);
}

cityFilter.addEventListener("change", render);
dateFilter.addEventListener("change", render);
resetButton.addEventListener("click", () => {
  cityFilter.value = "all";
  dateFilter.value = "";
  render();
});
render();
