"use strict";

const hospitalsUrl = "../../data/public_services/hospitals.csv";
const citiesUrl = "../../data/cities/cities.csv";

const searchInput = document.querySelector("#search");
const cityFilter = document.querySelector("#city-filter");
const bedsFilter = document.querySelector("#beds-filter");
const clearButton = document.querySelector("#clear-filters");
const resultCount = document.querySelector("#result-count");
const statusMessage = document.querySelector("#results-status");
const hospitalList = document.querySelector("#hospital-list");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("A CSV field was not closed.");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows.shift().map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim()
  );
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

async function loadCsv(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`);
  return parseCsv(await response.text());
}

function getRequiredValue(record, key, rowNumber) {
  const value = record[key]?.trim();
  if (!value) throw new Error(`The ${key} field is missing on data row ${rowNumber}.`);
  return value;
}

function normalizeHospitals(rows) {
  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const bedsText = getRequiredValue(row, "beds", rowNumber);
    const beds = Number(bedsText);

    if (!Number.isSafeInteger(beds) || beds < 0) {
      throw new Error(`The beds value on data row ${rowNumber} must be a non-negative whole number.`);
    }

    return {
      id: getRequiredValue(row, "hospital_id", rowNumber),
      name: getRequiredValue(row, "name", rowNumber),
      cityId: getRequiredValue(row, "city_id", rowNumber),
      beds
    };
  });
}

function normalizeCities(rows) {
  return new Map(
    rows.map((row, index) => {
      const rowNumber = index + 2;
      const id = getRequiredValue(row, "city_id", rowNumber);
      const name = getRequiredValue(row, "name", rowNumber);
      return [id, { name, state: row.state?.trim() ?? "" }];
    })
  );
}

function cityLabel(hospital, cities) {
  const city = cities.get(hospital.cityId);
  return city ? `${city.name}${city.state ? `, ${city.state}` : ""}` : "City unavailable";
}

function renderCityOptions(hospitals, cities) {
  const validCities = new Map();
  hospitals.forEach((hospital) => {
    const city = cities.get(hospital.cityId);
    if (city) validCities.set(hospital.cityId, city);
  });

  [...validCities.entries()]
    .sort(([, first], [, second]) => first.name.localeCompare(second.name))
    .forEach(([id, city]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = cityLabel({ cityId: id }, cities);
      cityFilter.append(option);
    });
}

function createHospitalCard(hospital, cities) {
  const card = document.createElement("article");
  card.className = "hospital-card";

  const details = document.createElement("div");
  details.className = "hospital-card-main";

  const id = document.createElement("p");
  id.className = "hospital-id";
  id.textContent = hospital.id;

  const name = document.createElement("h3");
  name.className = "hospital-name";
  name.textContent = hospital.name;

  const city = document.createElement("p");
  city.className = "hospital-city";
  city.textContent = cityLabel(hospital, cities);

  details.append(id, name, city);

  const capacity = document.createElement("div");
  capacity.className = "capacity";

  const bedCount = document.createElement("span");
  bedCount.className = "capacity-number";
  bedCount.textContent = hospital.beds.toLocaleString();

  const unit = document.createElement("span");
  unit.className = "capacity-unit";
  unit.textContent = "beds";
  capacity.append(bedCount, unit);

  card.append(details, capacity);
  return card;
}

function renderHospitals(hospitals, cities) {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const selectedCity = cityFilter.value;
  const minimumBeds = bedsFilter.value === "" ? 0 : Number(bedsFilter.value);
  const filtered = hospitals.filter((hospital) => {
    const matchesSearch =
      hospital.name.toLocaleLowerCase().includes(query) ||
      hospital.id.toLocaleLowerCase().includes(query);
    const matchesCity = !selectedCity || hospital.cityId === selectedCity;
    return matchesSearch && matchesCity && hospital.beds >= minimumBeds;
  });

  hospitalList.replaceChildren();
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;

  if (filtered.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No hospitals match those filters. Try adjusting your search.";
    hospitalList.append(emptyState);
    return;
  }

  filtered.forEach((hospital) => hospitalList.append(createHospitalCard(hospital, cities)));
}

function showError(error) {
  statusMessage.dataset.error = "true";
  statusMessage.textContent = `Hospital data could not be displayed. ${error.message}`;
}

async function initialize() {
  try {
    const [hospitalRows, cityRows] = await Promise.all([
      loadCsv(hospitalsUrl, "hospital data"),
      loadCsv(citiesUrl, "city data")
    ]);
    const hospitals = normalizeHospitals(hospitalRows);
    const cities = normalizeCities(cityRows);

    renderCityOptions(hospitals, cities);
    statusMessage.textContent = "";
    renderHospitals(hospitals, cities);

    searchInput.addEventListener("input", () => renderHospitals(hospitals, cities));
    cityFilter.addEventListener("change", () => renderHospitals(hospitals, cities));
    bedsFilter.addEventListener("input", () => renderHospitals(hospitals, cities));
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      cityFilter.value = "";
      bedsFilter.value = "";
      renderHospitals(hospitals, cities);
      searchInput.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        searchInput.focus();
      }
    });
  } catch (error) {
    showError(error);
  }
}

initialize();
