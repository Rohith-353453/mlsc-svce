import test from "node:test";
import assert from "node:assert/strict";
import { cities, filterWeather, joinWeatherToCities, summarizeWeather, weatherRows } from "../src/data.js";

test("joins every weather observation to its city by city_id", () => {
  const joined = joinWeatherToCities(weatherRows, cities);
  assert.deepEqual(joined.map((row) => row.city.name), ["Techville", "Dataport", "Innovia"]);
  assert.equal(joined.filter((row) => !row.city).length, 0);
});

test("filters by city and date", () => {
  assert.equal(filterWeather(weatherRows, { cityId: "C2" }).length, 1);
  assert.equal(filterWeather(weatherRows, { date: "2026-09-01" }).length, 3);
  assert.equal(filterWeather(weatherRows, { cityId: "C1", date: "2026-01-01" }).length, 0);
});

test("summarizes the currently visible observations", () => {
  const summary = summarizeWeather(weatherRows);
  assert.equal(summary.averageTemp.toFixed(1), "23.2");
  assert.equal(summary.totalPrecipitation, 6.7);
  assert.equal(summary.wettest.city_id, "C3");
});
