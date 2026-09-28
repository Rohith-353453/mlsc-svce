const REQUIRED_WEATHER_FIELDS = ["city_id", "date", "temp_c", "precipitation_mm"];
const REQUIRED_CITY_FIELDS = ["city_id", "name", "state"];

export function parseCsv(text) {
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
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  if (rows.length === 0) throw new Error("CSV is empty.");

  const [headers, ...records] = rows;
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate column names.");
  return records.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function assertFields(rows, fields, label) {
  if (rows.length === 0) throw new Error(`${label} CSV has no data rows.`);
  const availableFields = Object.keys(rows[0]);
  const missing = fields.filter((field) => !availableFields.includes(field));
  if (missing.length > 0) throw new Error(`${label} CSV is missing required columns: ${missing.join(", ")}.`);
}

export function joinWeatherToCities(weatherRows, cityRows) {
  assertFields(weatherRows, REQUIRED_WEATHER_FIELDS, "Weather");
  if (cityRows.length > 0) assertFields(cityRows, REQUIRED_CITY_FIELDS, "Cities");

  const citiesById = new Map(cityRows.map((city) => [city.city_id, city]));
  return weatherRows.map((record) => {
    const temperature = Number(record.temp_c);
    const precipitation = Number(record.precipitation_mm);
    if (!record.city_id || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      throw new Error(`Weather record has an invalid city_id or date: ${JSON.stringify(record)}.`);
    }
    if (!Number.isFinite(temperature) || !Number.isFinite(precipitation) || precipitation < 0) {
      throw new Error(`Weather record has an invalid temperature or precipitation: ${JSON.stringify(record)}.`);
    }
    const city = citiesById.get(record.city_id);
    return {
      ...record,
      temp_c: temperature,
      precipitation_mm: precipitation,
      city_name: city ? `${city.name}, ${city.state}` : record.city_id,
    };
  });
}

export function filterWeather(rows, { cityId = "", fromDate = "", toDate = "" } = {}) {
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error("The start date must be on or before the end date.");
  }
  return rows.filter((row) =>
    (!cityId || row.city_id === cityId) &&
    (!fromDate || row.date >= fromDate) &&
    (!toDate || row.date <= toDate)
  );
}

export function summarizeWeather(rows) {
  if (rows.length === 0) return { averageTemperature: null, totalPrecipitation: null };
  const temperatureTotal = rows.reduce((total, row) => total + row.temp_c, 0);
  const precipitationTotal = rows.reduce((total, row) => total + row.precipitation_mm, 0);
  return {
    averageTemperature: temperatureTotal / rows.length,
    totalPrecipitation: precipitationTotal,
  };
}
