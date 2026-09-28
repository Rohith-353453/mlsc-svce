"use strict";

const DATASETS = [
  {
    id: "cities", name: "Cities", domain: "Cities", file: "data/cities/cities.csv",
    description: "City reference data, including population and geographic coordinates.",
    columns: [
      ["city_id", "Unique city identifier", "text"],
      ["name", "City name", "text"],
      ["state", "Two-letter state abbreviation", "text"],
      ["population", "Synthetic population count", "integer ≥ 0"],
      ["latitude", "Latitude in decimal degrees", "number · −90 to 90"],
      ["longitude", "Longitude in decimal degrees", "number · −180 to 180"]
    ],
    key: "city_id"
  },
  {
    id: "institutions", name: "Education institutions", domain: "Education", file: "data/education/institutions.csv",
    description: "Universities and colleges, linked to a city through city_id.",
    columns: [
      ["institution_id", "Unique institution identifier", "text"],
      ["name", "Institution name", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["type", "Institution type", "text"],
      ["students", "Student count", "integer ≥ 0"]
    ],
    key: "institution_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "air_quality", name: "Air quality", domain: "Environment", file: "data/environment/air_quality.csv",
    description: "Dated air quality readings and their primary pollutant.",
    columns: [
      ["record_id", "Unique reading identifier", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["date", "Date of reading", "YYYY-MM-DD"],
      ["aqi", "Air Quality Index", "integer · 0 to 500"],
      ["main_pollutant", "Primary pollutant", "text"]
    ],
    key: "record_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "weather", name: "Weather", domain: "Environment", file: "data/environment/weather.csv",
    description: "Daily weather observations, including temperature and precipitation.",
    columns: [
      ["record_id", "Unique reading identifier", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["date", "Date of reading", "YYYY-MM-DD"],
      ["temp_c", "Temperature in Celsius", "number · −90 to 60"],
      ["precipitation_mm", "Precipitation in millimeters", "number ≥ 0"]
    ],
    key: "record_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "railway_stations", name: "Railway stations", domain: "Transportation", file: "data/transportation/railway_stations.csv",
    description: "Station identifiers, city assignments, and the number of lines served.",
    columns: [
      ["station_id", "Unique station identifier", "text"],
      ["name", "Station name", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["lines", "Number of lines served", "integer ≥ 1"]
    ],
    key: "station_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "routes", name: "Routes", domain: "Transportation", file: "data/transportation/routes.csv",
    description: "Transit routes connecting a start station to a different end station.",
    columns: [
      ["route_id", "Unique route identifier", "text"],
      ["type", "Route type", "text"],
      ["start_station_id", "Starting railway station", "station reference"],
      ["end_station_id", "Ending railway station", "station reference"]
    ],
    key: "route_id", refs: [
      { field: "start_station_id", target: "railway_stations", targetKey: "station_id" },
      { field: "end_station_id", target: "railway_stations", targetKey: "station_id" }
    ]
  },
  {
    id: "hospitals", name: "Hospitals", domain: "Public services", file: "data/public_services/hospitals.csv",
    description: "Hospital names, city assignments, and bed capacity.",
    columns: [
      ["hospital_id", "Unique hospital identifier", "text"],
      ["name", "Hospital name", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["beds", "Hospital bed capacity", "integer ≥ 0"]
    ],
    key: "hospital_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "public_facilities", name: "Public facilities", domain: "Public services", file: "data/public_services/public_facilities.csv",
    description: "Public facility names, city assignments, and facility types.",
    columns: [
      ["facility_id", "Unique facility identifier", "text"],
      ["name", "Facility name", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["type", "Facility type", "text"]
    ],
    key: "facility_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  },
  {
    id: "schools", name: "Schools", domain: "Public services", file: "data/public_services/schools.csv",
    description: "School names, city assignments, and education levels.",
    columns: [
      ["school_id", "Unique school identifier", "text"],
      ["name", "School name", "text"],
      ["city_id", "Reference to cities.csv", "city reference"],
      ["level", "School education level", "Primary · Secondary · High"]
    ],
    key: "school_id", refs: [{ field: "city_id", target: "cities", targetKey: "city_id" }]
  }
];

const state = { results: new Map(), findings: [], checks: [], selectedDataset: "cities", domain: "all", view: "overview", scanDate: null };
const DOMAIN_ORDER = ["Cities", "Education", "Environment", "Transportation", "Public services"];

function parseCSV(text) {
  const input = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((header) => header.trim());
  const records = rows.slice(1).map((values, index) => {
    const record = {};
    headers.forEach((header, i) => { record[header] = values[i] === undefined ? "" : values[i]; });
    return { values: record, rowNumber: index + 2, cells: values };
  });
  return { headers, records };
}

function finding(dataset, row, column, value, title, severity, recommendation, rule) {
  return { dataset: dataset.name, datasetId: dataset.id, file: dataset.file, row, column, value, title, severity, recommendation, rule };
}

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateDataset(dataset, parsed, loadedData) {
  const issues = [];
  const checks = [];
  const expected = dataset.columns.map(([column]) => column);
  const missingHeaders = expected.filter((column) => !parsed.headers.includes(column));
  const unexpectedHeaders = parsed.headers.filter((column) => !expected.includes(column));
  const duplicateHeaders = parsed.headers.filter((column, index) => parsed.headers.indexOf(column) !== index);
  checks.push({ dataset: dataset.name, label: "Required columns", total: expected.length + unexpectedHeaders.length + duplicateHeaders.length, failed: missingHeaders.length + unexpectedHeaders.length + duplicateHeaders.length });
  missingHeaders.forEach((column) => issues.push(finding(dataset, 1, column, "(column missing)", `Required column “${column}” is missing`, "high", "Confirm the source schema before adding a column; no value can be inferred.", "schema")));
  unexpectedHeaders.forEach((column) => issues.push(finding(dataset, 1, column, "(unexpected column)", `Unexpected column “${column}” is not in the data dictionary`, "low", "Check whether the column is intentional and update the data dictionary if so.", "schema")));
  duplicateHeaders.forEach((column) => issues.push(finding(dataset, 1, column, "(duplicate header)", `Column “${column}” appears more than once`, "high", "Check the source header row and resolve the duplicate before interpreting these values.", "schema")));
  checks.push({ dataset: dataset.name, label: "Row shape", total: parsed.records.length, failed: parsed.records.filter((record) => record.cells.length !== parsed.headers.length).length });

  const nameKey = expected.includes("name") ? "name" : null;
  const nameSeen = new Map();
  const recordSeen = new Map();
  const idSeen = new Map();
  const rowsWithIssues = new Set();
  const rowIssue = (entry) => rowsWithIssues.add(entry.row);
  const mark = (entry) => { issues.push(entry); rowIssue(entry); };

  parsed.records.forEach((record) => {
    const values = record.values;
    if (record.cells.length !== parsed.headers.length) {
      mark(finding(dataset, record.rowNumber, "(row)", record.cells.length, "Row has a different number of fields than the header", "high", "Check the source CSV quoting and delimiters; do not discard or shift values automatically.", "row-shape"));
    }
    expected.forEach((column) => {
      if (!parsed.headers.includes(column)) return;
      const value = values[column] === undefined ? "" : values[column];
      if (!value.trim()) {
        mark(finding(dataset, record.rowNumber, column, "(blank)", `Missing value in ${column}`, "medium", "Consult the source of record. Leave unknown values blank rather than infer them.", "missing"));
        return;
      }
      if (value !== value.trim()) {
        mark(finding(dataset, record.rowNumber, column, value, `Leading or trailing whitespace in ${column}`, "low", `Safe proposal: trim to “${value.trim()}”. Original data is unchanged until separately approved.`, "whitespace"));
      }
      if (["city_id", "station_id", "institution_id", "record_id", "route_id", "hospital_id", "facility_id", "school_id"].includes(column) && value !== value.trim()) return;

      const number = Number(value);
      const integerColumns = ["population", "students", "aqi", "lines", "beds"];
      if (integerColumns.includes(column) && (!Number.isInteger(number) || number < (column === "lines" ? 1 : 0))) {
        mark(finding(dataset, record.rowNumber, column, value, `Invalid ${column.replaceAll("_", " ")}`, "high", `Expected a whole number ${column === "lines" ? "of at least 1" : "of 0 or more"}. Verify the source value; no replacement is inferred.`, "numeric"));
      }
      if (["latitude", "longitude", "temp_c", "precipitation_mm"].includes(column) && !Number.isFinite(number)) {
        mark(finding(dataset, record.rowNumber, column, value, `Non-numeric value in ${column}`, "high", "Confirm the source value and units before correcting this measurement.", "numeric"));
      } else if (column === "latitude" && (number < -90 || number > 90)) {
        mark(finding(dataset, record.rowNumber, column, value, "Latitude is outside −90 to 90 degrees", "high", "Verify the coordinate and sign against the source; do not clamp coordinates.", "range"));
      } else if (column === "longitude" && (number < -180 || number > 180)) {
        mark(finding(dataset, record.rowNumber, column, value, "Longitude is outside −180 to 180 degrees", "high", "Verify the coordinate and sign against the source; do not clamp coordinates.", "range"));
      } else if (column === "temp_c" && Number.isFinite(number) && (number < -90 || number > 60)) {
        mark(finding(dataset, record.rowNumber, column, value, "Temperature is outside the review range (−90 to 60 °C)", "medium", "Verify the measurement and units. The review range flags implausible values but does not infer a replacement.", "range"));
      } else if (column === "precipitation_mm" && Number.isFinite(number) && number < 0) {
        mark(finding(dataset, record.rowNumber, column, value, "Precipitation cannot be negative", "high", "Verify the source measurement; do not change a negative value without source evidence.", "range"));
      } else if (column === "aqi" && Number.isInteger(number) && (number < 0 || number > 500)) {
        mark(finding(dataset, record.rowNumber, column, value, "AQI is outside 0 to 500", "high", "Verify the reported AQI and scale against the source record.", "range"));
      }
      if (column === "state" && !/^[A-Z]{2}$/.test(value)) {
        const normalized = value.trim().toUpperCase();
        const safe = /^[a-zA-Z]{2}$/.test(normalized);
        mark(finding(dataset, record.rowNumber, column, value, "State is not a two-letter uppercase abbreviation", safe ? "low" : "medium", safe ? `Safe proposal: normalize to “${normalized}”. Confirm the abbreviation before applying.` : "Confirm the correct two-letter state abbreviation from the source; do not guess.", "format"));
      }
      if (column === "date" && !validateDate(value)) {
        mark(finding(dataset, record.rowNumber, column, value, "Date is not a valid YYYY-MM-DD date", "high", "Confirm the date with the source; formatting alone cannot resolve an invalid calendar date.", "date"));
      }
      if (dataset.id === "schools" && column === "level" && !["Primary", "Secondary", "High"].includes(value)) {
        const match = ["Primary", "Secondary", "High"].find((candidate) => candidate.toLowerCase() === value.toLowerCase());
        mark(finding(dataset, record.rowNumber, column, value, "School level is outside the documented values", match ? "low" : "medium", match ? `Safe proposal: use documented spelling “${match}”.` : "Check the school's classification and the data dictionary before assigning a level.", "enum"));
      }
    });

    if (dataset.key && values[dataset.key] !== undefined && values[dataset.key].trim()) {
      const id = values[dataset.key];
      if (idSeen.has(id)) {
        mark(finding(dataset, record.rowNumber, dataset.key, id, `Duplicate ${dataset.key}`, "high", `Also occurs at row ${idSeen.get(id)}. Confirm which record is authoritative before changing an identifier.`, "duplicate-id"));
      } else idSeen.set(id, record.rowNumber);
    }
    if (nameKey && values[nameKey] && values[nameKey].trim()) {
      const normalized = values[nameKey].trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (nameSeen.has(normalized)) {
        mark(finding(dataset, record.rowNumber, nameKey, values[nameKey], "Potential duplicate name", "low", `A similar name occurs at row ${nameSeen.get(normalized)}. Compare the entities; distinct records can legitimately share a name.`, "duplicate-name"));
      } else nameSeen.set(normalized, record.rowNumber);
    }
    const rowSignature = parsed.headers.map((header) => values[header] ?? "").join("\u001f");
    if (recordSeen.has(rowSignature)) {
      mark(finding(dataset, record.rowNumber, "(row)", rowSignature, "Duplicate row", "medium", `An identical row occurs at row ${recordSeen.get(rowSignature)}. Verify whether this is a repeated observation before removing anything.`, "duplicate-row"));
    } else recordSeen.set(rowSignature, record.rowNumber);
  });

  const referenceTotal = dataset.refs ? dataset.refs.reduce((count, ref) => count + parsed.records.length, 0) : 0;
  let referenceFailures = 0;
  if (dataset.refs) {
    dataset.refs.forEach((ref) => {
      const parent = loadedData.get(ref.target);
      const allowed = new Set(parent ? parent.records.map((record) => record.values[ref.targetKey]).filter(Boolean) : []);
      parsed.records.forEach((record) => {
        const value = record.values[ref.field];
        if (value && !allowed.has(value)) {
          referenceFailures += 1;
          mark(finding(dataset, record.rowNumber, ref.field, value, `Broken reference: ${ref.field} “${value}” not found`, "high", `No matching ${ref.targetKey} exists in ${ref.target}. Verify the source IDs; do not invent a target record.`, "reference"));
        }
      });
    });
    if (dataset.id === "routes") {
      parsed.records.forEach((record) => {
        const start = record.values.start_station_id;
        const end = record.values.end_station_id;
        if (start && end && start === end) {
          referenceFailures += 1;
          mark(finding(dataset, record.rowNumber, "end_station_id", end, "Route starts and ends at the same station", "medium", "Confirm whether this is an intentional loop route before changing either endpoint.", "reference"));
        }
      });
    }
    checks.push({ dataset: dataset.name, label: "References", total: referenceTotal, failed: referenceFailures });
  }

  const missingCount = issues.filter((issue) => issue.rule === "missing").length;
  const invalidCells = new Set(issues.filter((issue) => ["numeric", "range", "date", "format", "enum"].includes(issue.rule)).map((issue) => `${issue.row}\u001f${issue.column}`));
  const invalidCount = invalidCells.size;
  const duplicateCount = issues.filter((issue) => issue.rule.startsWith("duplicate")).length;
  checks.push({ dataset: dataset.name, label: "Missing values", total: parsed.records.length * expected.length, failed: missingCount });
  checks.push({ dataset: dataset.name, label: "Unique IDs", total: dataset.key ? parsed.records.length : 0, failed: issues.filter((issue) => issue.rule === "duplicate-id").length });
  checks.push({ dataset: dataset.name, label: "Duplicate rows", total: parsed.records.length, failed: issues.filter((issue) => issue.rule === "duplicate-row").length });
  checks.push({ dataset: dataset.name, label: "Value formats & ranges", total: parsed.records.length * expected.length, failed: invalidCount });
  checks.push({ dataset: dataset.name, label: "Name consistency", total: nameKey ? parsed.records.length : 0, failed: issues.filter((issue) => issue.rule === "duplicate-name").length });
  checks.push({ dataset: dataset.name, label: "Whitespace", total: parsed.records.length * expected.length, failed: issues.filter((issue) => issue.rule === "whitespace").length });
  return { dataset, headers: parsed.headers, records: parsed.records, issues, checks, rowsWithIssues, duplicateCount };
}

async function runChecks() {
  const runButton = document.querySelector("#rerun-button");
  const status = document.querySelector("#run-status");
  const statusDot = document.querySelector("#status-dot");
  runButton.disabled = true;
  status.textContent = "Checking CSV files…";
  statusDot.className = "status-dot";
  const loaded = new Map();
  const errors = [];
  const responses = await Promise.all(DATASETS.map(async (dataset) => {
    try {
      const response = await fetch(dataset.file, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { dataset, parsed: parseCSV(await response.text()) };
    } catch (error) {
      errors.push(`${dataset.file}: ${error.message}`);
      return { dataset, parsed: { headers: [], records: [] }, error };
    }
  }));
  responses.forEach(({ dataset, parsed }) => loaded.set(dataset.id, parsed));
  state.results.clear();
  state.findings = [];
  state.checks = [];
  responses.forEach(({ dataset, parsed, error }) => {
    if (error) {
      const issue = finding(dataset, 0, "(file)", error.message, "Could not load dataset", "high", "Serve the repository root over HTTP and confirm the CSV path is available.", "load");
      const checks = [{ dataset: dataset.name, label: "File available", total: 1, failed: 1 }];
      state.results.set(dataset.id, { dataset, headers: [], records: [], issues: [issue], checks, rowsWithIssues: new Set(), loadError: true });
      state.findings.push(issue);
      state.checks.push(...checks);
      return;
    }
    const result = validateDataset(dataset, parsed, loaded);
    state.results.set(dataset.id, result);
    state.findings.push(...result.issues);
    state.checks.push(...result.checks);
  });
  state.scanDate = new Date();
  render();
  document.querySelector("#load-error").hidden = errors.length === 0;
  if (errors.length) {
    document.querySelector("#load-error").textContent = `Some CSV files could not be loaded. ${errors.join(" · ")} Start a local server from the repository root (for example, python -m http.server 8000) and reopen the app at http://localhost:8000.`;
    status.textContent = `${errors.length} file${errors.length === 1 ? "" : "s"} unavailable`;
    statusDot.className = "status-dot error";
  } else {
    status.textContent = "Checks complete";
    statusDot.className = "status-dot ready";
  }
  runButton.disabled = false;
  document.querySelector("#export-button").disabled = false;
}

function byDatasetName(name) {
  return DATASETS.find((dataset) => dataset.name === name);
}

function resultFor(dataset) {
  return state.results.get(dataset.id);
}

function domainHealth(domain) {
  const datasets = DATASETS.filter((dataset) => dataset.domain === domain);
  const checks = datasets.flatMap((dataset) => (resultFor(dataset)?.checks || []));
  const total = checks.reduce((sum, check) => sum + check.total, 0);
  const failed = checks.reduce((sum, check) => sum + check.failed, 0);
  return { datasets, checks, total, failed, score: total ? Math.round((total - failed) / total * 100) : 0 };
}

function render() {
  const readyResults = [...state.results.values()];
  const totalRows = readyResults.reduce((sum, result) => sum + result.records.length, 0);
  const totalChecks = state.checks.reduce((sum, check) => sum + (check.total || 0), 0);
  const failedChecks = state.checks.reduce((sum, check) => sum + check.failed, 0);
  const score = totalChecks ? Math.round((totalChecks - failedChecks) / totalChecks * 100) : 0;
  const issueCount = state.findings.length;
  document.querySelector("#health-score").textContent = `${score}%`;
  document.querySelector("#health-label").textContent = issueCount ? "REVIEW" : "LOOKING GOOD";
  document.querySelector("#health-bar").style.width = `${score}%`;
  document.querySelector("#health-caption").textContent = issueCount ? `${issueCount} finding${issueCount === 1 ? "" : "s"} need attention` : "All configured checks passed";
  const loadedDatasetCount = readyResults.filter((result) => !result.loadError).length;
  document.querySelector("#dataset-count").textContent = loadedDatasetCount;
  document.querySelector("#dataset-caption").textContent = `${loadedDatasetCount} of ${DATASETS.length} CSVs loaded`;
  document.querySelector("#record-count").textContent = totalRows.toLocaleString();
  document.querySelector("#issue-count").textContent = issueCount;
  document.querySelector("#issue-caption").textContent = issueCount ? `${state.findings.filter((item) => item.severity === "high").length} high-priority · ${state.findings.filter((item) => item.severity !== "high").length} to review` : "No issues detected in this scan";
  document.querySelector("#finding-nav-count").textContent = issueCount;
  document.querySelector("#checks-total").textContent = `${state.checks.length} checks`;
  document.querySelector("#scan-time").textContent = state.scanDate ? state.scanDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  renderDomains();
  renderChecks();
  renderOverviewFindings();
  renderDatasetRows();
  renderFindings();
  renderCatalog();
  renderDatasetDetail();
}

function renderDomains() {
  const container = document.querySelector("#domain-cards");
  container.innerHTML = "";
  DOMAIN_ORDER.forEach((domain) => {
    const info = domainHealth(domain);
    const findings = state.findings.filter((issue) => byDatasetName(issue.dataset)?.domain === domain).length;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "domain-card";
    card.innerHTML = `<div class="domain-card-top"><span class="domain-name">${escapeHTML(domain)}</span><span class="domain-quality">${info.score}%</span></div><div class="domain-track"><span style="width:${info.score}%"></span></div><div class="domain-meta"><span>${info.datasets.length} dataset${info.datasets.length === 1 ? "" : "s"}</span><span class="${findings ? "domain-issue" : ""}">${findings ? `${findings} finding${findings === 1 ? "" : "s"}` : "All clear"}</span></div>`;
    card.addEventListener("click", () => {
      state.domain = domain;
      document.querySelectorAll(".domain-item").forEach((item) => item.classList.toggle("selected", item.dataset.domain === domain));
      setView("datasets");
      document.querySelector("#dataset-search").value = "";
      renderCatalog();
      const first = DATASETS.find((item) => item.domain === domain);
      if (first) selectDataset(first.id);
    });
    container.append(card);
  });
}

function renderChecks() {
  const groups = [
    ["Missing values", "Blank cells in documented columns"],
    ["Unique IDs", "Repeated dataset identifiers"],
    ["Duplicate rows", "Exact repeated records"],
    ["Name consistency", "Potential duplicate names within a dataset"],
    ["Whitespace", "Leading or trailing spaces in cells"],
    ["Value formats & ranges", "Dates, numeric values, coordinates, and bounds"],
    ["References", "city_id and station ID relationships"]
  ];
  const list = document.querySelector("#check-list");
  list.innerHTML = "";
  groups.forEach(([label, explanation]) => {
    const related = state.checks.filter((check) => check.label === label);
    const failed = related.reduce((sum, check) => sum + check.failed, 0);
    const total = related.reduce((sum, check) => sum + check.total, 0);
    const item = document.createElement("div");
    item.className = "check-row";
    item.innerHTML = `<span class="check-state ${failed ? "fail" : ""}">${failed ? "!" : "✓"}</span><span class="check-name" title="${escapeHTML(explanation)}">${escapeHTML(label)}</span><span class="check-result">${failed ? `${failed} issue${failed === 1 ? "" : "s"}` : `${total.toLocaleString()} passed`}</span>`;
    list.append(item);
  });
}

function renderOverviewFindings() {
  const container = document.querySelector("#overview-findings");
  container.innerHTML = "";
  if (!state.findings.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-check">✓</span><strong>Nothing needs fixing right now</strong><span>All checks are clear. Your source files stay untouched.</span></div>`;
    return;
  }
  state.findings.slice(0, 3).forEach((issue) => {
    const row = document.createElement("div");
    row.className = "finding-preview";
    row.innerHTML = `<div class="finding-preview-title">${escapeHTML(issue.title)}</div><div class="finding-preview-meta">${escapeHTML(issue.dataset)} · row ${issue.row || "—"} · ${escapeHTML(issue.column)}</div>`;
    container.append(row);
  });
}

function makeDatasetButton(dataset) {
  const result = resultFor(dataset);
  const button = document.createElement("button");
  button.className = "dataset-row";
  button.type = "button";
  button.innerHTML = `<span class="dataset-file-icon">CSV</span><span class="dataset-row-copy"><strong>${escapeHTML(dataset.name)}</strong><small>${result ? result.records.length : 0} rows · ${escapeHTML(dataset.domain)}</small></span><span class="row-status ${result?.issues.length ? "has-issues" : ""}"></span>`;
  button.addEventListener("click", () => { state.domain = "all"; setView("datasets"); selectDataset(dataset.id); });
  return button;
}

function renderDatasetRows() {
  const container = document.querySelector("#overview-datasets");
  container.innerHTML = "";
  DATASETS.forEach((dataset) => container.append(makeDatasetButton(dataset)));
}

function filteredDatasets() {
  const query = document.querySelector("#dataset-search")?.value.trim().toLowerCase() || "";
  return DATASETS.filter((dataset) => (state.domain === "all" || dataset.domain === state.domain) && (!query || `${dataset.name} ${dataset.file} ${dataset.domain}`.toLowerCase().includes(query)));
}

function renderCatalog() {
  const list = document.querySelector("#catalog-list");
  list.innerHTML = "";
  filteredDatasets().forEach((dataset) => {
    const result = resultFor(dataset);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `catalog-item${state.selectedDataset === dataset.id ? " selected" : ""}`;
    button.innerHTML = `<span class="dataset-file-icon">CSV</span><span class="dataset-row-copy"><strong>${escapeHTML(dataset.name)}</strong><small>${result ? result.records.length : 0} records · ${escapeHTML(dataset.domain)}</small></span><span class="row-status ${result?.issues.length ? "has-issues" : ""}"></span>`;
    button.addEventListener("click", () => selectDataset(dataset.id));
    list.append(button);
  });
  if (!list.children.length) list.innerHTML = `<div class="preview-empty">No datasets match this search.</div>`;
}

function selectDataset(id) {
  state.selectedDataset = id;
  renderCatalog();
  renderDatasetDetail();
}

function renderDatasetDetail() {
  const container = document.querySelector("#dataset-detail");
  const dataset = DATASETS.find((item) => item.id === state.selectedDataset) || DATASETS[0];
  const result = resultFor(dataset);
  if (!result) {
    container.innerHTML = `<div class="preview-empty">Dataset has not loaded yet.</div>`;
    return;
  }
  const schemaRows = dataset.columns.map(([name, meaning, type]) => {
    const hasColumn = result.headers.includes(name);
    return `<tr><td>${escapeHTML(name)}</td><td>${escapeHTML(meaning)}</td><td>${escapeHTML(type)}</td><td class="${hasColumn ? "column-valid" : ""}">${hasColumn ? "✓ present" : "✕ missing"}</td></tr>`;
  }).join("");
  const headers = result.headers;
  const sample = result.records.slice(0, 5);
  const preview = headers.length ? `<div class="preview-wrap"><table class="preview-table"><thead><tr>${headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr></thead><tbody>${sample.map((record) => `<tr>${headers.map((header) => `<td>${escapeHTML(record.values[header] || "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="preview-empty">No header row available to preview.</div>`;
  const refs = dataset.refs?.length ? dataset.refs.map((ref) => `${ref.field} → ${ref.target}.${ref.targetKey}`).join(" · ") : "No foreign-key references defined.";
  container.innerHTML = `<div class="detail-heading"><div class="detail-title"><span class="dataset-file-icon">CSV</span><div><h2>${escapeHTML(dataset.name)}</h2><p>${escapeHTML(dataset.file)}</p></div></div><span class="detail-badge">${result.issues.length ? `${result.issues.length} finding${result.issues.length === 1 ? "" : "s"}` : "✓ No findings"}</span></div><p class="detail-description">${escapeHTML(dataset.description)}</p><div class="detail-stats"><span class="detail-stat"><small>Records</small><strong>${result.records.length}</strong></span><span class="detail-stat"><small>Columns</small><strong>${result.headers.length}</strong></span><span class="detail-stat"><small>Primary key</small><strong>${escapeHTML(dataset.key || "—")}</strong></span><span class="detail-stat"><small>Findings</small><strong>${result.issues.length}</strong></span></div><div class="detail-section-title">Column checks <small>${dataset.columns.length} documented columns</small></div><div class="preview-wrap"><table class="schema-table"><thead><tr><th>Column</th><th>Meaning</th><th>Expected</th><th>Result</th></tr></thead><tbody>${schemaRows}</tbody></table></div><div class="detail-section-title">Record preview <small>First ${sample.length} of ${result.records.length} rows · read-only</small></div>${preview}<div class="reference-note"><strong>References & rules</strong><br>${escapeHTML(refs)}<br>Checks include blank values, unique IDs, duplicate rows, value formats, domain bounds, and name consistency. Review range thresholds in app.js before adapting them for other data sources.</div>`;
}

function renderFindings() {
  const filter = document.querySelector("#severity-filter")?.value || "all";
  const issues = state.findings.filter((issue) => filter === "all" || issue.severity === filter);
  document.querySelector("#findings-summary").textContent = `${issues.length} finding${issues.length === 1 ? "" : "s"} shown · ${state.findings.length} total`;
  const container = document.querySelector("#findings-list");
  container.innerHTML = "";
  if (!issues.length) {
    container.innerHTML = `<div class="finding-empty"><span class="empty-check">✓</span><h2>${state.findings.length ? "No findings at this severity" : "All clear for this scan"}</h2><p>${state.findings.length ? "Choose another severity filter to see the remaining findings." : "No issues were detected across the nine available CSVs. No data was changed."}</p></div>`;
    return;
  }
  issues.forEach((issue) => {
    const card = document.createElement("article");
    card.className = "finding-card";
    card.innerHTML = `<div class="finding-top"><span class="severity-pill ${issue.severity}">${escapeHTML(issue.severity)}</span><div><h3>${escapeHTML(issue.title)}</h3><div class="finding-subtitle">${escapeHTML(issue.dataset)} · ${escapeHTML(issue.file)} · row ${issue.row || "—"}</div></div></div><div class="finding-evidence"><div class="evidence-cell"><small>Column</small><strong>${escapeHTML(issue.column)}</strong></div><div class="evidence-cell"><small>Observed value</small><strong>${escapeHTML(issue.value)}</strong></div><div class="evidence-cell"><small>Rule</small><strong>${escapeHTML(issue.rule)}</strong></div></div><p class="finding-recommendation"><strong>Safe next step</strong> · ${escapeHTML(issue.recommendation)}</p>`;
    container.append(card);
  });
}

function setView(view) {
  state.view = view;
  const labels = { overview: "Overview", datasets: "Datasets", findings: "Findings" };
  document.querySelector("#breadcrumb-current").textContent = labels[view] || "Overview";
  document.querySelectorAll(".view-section").forEach((section) => { section.hidden = section.id !== `${view}-view`; });
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function exportReport() {
  const report = {
    generatedAt: state.scanDate?.toISOString() || null,
    sourceFilesModified: false,
    summary: {
      datasets: state.results.size,
      records: [...state.results.values()].reduce((sum, result) => sum + result.records.length, 0),
      checks: state.checks.length,
      findings: state.findings.length
    },
    datasets: DATASETS.map((dataset) => {
      const result = resultFor(dataset);
      return {
        name: dataset.name, file: dataset.file, loaded: Boolean(result && !result.loadError), records: result?.records.length || 0,
        columns: dataset.columns.map(([name]) => name),
        findings: result?.issues || []
      };
    })
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `data-quality-report-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Report downloaded. Source data was not changed.");
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.go)));
document.querySelectorAll(".domain-item").forEach((item) => item.addEventListener("click", () => {
  state.domain = item.dataset.domain;
  document.querySelectorAll(".domain-item").forEach((domainItem) => domainItem.classList.toggle("selected", domainItem === item));
  setView("datasets");
  document.querySelector("#dataset-search").value = "";
  renderCatalog();
  const first = filteredDatasets()[0];
  if (first) selectDataset(first.id);
}));
document.querySelector("#dataset-search").addEventListener("input", renderCatalog);
document.querySelector("#severity-filter").addEventListener("change", renderFindings);
document.querySelector("#rerun-button").addEventListener("click", runChecks);
document.querySelector("#export-button").addEventListener("click", exportReport);

runChecks();
