// ===============================
// Fetch Crimes (UK Police API)
// Writes only to editable fields
// ===============================

// --- Input ---
let { recordId: rawRecordId, record: rawRecord } = input.config();
if (!rawRecordId && rawRecord && rawRecord.id) {
  rawRecordId = rawRecord.id;
}
if (!rawRecordId) throw new Error("recordId not provided to the automation.");

let recordId = rawRecordId;
if (typeof recordId === "string" && recordId.startsWith("http")) {
  const m = recordId.match(/rec[a-zA-Z0-9]+/);
  if (m) recordId = m[0];
}
if (!/^rec[A-Za-z0-9]+$/.test(recordId)) throw new Error(`Invalid recordId: ${recordId}`);

// --- Tables ---
let requestsTbl = base.getTable("Search Requests");
let crimesTbl = base.getTable("Crimes");

// --- Load request ---
let req =
  rawRecord && typeof rawRecord.getCellValue === "function"
    ? rawRecord
    : await requestsTbl.selectRecordAsync(recordId);
if (!req || typeof req.getCellValue !== "function") {
  throw new Error(
    `Search Request record not found for id: ${recordId}. Check that the trigger record is from the Search Requests table.`
  );
}

// --- Read inputs from Search Requests ---
let lat = req.getCellValue("Latitude");
let lng = req.getCellValue("Longitude");
let monthField =
  requestsTbl.fields.find(field => field.name === "Month (YYYY-MM)") ||
  requestsTbl.fields.find(field => field.name === "Month") ||
  requestsTbl.fields.find(field => field.name.toLowerCase().includes("month"));
let monthFieldValue = monthField ? req.getCellValue(monthField) : null;
let statusValue = req.getCellValueAsString("Status");
let fetchCrimesFlag = req.getCellValue("Fetch crimes");

// ✅ Postcode (now writable in Crimes)
let postcode =
  req.getCellValueAsString("Postcode") ||
  req.getCellValueAsString("Post Code") ||
  null;

if (lat == null || lng == null) throw new Error("Latitude / Longitude missing on Search Request.");

if (statusValue === "Fetched" && !fetchCrimesFlag) {
  console.log("Already fetched; skipping run.");
  return;
}

// --- Month normalisation ---
function monthFromAirtableValue(v) {
  if (!v) return null;
  if (Array.isArray(v)) {
    return v
      .map(option => monthFromAirtableValue(option?.name))
      .filter(Boolean);
  }
  if (typeof v === "object" && v.name) {
    return monthFromAirtableValue(v.name);
  }
  if (typeof v === "string" && /^\d{4}-\d{2}$/.test(v.trim())) return v.trim();
  const d = new Date(v);
  if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return null;
}
let requestedMonths = monthFromAirtableValue(monthFieldValue);
if (requestedMonths && !Array.isArray(requestedMonths)) requestedMonths = [requestedMonths];
if (!requestedMonths || requestedMonths.length === 0) requestedMonths = [];
console.log(
  `Month field: ${monthField ? monthField.name : "none"}, raw value: ${JSON.stringify(
    monthFieldValue
  )}`
);

