import test from "node:test";
import assert from "node:assert/strict";
import { filterReadings, joinWeatherToCities, parseCsv } from "../app.js";

const weather = parseCsv("city_id,date,temp_c,precipitation_mm\nC1,2026-09-01,28.5,0\nC2,2026-09-01,22.1,1.2");
const cities = parseCsv("city_id,name,state\nC1,Techville,TX\nC2,Dataport,CA");

test("parses CSV headers and values", () => {
  assert.deepEqual(weather[0], {
    city_id: "C1",
    date: "2026-09-01",
    temp_c: "28.5",
    precipitation_mm: "0",
  });
});

test("joins only weather readings with a valid city_id", () => {
  const joined = joinWeatherToCities([...weather, { city_id: "UNKNOWN", date: "2026-09-02" }], cities);
  assert.equal(joined.length, 2);
  assert.equal(joined[0].city.name, "Techville");
});

test("filters readings by city and date", () => {
  const joined = joinWeatherToCities(weather, cities);
  assert.equal(filterReadings(joined, "C2").length, 1);
  assert.equal(filterReadings(joined, "all", "2026-09-01").length, 2);
  assert.equal(filterReadings(joined, "C1", "2026-09-02").length, 0);
});
