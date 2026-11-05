// =====================================================================
//  Geschäftslogik – 1:1 aus den Power-Fx-Formeln der Power App
//  (NewUser Screen, EditUserScreen, CreateGenericScreen, Opera-Screens)
// =====================================================================
import { CONFIG } from "./config.js";

// Proper(Position_Value.Text)
export const proper = s => String(s || "").toLowerCase().replace(/(^|[\s\-\/(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Vorname/Nachname: keine Umlaute, kein ß, keine Leerzeichen  ^[^ÜÄÖüäöß\s]*$
export const nameOk = s => !s || /^[^ÜÄÖüäöß\s]*$/.test(s);

export const emailOk = s => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s || "");

// Telefon = Left(Hotelnummer; Find("-"; Hotelnummer)) & Durchwahl
export function telefonMitDurchwahl(basis, durchwahl) {
  if (!durchwahl) return basis || "";
  const i = (basis || "").indexOf("-");
  return (i >= 0 ? basis.slice(0, i + 1) : "") + durchwahl;
}

// Prä-2000: Honestis HV → V + Nachname, sonst 2 Buchstaben Vorname + 4 Buchstaben Nachname
export const prae2000 = (hotelName, v, n) =>
  (v || n) ? (hotelName === "Honestis HV" ? v.slice(0, 1) + n : v.slice(0, 2) + n.slice(0, 4)) : "";

export const anmeldename = (v, n, hotel) => (v && n) ? `${v}.${n}${hotel.domain}` : "";
export const anzeigename = (v, n) => (v || n) ? `${n}, ${v}` : "";
export const istCloud = hotel => hotel.cloud === "Ja";

// Lizenzgruppe: GM → ME3, dann Hotel-Listen ME3/FE3, sonst OE3
export function lizenzgruppe(nr, shortKeys) {
  nr = (nr || "").trim().toUpperCase();
  if (!nr) return "";
  if (shortKeys.includes("GM")) return `SG-LIZ-${nr}-ME3`;
  if (CONFIG.licME3.includes(nr)) return `SG-LIZ-${nr}-ME3`;
  if (CONFIG.licFE3.includes(nr)) return `SG-LIZ-${nr}-FE3`;
  return `SG-LIZ-${nr}-OE3`;
}

// Filter(Department_Database; FilterShortKey in Abteilungzusatz_Dropdown.SelectedItems).ShortKey
export function shortKeysFuerAuswahl(departments, selected) {
  const rows = departments.filter(d => d.filterKeys.some(k => selected.includes(k)));
  const keys = rows.map(r => r.shortKey);
  return keys.length || departments.length ? [...new Set(keys)] : [...selected];
}

// NewUserScreen_Memberof: Rollen (Cloud: SG-ROL-…-Prod) + Lizenzgruppe
export function memberofNeu(hotel, departments, selected) {
  const nr = hotel.nr.toUpperCase();
  const keys = shortKeysFuerAuswahl(departments, selected);
  const rollen = istCloud(hotel) ? keys.map(k => `SG-ROL-${nr}-${k}-Prod`).join(",") : keys.join(",");
  return [rollen, lizenzgruppe(nr, keys)].filter(Boolean).join(",");
}

// EditUserScreen_Memberof: Cloud → nach Abteilung, sonst nach Zusatzabteilungen (ohne Lizenzgruppe, wie Power App)
export function memberofEdit(hotel, departments, abteilung, selected) {
  if (istCloud(hotel)) {
    const keys = [...new Set(departments.filter(d => d.abteilungen.includes(abteilung)).map(d => d.shortKey))];
    return keys.map(k => `SG-ROL-${hotel.nr}-${k}-Prod`).join(",");
  }
  return shortKeysFuerAuswahl(departments, selected).join(",");
}

// memberofgroup → ShortKeyCollection (G-…-XX → XX, VPN-Gruppen → VPN)
export function shortKeysAusGruppen(groups) {
  const out = new Set();
  groups.filter(g => g.startsWith("G-") || g.includes("VPN")).forEach(g => out.add(g.includes("VPN") ? "VPN" : g.slice(-2)));
  return [...out];
}

export const istFunktionspostfach = u =>
  CONFIG.excludeNames.some(x => `${u.givenName || ""} ${u.surname || ""}`.toLowerCase().includes(x.toLowerCase()));

export const heute = () => {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10);
};

// Datum aus <input type=date> (lokal 00:00) → ISO für Dataverse
export const dateToIso = d => d ? new Date(`${d}T00:00:00`).toISOString() : null;
export const dateTimeToIso = (d, t) => d ? new Date(`${d}T${t || "00:00"}:00`).toISOString() : null;
export const isoToDate = iso => {
  if (!iso) return "";
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10);
};

// Abteilungs-Liste wie Power App: ohne „All“, HV-Abteilungen ans Ende
export const sortAbteilungen = list => list.filter(a => !/All/.test(a))
  .sort((a, b) => (a.startsWith("HV") - b.startsWith("HV")) || a.localeCompare(b, "de"));
