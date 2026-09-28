import test from "node:test";
import assert from "node:assert/strict";
import { filterWeather, joinWeatherToCities, parseCsv, summarizeWeather } from "./weather-data.mjs";

const weather = [
  { city_id: "C1", date: "2026-09-01", temp_c: "28.5", precipitation_mm: "0" },
  { city_id: "C2", date: "2026-09-02", temp_c: "22.1", precipitation_mm: "1.2" },
  { city_id: "C1", date: "2026-09-03", temp_c: "20", precipitation_mm: "5.5" },
];
const cities = [
  { city_id: "C1", name: "Techville", state: "TX" },
  { city_id: "C2", name: "Dataport", state: "CA" },
];

test("parses quoted CSV values, commas, and CRLF line endings", () => {
  assert.deepEqual(parseCsv('city_id,name\r\nC1,"Town, with ""quotes"""\r\n'), [
    { city_id: "C1", name: 'Town, with "quotes"' },
  ]);
});

test("rejects malformed CSV rows and unterminated quotes", () => {
  assert.throws(() => parseCsv("city_id,date\nC1"), /expected 2/);
  assert.throws(() => parseCsv('city_id\n"C1'), /unterminated/);
});

test("joins city names only using matching city_id and falls back to the ID", () => {
  const joined = joinWeatherToCities(weather, [...cities, { city_id: "C3", name: "Wrong city", state: "ZZ" }]);
  assert.equal(joined[0].city_name, "Techville, TX");
  assert.equal(joined[1].city_name, "Dataport, CA");
  assert.equal(joined[2].city_name, "Techville, TX");
  assert.equal(joinWeatherToCities([weather[0]], [cities[1]])[0].city_name, "C1");
  assert.equal(joined[0].temp_c, 28.5);
});

test("filters by city and inclusive date range", () => {
  assert.deepEqual(
    filterWeather(joinWeatherToCities(weather, cities), { cityId: "C1", fromDate: "2026-09-02", toDate: "2026-09-03" })
      .map((row) => row.date),
    ["2026-09-03"],
  );
  const numericWeather = weather.map((row) => ({
    ...row,
    temp_c: Number(row.temp_c),
    precipitation_mm: Number(row.precipitation_mm),
  }));
  assert.deepEqual(filterWeather(numericWeather, { fromDate: "2026-09-04" }), []);
  assert.throws(() => filterWeather([], { fromDate: "2026-09-04", toDate: "2026-09-03" }), /on or before/);
});

test("summarizes filtered temperatures and precipitation, including empty results", () => {
  assert.deepEqual(summarizeWeather([joinWeatherToCities(weather, cities)[0], joinWeatherToCities(weather, cities)[1]]), {
    averageTemperature: 25.3,
    totalPrecipitation: 1.2,
  });
  assert.deepEqual(summarizeWeather([]), { averageTemperature: null, totalPrecipitation: null });
});

test("rejects missing columns and invalid weather measurements", () => {
  assert.throws(() => joinWeatherToCities([{ city_id: "C1" }], []), /missing required columns/);
  assert.throws(() => joinWeatherToCities([{ ...weather[0], temp_c: "hot" }], cities), /invalid temperature/);
  assert.throws(() => joinWeatherToCities([{ ...weather[0], precipitation_mm: "-1" }], cities), /invalid temperature/);
});
