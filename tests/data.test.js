import assert from "node:assert/strict";
import test from "node:test";
import { filterWeatherData, joinWeatherData, parseCsv } from "../js/data.js";

const weather = `record_id,city_id,date,temp_c,precipitation_mm
W1,C1,2026-09-01,28.5,0.0
W2,C2,2026-09-01,22.1,1.2`;
const cities = `city_id,name,state
C1,Techville,TX
C2,Dataport,CA`;

test("parses CSV headers and values", () => {
  assert.deepEqual(parseCsv('id,name\n1,"A, Place"'), [{ id: "1", name: "A, Place" }]);
});

test("joins weather readings to valid city names", () => {
  const readings = joinWeatherData(weather, cities);
  assert.equal(readings[0].cityName, "Techville, TX");
  assert.equal(readings[0].temperature, 28.5);
});

test("filters by city and date", () => {
  const readings = joinWeatherData(weather, cities);
  assert.equal(filterWeatherData(readings, "C2", "2026-09-01").length, 1);
  assert.equal(filterWeatherData(readings, "C1", "2026-09-02").length, 0);
});
