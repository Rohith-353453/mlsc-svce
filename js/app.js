import { filterWeatherData, joinWeatherData, parseCsv } from "./data.js";

const elements = {
  city: document.querySelector("#city-filter"),
  date: document.querySelector("#date-filter"),
  reset: document.querySelector("#reset-button"),
  body: document.querySelector("#readings-body"),
  empty: document.querySelector("#empty-state"),
  status: document.querySelector("#status"),
  count: document.querySelector("#reading-count"),
  average: document.querySelector("#average-temperature"),
  precipitation: document.querySelector("#total-precipitation"),
};

const formatTemperature = (value) => `${value.toFixed(1)} °C`;
const formatPrecipitation = (value) => `${value.toFixed(1)} mm`;

function render(readings) {
  elements.body.replaceChildren(...readings.map((reading) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><time datetime="${reading.date}">${new Date(`${reading.date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })}</time></td>
      <td><strong>${reading.cityName}</strong><small>${reading.city_id}</small></td>
      <td>${formatTemperature(reading.temperature)}</td>
      <td>${formatPrecipitation(reading.precipitation)}</td>`;
    return row;
  }));
  elements.empty.hidden = readings.length > 0;
  elements.count.textContent = readings.length;
  elements.average.textContent = readings.length
    ? formatTemperature(readings.reduce((sum, reading) => sum + reading.temperature, 0) / readings.length)
    : "—";
  elements.precipitation.textContent = readings.length
    ? formatPrecipitation(readings.reduce((sum, reading) => sum + reading.precipitation, 0))
    : "—";
  elements.status.textContent = readings.length ? `Showing ${readings.length} of the available readings` : "No matching readings";
}

async function load() {
  const [weatherResponse, citiesResponse] = await Promise.all([
    fetch("data/environment/weather.csv"),
    fetch("data/cities/cities.csv"),
  ]);
  if (!weatherResponse.ok || !citiesResponse.ok) throw new Error("Weather data could not be loaded.");
  const [weatherText, citiesText] = await Promise.all([weatherResponse.text(), citiesResponse.text()]);
  const readings = joinWeatherData(weatherText, citiesText);
  const cityNames = new Map(parseCsv(citiesText).map((city) => [city.city_id, `${city.name}, ${city.state}`]));
  [...cityNames.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
    const option = new Option(name, id);
    elements.city.append(option);
  });
  const update = () => render(filterWeatherData(readings, elements.city.value, elements.date.value));
  elements.city.addEventListener("change", update);
  elements.date.addEventListener("input", update);
  elements.reset.addEventListener("click", () => {
    elements.city.value = "";
    elements.date.value = "";
    update();
  });
  update();
}

load().catch((error) => {
  elements.status.textContent = error.message;
  elements.empty.hidden = false;
});
