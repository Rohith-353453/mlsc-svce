import test from "node:test";
import assert from "node:assert/strict";
import { filterWeather, joinCities, parseCsv, summarizeWeather } from "../examples/weather-explorer/weather-explorer.mjs";

test("parses headers, quoted commas, escaped quotes, and CRLF", () => {
  assert.deepEqual(parseCsv('\uFEFFcity_id,name\r\nC1,"Techville, TX"\r\nC2,"The ""New"" City"'), [
    { city_id: "C1", name: "Techville, TX" },
    { city_id: "C2", name: 'The "New" City' },
  ]);
});

test("rejects incomplete CSV records", () => {
  assert.throws(() => parseCsv("city_id,date\nC1"), /expected 2/);
});

test("joins city names only by city_id and keeps unknown ids usable", () => {
  const joined = joinCities(
    [{ city_id: "C1", temp_c: "28.5", precipitation_mm: "0.0" }, { city_id: "C9", temp_c: "19", precipitation_mm: "2" }],
    [{ city_id: "C1", name: "Techville" }, { city_id: "C2", name: "Dataport" }],
  );
  assert.deepEqual(joined.map(({ cityName, temp_c }) => [cityName, temp_c]), [["Techville", 28.5], ["C9", 19]]);
});

test("filters inclusively by city and date range and summarizes matching records", () => {
  const rows = joinCities(
    [
      { city_id: "C1", date: "2026-09-01", temp_c: "28.5", precipitation_mm: "0" },
      { city_id: "C1", date: "2026-09-03", temp_c: "24.5", precipitation_mm: "5.5" },
      { city_id: "C2", date: "2026-09-02", temp_c: "22.1", precipitation_mm: "1.2" },
    ],
    [{ city_id: "C1", name: "Techville" }, { city_id: "C2", name: "Dataport" }],
  );
  assert.deepEqual(filterWeather(rows).map((row) => row.date), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  const filtered = filterWeather(rows, { cityId: "C1", fromDate: "2026-09-01", toDate: "2026-09-03" });
  assert.deepEqual(filtered.map((row) => row.date), ["2026-09-01", "2026-09-03"]);
  assert.deepEqual(summarizeWeather(filtered), { count: 2, averageTemperature: 26.5, totalPrecipitation: 5.5 });
  assert.deepEqual(summarizeWeather([]), { count: 0, averageTemperature: null, totalPrecipitation: 0 });
});