async function fetchJson(url) {
  let r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// --- Validate months ---
let availableDates = await fetchJson("https://data.police.uk/api/crimes-street-dates");
if (!Array.isArray(availableDates) || availableDates.length === 0) throw new Error("Police API returned no available months.");

let monthsToFetch = requestedMonths;

if (monthsToFetch.length === 0) {
  await requestsTbl.updateRecordAsync(recordId, { "Status": { name: "Error" } });
  throw new Error("No month selected to fetch.");
}

// --- Fetch crimes ---
let crimes = [];
for (let monthToFetch of monthsToFetch) {
  let monthCrimes = await fetchJson(
    `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${monthToFetch}`
  );
  if (!Array.isArray(monthCrimes)) monthCrimes = [];
  for (let c of monthCrimes) {
    c.__month = monthToFetch;
    crimes.push(c);
  }
}
if (crimes.length === 0) {
  await requestsTbl.updateRecordAsync(recordId, { "Status": { name: "Error" } });
  throw new Error("No data exists for the requested month(s).");
}
console.log(`Police API returned ${crimes.length} crimes for ${monthsToFetch.join(", ")}`);

// --- Computed field detection (includes lookup/rollup variants) ---
function isComputedField(field) {
  const computed = new Set([
    "formula",
    "lookup",
    "rollup",
    "count",
    "createdTime",
    "lastModifiedTime",
    "autoNumber",
    "multipleLookupValues",
    "multipleRollupValues",
  ]);
  return computed.has(field.type);
}

function prepareValueForField(field, value) {
  if (value === null || value === undefined) return null;

  if (field.type === "singleSelect") return { name: String(value) };
  if (field.type === "multipleSelects") return [{ name: String(value) }];
  if (field.type === "multipleRecordLinks") return Array.isArray(value) ? value : [{ id: String(value) }];

  if (field.type === "number") {
    let n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (field.type === "date") {
    if (/^\d{4}-\d{2}$/.test(String(value))) return `${String(value)}-01`;
    return String(value);
  }

  // ✅ singleLineText etc.
  return value;
}

let crimesFields = {};
for (let f of crimesTbl.fields) crimesFields[f.name] = f;
let crimesMonthFieldName =
  (crimesFields["Month (YYYY-MM)"] && "Month (YYYY-MM)") ||
  (crimesFields["Month"] && "Month") ||
  null;
let crimesLinkField = crimesTbl.fields.find(
  field =>
    field.type === "multipleRecordLinks" &&
    field.options?.linkedTableId === requestsTbl.id
);
let requestsLinkField = requestsTbl.fields.find(
  field =>
    field.type === "multipleRecordLinks" &&
    field.options?.linkedTableId === crimesTbl.id
);

function getCrimeMonthValues(record) {
  if (!crimesMonthFieldName) return [];
  let field = crimesFields[crimesMonthFieldName];
  let cellValue = record.getCellValue(crimesMonthFieldName);

  if (field?.type === "multipleSelects") {
    return (cellValue || []).map(option => option?.name).filter(Boolean);
  }

  let value = record.getCellValueAsString(crimesMonthFieldName);
  return value ? [value] : [];
}

// --- Dedupe by (Month, Crime ID) ---
let existingFields = ["Crime ID"];
if (crimesMonthFieldName) existingFields.push(crimesMonthFieldName);
let existing = await crimesTbl.selectRecordsAsync({ fields: existingFields });
let existingPairs = new Set();
let existingCrimeIds = new Set();
let existingMap = new Map();
for (let r of existing.records) {
  let cid = r.getCellValueAsString("Crime ID");
  if (cid) existingCrimeIds.add(String(cid));
  let months = getCrimeMonthValues(r);
  if (cid && months.length) {
    for (let m of months) {
      let key = `${m}::${cid}`;
      existingPairs.add(key);
      if (!existingMap.has(key)) existingMap.set(key, []);
      existingMap.get(key).push(r.id);
    }
  }
}
console.log(
  `Crimes table records: ${existing.records.length}. Existing pairs: ${existingPairs.size}. Month field: ${crimesMonthFieldName || "none"}.`
);

// Never write formula helpers
const NEVER_WRITE_FIELDS = new Set(["Crime Key", "Year", "Resolved?", "Map Label", "Marker Group"]);

function putIfWritable(payloadFields, fieldName, rawValue) {
  if (NEVER_WRITE_FIELDS.has(fieldName)) return;

  let field = crimesFields[fieldName];
  if (!field) return;
  if (isComputedField(field)) return;

  // ✅ extra coercion for specific text fields
  if (field.type === "singleLineText" && rawValue != null) {
    rawValue = String(rawValue);
  }

  payloadFields[fieldName] = prepareValueForField(field, rawValue);
}

// --- Build create payloads ---
let toCreate = [];
let linkedExistingIds = [];

for (let c of crimes) {
  let crimeId = c.id ?? null;
  if (!crimeId) continue;

  let crimeIdText = String(crimeId);
  let monthToFetch = c.__month;
  let pairKey = `${monthToFetch}::${crimeIdText}`;
  if (existingCrimeIds.has(crimeIdText)) {
    continue;
  }
  if (existingPairs.has(pairKey)) {
    let existingIds = existingMap.get(pairKey) || [];
    linkedExistingIds.push(...existingIds);
    continue;
  }

  let fields = {};

  putIfWritable(fields, "Crime ID", crimeIdText);

  // ✅ now populated
  putIfWritable(fields, "Postcode", postcode ? String(postcode) : null);

  if (crimesMonthFieldName) {
    putIfWritable(fields, crimesMonthFieldName, monthToFetch);
  }
  putIfWritable(fields, "Category", c.category ?? null);

  putIfWritable(fields, "Persistent ID", c.persistent_id ?? null);
  putIfWritable(fields, "Context", c.context ?? null);
  putIfWritable(fields, "Location Type", c.location_type ?? null);

  putIfWritable(fields, "Latitude", c.location?.latitude ?? null);
  putIfWritable(fields, "Longitude", c.location?.longitude ?? null);

  // ✅ Street ID is text, force string
  putIfWritable(
    fields,
    "Street ID",
    c.location?.street?.id != null ? String(c.location.street.id) : null
  );

  putIfWritable(fields, "Street Name", c.location?.street?.name ?? null);

  putIfWritable(fields, "Location", c.location?.street?.name ? `${c.location.street.name}` : null);

  putIfWritable(fields, "Outcome Category", c.outcome_status?.category ?? "Unknown");
  putIfWritable(fields, "Outcome Date", c.outcome_status?.date ? `${c.outcome_status.date}-01` : null);

  putIfWritable(fields, "Raw Payload", JSON.stringify(c));

  // Link back to Search Requests
  if (crimesLinkField) {
    putIfWritable(fields, crimesLinkField.name, [{ id: recordId }]);
  } else if (crimesFields["Search Request"]) {
    putIfWritable(fields, "Search Request", [{ id: recordId }]);
  } else if (crimesFields["Search Requests"]) {
    putIfWritable(fields, "Search Requests", [{ id: recordId }]);
  }

  toCreate.push({ fields });
}
if (crimes.length > 0) {
  let sample = crimes[0];
  let sampleKey = `${sample.__month}::${sample.id}`;
  console.log(
    `Sample crime ${sampleKey} duplicate? ${existingPairs.has(sampleKey) ? "yes" : "no"}`
  );
}
console.log(`Prepared ${toCreate.length} new crimes to create.`);

// --- Create in batches ---
let createdRecordIds = [];
while (toCreate.length) {
  let batch = toCreate.slice(0, 50);
  let ids = await crimesTbl.createRecordsAsync(batch);
  createdRecordIds.push(...ids);
  toCreate = toCreate.slice(50);
}

// --- Backfill link on Search Requests if needed ---
let allLinkedIds = [...new Set([...createdRecordIds, ...linkedExistingIds])];
if (requestsLinkField && allLinkedIds.length > 0) {
  let existingLinks = req.getCellValue(requestsLinkField) || [];
  let existingIds = new Set(existingLinks.map(link => link.id));
  let newLinks = allLinkedIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ id }));
  if (newLinks.length > 0) {
    await requestsTbl.updateRecordAsync(recordId, {
      [requestsLinkField.name]: [...existingLinks, ...newLinks],
    });
  }
}

// --- Update only Status ---
await requestsTbl.updateRecordAsync(recordId, {
  "Status": { name: "Fetched" },
  ...(requestsTbl.fields.find(field => field.name === "Fetch crimes")
    ? { "Fetch crimes": false }
    : {}),
});

console.log(`Fetched ${crimes.length} crimes for ${monthsToFetch.join(", ")}`);