// =====================================================================
//  Datenzugriff: Microsoft Graph + Dataverse Web API
//  Ersetzt die Power-Apps-Konnektoren Office365-Benutzer, AzureAD,
//  Dataverse und den Flow „Zusatztools_abrufen“.
// =====================================================================
import { CONFIG } from "./config.js";
import { getToken } from "./auth.js";
import { DEMO_HOTELS, DEMO_OPTIONS, DEMO_USERS, DEMO_OPERA } from "./demo.js";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DV = () => `${CONFIG.dataverseUrl}/api/data/${CONFIG.dataverseApi}`;
const q = s => String(s ?? "").replace(/'/g, "''");          // OData-String escapen
const E = encodeURIComponent;                                // Werte in der URL kodieren (&, #, + in Hotelnamen)
const wait = ms => new Promise(r => setTimeout(r, ms));

class ApiError extends Error {}

async function readError(res) {
  let msg = `${res.status} ${res.statusText}`;
  try { const j = await res.json(); msg = j.error?.message || msg; } catch {}
  if (res.status === 401 || res.status === 403) msg = `Keine Berechtigung (${res.status}): ${msg}`;
  return new ApiError(msg);
}

// ---------- Graph ----------
async function graph(path, { method = "GET", body, advanced = false } = {}) {
  const token = await getToken(CONFIG.graphScopes);
  const headers = { Authorization: `Bearer ${token}` };
  if (advanced) headers.ConsistencyLevel = "eventual";
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(path.startsWith("http") ? path : GRAPH + path, { method, headers, body: body && JSON.stringify(body) });
  if (!res.ok) throw await readError(res);
  return res.status === 204 ? null : res.json();
}
async function graphAll(path, opts) {
  let out = [], next = path;
  while (next) { const r = await graph(next, opts); out = out.concat(r.value || []); next = r["@odata.nextLink"]; }
  return out;
}

// ---------- Dataverse ----------
async function dv(path, { method = "GET", body } = {}) {
  const token = await getToken(CONFIG.dataverseScopes);
  const headers = {
    Authorization: `Bearer ${token}`, Accept: "application/json",
    "OData-MaxVersion": "4.0", "OData-Version": "4.0",
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
  };
  if (body) { headers["Content-Type"] = "application/json; charset=utf-8"; headers.Prefer += ",return=representation"; }
  const res = await fetch(`${DV()}/${path}`, { method, headers, body: body && JSON.stringify(body) });
  if (!res.ok) throw await readError(res);
  return res.status === 204 ? null : res.json();
}
async function dvAll(path) {
  let out = [], r = await dv(path);
  out = out.concat(r.value);
  while (r["@odata.nextLink"]) {
    const token = await getToken(CONFIG.dataverseScopes);
    const res = await fetch(r["@odata.nextLink"], { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!res.ok) throw await readError(res);
    r = await res.json(); out = out.concat(r.value);
  }
  return out;
}

// =====================================================================
//  Öffentliche Funktionen
// =====================================================================
export async function me() {
  if (CONFIG.demo) return { displayName: "Demo Benutzer", mail: "demo.benutzer@honestis.ag", userPrincipalName: "demo.benutzer@honestis.ag" };
  return graph("/me?$select=displayName,mail,userPrincipalName");
}

// Prüft, ob der angemeldete Benutzer Mitglied der Admin-Gruppe ist
export async function isInGroup(groupName) {
  if (!groupName) return false;
  if (CONFIG.demo) return false;
  const r = await graph(`/me/transitiveMemberOf/microsoft.graph.group?$filter=${E(`displayName eq '${q(groupName)}'`)}&$count=true&$select=id`, { advanced: true });
  return (r.value || []).length > 0;
}

const HOTEL_COLS = ["cra69_hotelstammdaten_databaseid", "cra69_hotelname_string", "cra69_dorinthnr", "cra69_telephone", "cra69_domain",
  "cra69_dc", "cra69_cloud", "cra69_street", "cra69_zip", "cra69_city", "cra69_state", "cra69_country", "cra69_company",
  "cra69_domainadmin", "cra69_outarget", "cra69_netbiosname"];

function mapHotel(r) {
  const raw = r.cra69_hotelname_string || "";
  return {
    id: r.cra69_hotelstammdaten_databaseid, raw, name: raw.trim(),
    nr: (r.cra69_dorinthnr || "").trim(), tel: (r.cra69_telephone || "").trim(), domain: (r.cra69_domain || "").trim(),
    dc: r.cra69_dc || "", cloud: (r.cra69_cloud || "").trim(), street: r.cra69_street || "", zip: r.cra69_zip || "",
    city: r.cra69_city || "", region: r.cra69_state || "", country: r.cra69_country || "", company: r.cra69_company || "",
    domainadmin: r.cra69_domainadmin || "", ou: r.cra69_outarget || "", netbios: r.cra69_netbiosname || ""
  };
}

export async function loadHotels() {
  const rows = CONFIG.demo ? DEMO_HOTELS
    : await dvAll(`${CONFIG.tables.hotels}?$select=${HOTEL_COLS.join(",")}&$filter=statecode eq 0`);
  return rows.map(mapHotel).filter(h => h.name).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// Liefert [{value, label}] einer globalen Auswahlliste
export async function loadOptionSet(name) {
  if (CONFIG.demo) return DEMO_OPTIONS[name].map((label, i) => ({ value: 959860000 + i, label }));
  const r = await dv(`GlobalOptionSetDefinitions(Name='${q(name)}')`);
  return (r.Options || []).map(o => ({ value: o.Value, label: o.Label?.UserLocalizedLabel?.Label ?? String(o.Value) }));
}

// Department_Database: ShortKey + Mehrfachauswahl FilterShortKey/Abteilung
export async function loadDepartments(shortkeyOpts, abteilungOpts) {
  if (CONFIG.demo) return DEMO_OPTIONS.cra69_shortkey.map(k => ({ shortKey: k, filterKeys: [k], abteilungen: [] }));
  const rows = await dvAll(`${CONFIG.tables.departments}?$select=cra69_name,cra69_shortkey,cra69_filtershortkey,cra69_abteilung&$filter=statecode eq 0`);
  const lbl = (opts, csv) => String(csv || "").split(",").filter(Boolean).map(v => opts.find(o => String(o.value) === v.trim())?.label).filter(Boolean);
  return rows.map(r => ({ shortKey: (r.cra69_shortkey || "").trim(), filterKeys: lbl(shortkeyOpts, r.cra69_filtershortkey), abteilungen: lbl(abteilungOpts, r.cra69_abteilung) }))
             .filter(r => r.shortKey);
}

// Alle aktiven Benutzer mit Bürostandort (officeLocation) = Hotel
// (ersetzt Office365-Benutzer.SearchUser; gefiltert wird danach lokal)
export async function listUsersAtHotel(hotel) {
  if (CONFIG.demo) { await wait(200); return DEMO_USERS.filter(u => u.officeLocation.trim() === hotel.name); }
  const loc = [...new Set([hotel.name, hotel.raw])].map(n => `officeLocation eq '${q(n)}'`).join(" or ");
  const path = `/users?$filter=${E(`(${loc}) and accountEnabled eq true`)}&$count=true&$top=999&$orderby=displayName` +
               `&$select=id,givenName,surname,displayName,jobTitle,department,userPrincipalName,mail,officeLocation`;
  return graphAll(path, { advanced: true });
}

// Details für „Benutzer bearbeiten“ inkl. Gruppen und Zusatztools
export async function getUserDetail(upn) {
  if (CONFIG.demo) {
    const u = DEMO_USERS.find(x => x.userPrincipalName === upn);
    await wait(250);
    return { ...u, tools: tools(u.ext, {}) };
  }
  const ext = [1, 2, 3, 4].map(i => CONFIG.extPrefix + i).join(",");
  const u = await graph(`/users/${encodeURIComponent(upn)}?$select=id,givenName,surname,displayName,jobTitle,department,mobilePhone,businessPhones,officeLocation,userPrincipalName,onPremisesExtensionAttributes,${ext}`);
  const groups = await graphAll(`/users/${u.id}/transitiveMemberOf/microsoft.graph.group?$select=displayName&$top=999`);
  const cloud = {}; [1, 2, 3, 4].forEach(i => cloud[i] = u[CONFIG.extPrefix + i]);
  return { ...u, groups: groups.map(g => g.displayName).filter(Boolean), tools: tools(cloud, u.onPremisesExtensionAttributes || {}) };
}

// Ersatz für Flow „Zusatztools_abrufen“: Cloud-Attribut, sonst On-Prem-Attribut
function tools(cloud, onprem) {
  const v = i => (cloud[i] ? cloud[i] : onprem[`extensionAttribute${i}`]) || "";
  return { jedox: v(1) === "Jedox", nhsales: v(2) === "NHSales", onventis: v(3) === "Onventis", datev: v(4) === "Datev" };
}

// Prüft, ob eine Adresse schon als Benutzer, Gruppe oder Alias existiert
export async function mailExists(mail) {
  if (CONFIG.demo) { await wait(300); return ["info.dor030@dorint.com", "empfang.dor030@dorint.com"].includes(mail) || DEMO_USERS.some(u => u.userPrincipalName === mail); }
  const m = q(mail);
  const f = `mail eq '${m}' or proxyAddresses/any(p:p eq 'smtp:${m}')`;
  const [u, g] = await Promise.all([
    graph(`/users?$filter=${E(`${f} or userPrincipalName eq '${m}'`)}&$count=true&$select=id`, { advanced: true }),
    graph(`/groups?$filter=${E(f)}&$count=true&$select=id`, { advanced: true })
  ]);
  return (u.value?.length || 0) + (g.value?.length || 0) > 0;
}

export async function upnExists(upn) {
  if (!upn) return false;
  if (CONFIG.demo) return DEMO_USERS.some(u => u.userPrincipalName.toLowerCase() === upn.toLowerCase());
  const r = await graph(`/users?$filter=${E(`userPrincipalName eq '${q(upn)}'`)}&$select=id`);
  return (r.value || []).length > 0;
}

// ---------- Schreiben in Dataverse (löst die bestehenden Flows aus) ----------
export async function createAntrag(payload) {
  if (CONFIG.demo) { await wait(500); console.info("[Demo] POST", CONFIG.tables.antraege, payload); return { cra69_userantragid: "demo" }; }
  return dv(CONFIG.tables.antraege, { method: "POST", body: payload });
}
export async function createEdit(payload) {
  if (CONFIG.demo) { await wait(500); console.info("[Demo] POST", CONFIG.tables.edits, payload); return { cra69_userantrageditid: "demo" }; }
  return dv(CONFIG.tables.edits, { method: "POST", body: payload });
}
export async function updateAntrag(id, payload) {
  if (CONFIG.demo) { await wait(400); const i = DEMO_OPERA.findIndex(r => r.cra69_userantragid === id); Object.assign(DEMO_OPERA[i], payload); return null; }
  return dv(`${CONFIG.tables.antraege}(${id})`, { method: "PATCH", body: payload });
}
export async function listOpera(hotel) {
  if (CONFIG.demo) return DEMO_OPERA.filter(r => r.cra69_hotel.trim() === hotel.name);
  const loc = [...new Set([hotel.name, hotel.raw])].map(n => `cra69_hotel eq '${q(n)}'`).join(" or ");
  return dvAll(`${CONFIG.tables.antraege}?$select=cra69_userantragid,cra69_vorname,cra69_nachname,cra69_anzeigename,cra69_telefon,cra69_mobil,cra69_abteilung,cra69_position,cra69_eintrittsdatum,cra69_bemerkung,cra69_hotel` +
               `&$filter=${E(`(${loc}) and cra69_nurfuropera eq true`)}&$orderby=cra69_nachname`);
}
