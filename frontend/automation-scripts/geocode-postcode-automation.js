// Automation Script: Geocode postcode via Postcodes.io
let { recordId } = input.config();

let requests = base.getTable("Search Requests");
let record = await requests.selectRecordAsync(recordId);
if (!record) throw new Error("Record not found");

let postcode = (record.getCellValueAsString("Postcode") || "").trim();
if (!postcode) throw new Error("Missing postcode");

let url = `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`;
let res = await fetch(url);
let data = await res.json();

if (!res.ok || data.status !== 200 || !data.result) {
  await requests.updateRecordAsync(recordId, { "Status": { name: "Error" } });
  throw new Error(`Postcodes.io lookup failed: ${JSON.stringify(data)}`);
}

await requests.updateRecordAsync(recordId, {
  "Latitude": data.result.latitude,
  "Longitude": data.result.longitude,
  "Status": { name: "Geocoded" },
});