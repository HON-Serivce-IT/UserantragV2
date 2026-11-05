// =====================================================================
//  UserantragV2 – Oberfläche (ersetzt die Power-App-Screens)
// =====================================================================
import { CONFIG } from "./config.js";
import { initAuth, login, logout } from "./auth.js";
import * as api from "./api.js";
import * as L from "./logic.js";

const S = { me: null, hotels: [], hotel: null, opts: { verteiler: [], abteilung: [], shortkey: [] }, departments: [], view: "start" };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const myMail = () => (S.me?.mail || S.me?.userPrincipalName || "").toLowerCase();

function toast(text, kind = "") {
  const d = document.createElement("div"); d.className = `toast ${kind}`; d.setAttribute("role", "status"); d.textContent = text;
  document.body.appendChild(d); setTimeout(() => d.remove(), 4500);
}

// =====================================================================
//  Start
// =====================================================================
async function boot() {
  const v = $("#view");
  try {
    const account = await initAuth();
    if (!account) return viewLogin(v);
    $("#who").hidden = false;
    v.innerHTML = `<div class="loading">Daten werden geladen …</div>`;
    const [me, hotels, verteiler, abteilung, shortkey] = await Promise.all([
      api.me(), api.loadHotels(),
      api.loadOptionSet(CONFIG.optionSets.verteiler), api.loadOptionSet(CONFIG.optionSets.abteilung), api.loadOptionSet(CONFIG.optionSets.shortkey)
    ]);
    S.me = me; S.hotels = hotels;
    S.opts = { verteiler: verteiler.map(o => o.label).sort((a, b) => a.localeCompare(b, "de")),
               abteilung: abteilung.map(o => o.label), shortkey: shortkey.map(o => o.label).sort() };
    S.departments = await api.loadDepartments(shortkey, abteilung);
    $("#whoName").textContent = me.displayName || me.userPrincipalName;
    $("#avatar").textContent = (me.displayName || "?").split(/[\s,]+/).filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase();
    if (CONFIG.demo) $("#demoPill").hidden = false;
    $("#logout").onclick = () => logout();
    initHotelSelect(); resetForms(); render();
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="panel"><div class="sec"><h2>Die App konnte nicht geladen werden</h2>
      <p>${esc(e.message)}</p>
      <p class="sub">Häufige Ursache: Für die App-Registrierung fehlt die Administratorzustimmung für Microsoft Graph oder Dynamics CRM. Wenden Sie sich an ${esc(CONFIG.supportMail)}.</p>
      <button class="btn" id="retry">Erneut versuchen</button></div></div>`;
    $("#retry").onclick = () => location.reload();
  }
}

function viewLogin(v) {
  document.querySelectorAll(".navbtn").forEach(b => b.disabled = true);
  v.innerHTML = `<div class="login panel"><div class="sec">
    <h1>IT Benutzerverwaltung</h1>
    <p class="sub">Melden Sie sich mit Ihrem Dorint- oder Honestis-Konto an, um Benutzer zu beantragen oder zu ändern.</p>
    <button class="btn" id="loginBtn">Mit Microsoft anmelden</button></div></div>`;
  $("#loginBtn").onclick = () => login();
}

// =====================================================================
//  Navigation
// =====================================================================
function initHotelSelect() {
  const sel = $("#hotelSel");
  sel.innerHTML = `<option value="">Hotel auswählen …</option>` + S.hotels.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join("");
  sel.onchange = () => setHotel(sel.value);
}
function setHotel(id) {
  S.hotel = S.hotels.find(h => h.id === id) || null;
  $("#hotelSel").value = id || "";
  resetForms();
  if (!S.hotel) S.view = "start";
  render();
}
function resetForms() {
  S.neu = { vorname: "", nachname: "", durchwahl: "", mobil: "0", abteilung: "", zusatz: ["AL"], position: "", datev: false, jedox: false,
            nhsales: false, onventis: false, opera: false, hw: false, bemerkung: "", verteiler: [], eintritt: "", drucker: "", teamviewer: "", upnTaken: false };
  S.edit = null; S.users = null; S.search = "";
  S.gen = { mail: "", checked: null, freigabe: [], search: "", hits: [] };
  S.opNeu = { vorname: "", nachname: "", telefon: "", mobil: "", abteilung: "", position: "", eintritt: "", bemerkung: "" };
  S.opEdit = null; S.operaList = null;
}
function go(view) { S.view = view; render(); window.scrollTo(0, 0); }
document.querySelectorAll(".navbtn").forEach(b => b.onclick = () => {
  if (b.dataset.view === "neu" || b.dataset.view === "generisch" || b.dataset.view === "operaNeu") resetForms();
  go(b.dataset.view);
});

function render() {
  document.querySelectorAll(".navbtn").forEach(b => {
    b.disabled = b.hasAttribute("data-needs-hotel") && !S.hotel;
    const cur = b.dataset.view === S.view || (S.view === "editForm" && b.dataset.view === "verwaltung");
    cur ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
  });
  const views = { start: viewStart, neu: viewNeu, verwaltung: viewVerwaltung, editForm: viewEdit, generisch: viewGen,
                  operaNeu: viewOpNeu, operaEdit: viewOpEdit, success: viewSuccess };
  views[S.view]($("#view"));
}

// =====================================================================
//  Formular-Bausteine
// =====================================================================
const fText = (id, label, val, { req, hint, ph, ro, err, warn, type = "text", full } = {}) =>
  `<div class="field ${full ? "full" : ""}"><label for="${id}">${label}${req ? ' <span class="req">*</span>' : ""}</label>
   <input id="${id}" type="${type}" value="${esc(val)}" ${ph ? `placeholder="${esc(ph)}"` : ""} ${ro ? "readonly" : ""} class="${err ? "bad" : ""}" autocomplete="off">
   ${err ? `<span class="error">${err}</span>` : warn ? `<span class="warnline">${warn}</span>` : hint ? `<small>${hint}</small>` : ""}</div>`;
const fSelect = (id, label, val, opts, { req, full } = {}) =>
  `<div class="field ${full ? "full" : ""}"><label for="${id}">${label}${req ? ' <span class="req">*</span>' : ""}</label>
   <select id="${id}"><option value="">Bitte auswählen</option>${opts.map(o => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
const fChips = (id, label, opts, sel, { hint, mono = true } = {}) =>
  `<div class="field full"><span class="flabel">${label}</span><div class="chips" id="${id}">${opts.map(o =>
   `<button type="button" class="chip ${mono ? "mono" : ""}" aria-pressed="${sel.includes(o)}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
   ${hint ? `<small>${hint}</small>` : ""}</div>`;
const fTog = (id, label, on) => `<label class="tog" for="${id}">${label}<input type="checkbox" id="${id}" ${on ? "checked" : ""}></label>`;

function bind(obj, map, after) {
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id); if (!el) return;
    const ev = (el.type === "checkbox" || el.tagName === "SELECT" || el.type === "date") ? "change" : "input";
    el.addEventListener(ev, () => { obj[key] = el.type === "checkbox" ? el.checked : el.value; after && after(id); });
  });
}
function bindChips(id, arr, after) {
  document.querySelectorAll(`#${id} .chip`).forEach(c => c.onclick = () => {
    const v = c.dataset.v, i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); after && after();
  });
}
function keepFocus(fn) {
  const a = document.activeElement, id = a && a.id; let pos = null;
  try { pos = a.selectionStart; } catch {}
  fn();
  if (id) { const n = document.getElementById(id); if (n) { n.focus(); try { if (pos != null) n.setSelectionRange(pos, pos); } catch {} } }
}

function techPanel(computed, method, entity, payload) {
  return `<aside class="tech panel">
    <div class="sec"><h2>Automatisch berechnet</h2><dl class="kv">${Object.entries(computed).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v) || "–"}</dd>`).join("")}</dl></div>
    <details class="sec"><summary>Daten an Dataverse</summary>
      <div class="endpoint"><b>${method}</b>${esc(entity)}</div><pre class="code">${esc(JSON.stringify(payload, null, 2))}</pre></details>
  </aside>`;
}

// =====================================================================
//  Start (Menu Screen)
// =====================================================================
const ICONS = {
  neu: '<circle cx="10" cy="8" r="4"/><path d="M2 21c0-4 3.5-7 8-7s8 3 8 7M19 8v6M16 11h6"/>',
  verwaltung: '<circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 3.5-7 8-7M15 15l6-6 2 2-6 6h-2z"/>',
  generisch: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  operaNeu: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 9v6M9 12h6"/>',
  operaEdit: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 15l1-3 6-6 2 2-6 6z"/>'
};
const tile = (view, title, text) => `<button class="tile" data-go="${view}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICONS[view]}</svg><b>${title}</b><span>${text}</span></button>`;

function viewStart(v) {
  const h = S.hotel;
  v.innerHTML = `<h1>Herzlich willkommen</h1>
  <p class="sub">Tool zur Benutzerverwaltung für die DHI-Gruppe.</p>
  <div class="welcome">
    <div class="panel"><div class="sec">
      <label class="lbl" for="hotelSel2">Zum Starten Hotel auswählen</label>
      <select id="hotelSel2"><option value="">Hotel auswählen …</option>${S.hotels.map(x => `<option value="${esc(x.id)}" ${h && x.id === h.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      ${h ? `<dl class="kv" style="margin-top:24px"><dt>DorInt-Nr</dt><dd>${esc(h.nr) || "–"}</dd><dt>Telefon</dt><dd>${esc(h.tel) || "–"}</dd><dt>Cloud</dt><dd>${istCloudTxt(h)}</dd><dt>Domain</dt><dd>${esc(h.domain) || "–"}</dd></dl>` : ""}
    </div></div>
    <div class="panel support"><div class="sec">
      <span class="lbl">Hilfe & Anregungen</span>
      <span>Das Handbuch finden Sie <a href="${CONFIG.handbuchUrl}" target="_blank" rel="noopener">hier</a>.</span>
      <span>E-Mail: <code>${CONFIG.supportMail}</code></span>
      <span>Telefon: <code>${CONFIG.supportPhone}</code></span>
    </div></div>
  </div>
  ${h ? `<div class="tiles">
    ${tile("neu", "Neuen Benutzer anmelden", "Antrag für neue Mitarbeitende mit Zugängen und Verteilern")}
    ${tile("verwaltung", "Benutzer bearbeiten / abmelden", "Daten ändern, Austritt oder letzten Arbeitstag melden")}
    ${tile("generisch", "Generisches Postfach erstellen", "Postfach ohne Lizenz, Zugriff für bestehende Benutzer")}
    ${tile("operaNeu", "Opera-Benutzer erstellen", "Nur Opera PMS, ohne M365-Konto")}
    ${tile("operaEdit", "Opera-Benutzer bearbeiten", "Bestehenden Opera-Antrag ändern")}
  </div>` : `<div class="note info">Wählen Sie ein Hotel aus. Danach erscheinen die Aktionen für diesen Standort.</div>`}`;
  $("#hotelSel2").onchange = e => setHotel(e.target.value);
  v.querySelectorAll(".tile").forEach(t => t.onclick = () => { resetForms(); go(t.dataset.go); });
}
const istCloudTxt = h => L.istCloud(h) ? "Ja (Entra ID)" : "Nein (On-Prem / PAD)";

// =====================================================================
//  Neuer Benutzer (NewUser Screen → cra69_userantrags)
// =====================================================================
function neuCalc() {
  const h = S.hotel, n = S.neu;
  const tel = L.telefonMitDurchwahl(h.tel, n.durchwahl);
  const memberof = L.memberofNeu(h, S.departments, n.zusatz);
  const upn = L.anmeldename(n.vorname, n.nachname, h);
  const payload = {
    cra69_hotel: h.raw, cra69_vorname: n.vorname, cra69_nachname: n.nachname, cra69_anzeigename: L.anzeigename(n.vorname, n.nachname),
    cra69_benutzeranmeldename: upn, cra69_pra2000: L.prae2000(h.name, n.vorname, n.nachname),
    cra69_durchwahl: n.durchwahl, cra69_telefon: tel, cra69_mobil: n.mobil, cra69_abteilung: n.abteilung,
    cra69_position: L.proper(n.position), cra69_beschreibung: n.position, cra69_memberof: memberof,
    cra69_datev: n.datev, cra69_jedox: n.jedox, cra69_nhsales: n.nhsales, cra69_onventis: n.onventis, cra69_opera_pms: n.opera,
    cra69_hardwarebestellung: n.hw, cra69_bemerkung: n.bemerkung, cra69_verteilerliste: n.verteiler.join(","),
    cra69_eintrittsdatum: L.dateToIso(n.eintritt), cra69_drucker: n.drucker || `P-${h.nr}-`, cra69_teamviewerid: n.teamviewer,
    cra69_apprunner: myMail(), cra69_dorintnr: h.nr, cra69_activedomain: h.dc, cra69_cloud: h.cloud,
    cra69_street: h.street, cra69_zip: h.zip, cra69_city: h.city, cra69_state: h.region, cra69_country: h.country,
    cra69_company: h.company, cra69_domainadmin: h.domainadmin, cra69_outarget: h.ou, cra69_netbiosname: h.netbios
  };
  const errs = { vorname: !L.nameOk(n.vorname), nachname: !L.nameOk(n.nachname), eintritt: n.eintritt && n.eintritt < L.heute() };
  const valid = n.vorname && n.nachname && n.abteilung && n.position.trim() && n.eintritt && !errs.vorname && !errs.nachname && !errs.eintritt && (!n.hw || n.bemerkung.trim());
  return { tel, memberof, upn, payload, errs, valid };
}
const checkUpn = debounce(async () => {
  const n = S.neu, upn = L.anmeldename(n.vorname, n.nachname, S.hotel);
  try { n.upnTaken = await api.upnExists(upn); } catch { n.upnTaken = false; }
  if (S.view === "neu") keepFocus(() => viewNeu($("#view")));
}, 600);

function viewNeu(v) {
  const h = S.hotel, n = S.neu, c = neuCalc();
  v.innerHTML = `<h1>Neuen Benutzer anmelden</h1><p class="sub">${esc(h.name)} · ${esc(h.nr)}</p>
  <div class="split"><div class="panel">
    <div class="sec"><h2>Persönliche Daten</h2><div class="grid">
      ${fText("n_vorname", "Vorname", n.vorname, { req: 1, err: c.errs.vorname && "Umlaute, ß und Leerzeichen sind nicht erlaubt", hint: "Ohne Umlaute, z. B. Mueller statt Müller" })}
      ${fText("n_nachname", "Nachname", n.nachname, { req: 1, err: c.errs.nachname && "Umlaute, ß und Leerzeichen sind nicht erlaubt" })}
      ${fText("n_position", "Position", n.position, { req: 1, hint: "Wird automatisch großgeschrieben" })}
      ${fSelect("n_abteilung", "Abteilung", n.abteilung, L.sortAbteilungen(S.opts.abteilung), { req: 1 })}
      ${fText("n_eintritt", "Eintritt / Beginn", n.eintritt, { req: 1, type: "date", err: c.errs.eintritt && "Datum darf nicht in der Vergangenheit liegen", hint: "Ab welchem Tag wird der Benutzer benötigt?" })}
    </div>${n.upnTaken ? `<div class="note" style="margin-top:24px">Der Anmeldename <code>${esc(c.upn)}</code> existiert bereits. ${L.istCloud(h) ? "Das Anlegen in Entra ID würde fehlschlagen. Bitte Rücksprache mit der IT halten." : "Die IT vergibt dann automatisch einen abweichenden Namen."}</div>` : ""}</div>
    <div class="sec"><h2>Kontakt & Telefonie</h2><div class="grid">
      ${fText("n_durchwahl", "Durchwahl", n.durchwahl, { hint: "Wie lautet die Telefondurchwahl?" })}
      ${fText("n_tel", "Telefon", c.tel, { ro: 1, hint: "Aus Hotelnummer und Durchwahl" })}
      ${fText("n_mobil", "Mobil", n.mobil, { hint: "Wie lautet die Mobilnummer des Benutzers?" })}
      ${fText("n_teamviewer", "Teamviewer-ID", n.teamviewer, { hint: "ID des Rechners, an dem der Benutzer arbeitet" })}
      ${fText("n_drucker", "Drucker", n.drucker, { ph: `P-${h.nr}-AC01`, hint: "z. B. P-DOR/HOM(Hausnummer)-AC01" })}
    </div></div>
    <div class="sec"><h2>Software & Zugänge</h2>
      <div class="toggles">${fTog("n_datev", "DATEV", n.datev)}${fTog("n_jedox", "Jedox", n.jedox)}${fTog("n_nhsales", "NH-Sales", n.nhsales)}${fTog("n_onventis", "Onventis", n.onventis)}${fTog("n_opera", "Opera PMS", n.opera)}${fTog("n_hw", "Hardware bestellen", n.hw)}</div>
      <div class="grid" style="margin-top:24px">${fChips("n_zusatz", "Berechtigungen (Zusatzabteilungen)", S.opts.shortkey, n.zusatz, { hint: "Bestimmt die Rollengruppen und bei GM die Lizenz ME3" })}</div>
    </div>
    <div class="sec"><h2>Verteilerlisten & Sonstiges</h2><div class="grid">
      ${fChips("n_verteiler", "Verteilerlisten", S.opts.verteiler, n.verteiler, { mono: false, hint: "In welche Verteiler soll der Benutzer aufgenommen werden?" })}
      <div class="field full"><label for="n_bemerkung">Bemerkung${n.hw ? ' <span class="req">*</span>' : ""}</label><textarea id="n_bemerkung">${esc(n.bemerkung)}</textarea>${n.hw ? "<small>Pflicht bei Hardwarebestellung: Was wird benötigt?</small>" : ""}</div>
    </div></div>
    <div class="actions"><button class="btn ghost" id="n_back">Abbrechen</button><button class="btn" id="n_next" ${c.valid ? "" : "disabled"}>Weiter</button></div>
  </div>
  ${techPanel({ "Anzeigename": c.payload.cra69_anzeigename, "Anmeldename": c.upn, "Prä-2000": c.payload.cra69_pra2000, "Memberof": c.memberof, "Weg": istCloudTxt(h) }, "POST", CONFIG.tables.antraege, c.payload)}
  </div>`;
  const upd = id => { if (id === "n_vorname" || id === "n_nachname") checkUpn(); keepFocus(() => viewNeu(v)); };
  bind(n, { n_vorname: "vorname", n_nachname: "nachname", n_position: "position", n_abteilung: "abteilung", n_eintritt: "eintritt", n_durchwahl: "durchwahl",
            n_mobil: "mobil", n_teamviewer: "teamviewer", n_drucker: "drucker", n_datev: "datev", n_jedox: "jedox", n_nhsales: "nhsales", n_onventis: "onventis",
            n_opera: "opera", n_hw: "hw", n_bemerkung: "bemerkung" }, upd);
  bindChips("n_zusatz", n.zusatz, upd); bindChips("n_verteiler", n.verteiler, upd);
  $("#n_back").onclick = () => { resetForms(); go("start"); };
  $("#n_next").onclick = () => confirmSend("Neuer Benutzer", `${n.vorname} ${n.nachname}`, () => api.createAntrag(neuCalc().payload), "user");
}

// =====================================================================
//  Benutzerverwaltung (Overview Screen)
// =====================================================================
const loadUsers = debounce(async () => {
  const term = S.search;
  try {
    const list = await api.searchUsers(S.hotel, term);
    if (term !== S.search) return;
    S.users = list.filter(u => !L.istFunktionspostfach(u)); S.usersErr = null;
  } catch (e) { S.users = []; S.usersErr = e.message; }
  if (S.view === "verwaltung") keepFocus(() => viewVerwaltung($("#view")));
}, 350);

function viewVerwaltung(v) {
  const h = S.hotel;
  if (S.users === null) { S.users = undefined; loadUsers(); }
  const list = S.users;
  v.innerHTML = `<h1>Benutzer bearbeiten oder abmelden</h1>
  <p class="sub">Aktive Konten am Standort ${esc(h.name)}. Funktionspostfächer (Empfang, Info, Bankett …) sind ausgeblendet.</p>
  <div class="panel"><div class="sec"><label class="lbl" for="u_search">Mitarbeitende suchen</label><input type="search" id="u_search" placeholder="Name oder E-Mail" value="${esc(S.search)}"></div>
  <div class="users">${list === undefined ? `<div class="empty">Benutzer werden geladen …</div>`
    : S.usersErr ? `<div class="empty err">${esc(S.usersErr)}</div>`
    : list.length ? list.map(u => `<button class="urow" data-upn="${esc(u.userPrincipalName)}"><div class="uav">${esc((u.givenName || "?")[0])}${esc((u.surname || "")[0] || "")}</div>
        <div><b>${esc(u.givenName)} ${esc(u.surname)}</b><div class="meta">${esc(u.jobTitle || "–")} · ${esc(u.department || "–")}</div></div><span class="badge">${esc(u.userPrincipalName)}</span></button>`).join("")
    : `<div class="empty">Keine Treffer an diesem Standort.</div>`}</div></div>`;
  const s = $("#u_search");
  s.oninput = () => { S.search = s.value; S.users = undefined; loadUsers(); keepFocus(() => viewVerwaltung(v)); };
  v.querySelectorAll(".urow").forEach(r => r.onclick = () => openEdit(r.dataset.upn));
}

async function openEdit(upn) {
  const v = $("#view");
  v.innerHTML = `<div class="loading">Benutzerdaten, Gruppen und Zusatztools werden geladen …</div>`;
  try {
    const u = await api.getUserDetail(upn);
    const dept = u.department || "";
    const abt = S.opts.abteilung.filter(a => a !== "All" && dept.includes(a)).sort((a, b) => b.length - a.length)[0] || "";
    S.edit = { u, vorname: u.givenName || "", nachname: u.surname || "", durchwahl: "", mobil: u.mobilePhone || "", position: u.jobTitle || "",
      abteilung: abt, zusatz: L.shortKeysAusGruppen(u.groups).filter(k => S.opts.shortkey.includes(k)),
      verteiler: u.groups.filter(g => S.opts.verteiler.includes(g)), ...u.tools,
      austritt: "", letzterTag: "", letzteZeit: "20:00", vertreter: "", baseTel: (u.businessPhones || [])[0] || S.hotel.tel };
    go("editForm");
  } catch (e) { toast(`Benutzer konnte nicht geladen werden: ${e.message}`, "err"); go("verwaltung"); }
}

// =====================================================================
//  Benutzer bearbeiten (EditUserScreen → cra69_userantragedits)
// =====================================================================
function editCalc() {
  const h = S.hotel, e = S.edit, u = e.u, it = u.department === "IT-Abteilung";
  const tel = L.telefonMitDurchwahl(e.baseTel, e.durchwahl);
  const abmeldung = e.austritt || e.letzterTag;
  const vertErr = abmeldung ? (!L.emailOk(e.vertreter) ? "Gültige E-Mail-Adresse der Vertretung erforderlich"
    : e.vertreter.toLowerCase() === myMail() ? "Bitte nicht die eigene Adresse eintragen, sondern die der Vertretung" : "") : "";
  const payload = {
    cra69_hotel: u.officeLocation || h.raw, cra69_benutzername_aktuell: u.userPrincipalName, cra69_vorname: e.vorname, cra69_nachname: e.nachname,
    cra69_anzeigename: L.anzeigename(e.vorname, e.nachname), cra69_benutzeranmeldename: L.anmeldename(e.vorname, e.nachname, h),
    cra69_prae2000: L.prae2000(h.name, e.vorname, e.nachname), cra69_oldprae2000: L.prae2000(h.name, u.givenName || "", u.surname || ""),
    cra69_durchwahl: e.durchwahl, cra69_telefon: tel, cra69_mobil: e.mobil, cra69_abteilung: e.abteilung,
    cra69_position: L.proper(e.position), cra69_beschreibung: e.position, cra69_verteilerliste: e.verteiler.join(","),
    cra69_memberof: L.memberofEdit(h, S.departments, e.abteilung, e.zusatz),
    cra69_jedox: e.jedox, cra69_onventis: e.onventis, cra69_nhsales: e.nhsales, cra69_datev: e.datev,
    cra69_austrittsdatum: L.dateToIso(e.austritt), cra69_letzterarbeitstag: L.dateTimeToIso(e.letzterTag, e.letzteZeit), cra69_vertreter: e.vertreter,
    cra69_apprunner: myMail(), cra69_cloud: h.cloud, cra69_dorintnr: h.nr,
    cra69_activedomain: it ? "honestis.net" : h.dc, cra69_domainadmin: it ? "tu_exadmin" : h.domainadmin,
    cra69_outarget: it ? "OU=IT,OU=User,OU=HON001,DC=honestis,DC=net" : h.ou, cra69_netbiosname: it ? "honestis" : h.netbios,
    cra69_street: h.street, cra69_city: h.city, cra69_zip: h.zip, cra69_country: h.country, cra69_region: h.region, cra69_company: h.company,
    cra69_cloudmemberofdelete: ""
  };
  const dErr = (e.austritt && e.austritt < L.heute()) || (e.letzterTag && e.letzterTag < L.heute());
  const valid = e.abteilung && !vertErr && !dErr && L.nameOk(e.vorname) && L.nameOk(e.nachname);
  return { tel, payload, vertErr, dErr, valid };
}

function viewEdit(v) {
  const h = S.hotel, e = S.edit, u = e.u, c = editCalc();
  const zeiten = Array.from({ length: 48 }, (_, i) => `${String(i >> 1).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
  v.innerHTML = `<h1>${esc(u.givenName)} ${esc(u.surname)}</h1><p class="sub">${esc(u.userPrincipalName)} · ${esc(u.officeLocation || h.name)}</p>
  <div class="split"><div class="panel">
    <div class="sec"><h2>Persönliche Daten</h2><div class="grid">
      ${fText("e_vorname", "Vorname", e.vorname, { err: !L.nameOk(e.vorname) && "Umlaute, ß und Leerzeichen sind nicht erlaubt" })}
      ${fText("e_nachname", "Nachname", e.nachname, { err: !L.nameOk(e.nachname) && "Umlaute, ß und Leerzeichen sind nicht erlaubt" })}
      ${fText("e_position", "Position", e.position)}
      ${fSelect("e_abteilung", "Abteilung", e.abteilung, L.sortAbteilungen(S.opts.abteilung), { req: 1 })}
    </div></div>
    <div class="sec"><h2>Kontakt & Telefonie</h2><div class="grid">
      ${fText("e_durchwahl", "Neue Durchwahl", e.durchwahl, { hint: "Leer lassen, wenn sich nichts ändert" })}
      ${fText("e_tel", "Telefon", c.tel, { ro: 1 })}
      ${fText("e_mobil", "Mobil", e.mobil)}
    </div></div>
    <div class="sec"><h2>Software & Berechtigungen</h2>
      <div class="toggles">${fTog("e_datev", "DATEV", e.datev)}${fTog("e_jedox", "Jedox", e.jedox)}${fTog("e_nhsales", "NH-Sales", e.nhsales)}${fTog("e_onventis", "Onventis", e.onventis)}</div>
      <div class="grid" style="margin-top:24px">
        ${fChips("e_zusatz", "Berechtigungen (aus aktuellen Gruppen vorbelegt)", S.opts.shortkey, e.zusatz)}
        ${fChips("e_verteiler", "Verteilerlisten (aktuelle Mitgliedschaften vorbelegt)", S.opts.verteiler, e.verteiler, { mono: false })}
      </div>
    </div>
    <div class="sec"><h2>Abmeldung</h2><div class="grid">
      ${fText("e_austritt", "Austrittsdatum", e.austritt, { type: "date" })}
      <div class="field"><label for="e_letzter">Letzter Arbeitstag</label><div class="inline"><input id="e_letzter" type="date" value="${esc(e.letzterTag)}">
        <select id="e_zeit" class="time" aria-label="Uhrzeit">${zeiten.map(t => `<option ${t === e.letzteZeit ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      ${fText("e_vertreter", "Vertretung (E-Mail)", e.vertreter, { type: "email", req: !!(e.austritt || e.letzterTag), err: c.vertErr, hint: "Pflicht bei Abmeldung. Nicht die eigene Adresse eintragen.", full: 1 })}
      ${c.dErr ? '<div class="note full">Datum darf nicht in der Vergangenheit liegen.</div>' : ""}
    </div></div>
    <div class="actions"><button class="btn ghost" id="e_back">Zurück zur Liste</button><button class="btn" id="e_next" ${c.valid ? "" : "disabled"}>Weiter</button></div>
  </div>
  ${techPanel({ "Gruppen": u.groups.join(", "), "Zusatztools": ["jedox", "nhsales", "onventis", "datev"].filter(k => u.tools[k]).join(", ") || "keine",
                "Prä-2000 alt → neu": `${c.payload.cra69_oldprae2000} → ${c.payload.cra69_prae2000}`, "Memberof": c.payload.cra69_memberof }, "POST", CONFIG.tables.edits, c.payload)}
  </div>`;
  const upd = () => keepFocus(() => viewEdit(v));
  bind(e, { e_vorname: "vorname", e_nachname: "nachname", e_position: "position", e_abteilung: "abteilung", e_durchwahl: "durchwahl", e_mobil: "mobil",
            e_datev: "datev", e_jedox: "jedox", e_nhsales: "nhsales", e_onventis: "onventis", e_austritt: "austritt", e_letzter: "letzterTag",
            e_zeit: "letzteZeit", e_vertreter: "vertreter" }, upd);
  bindChips("e_zusatz", e.zusatz, upd); bindChips("e_verteiler", e.verteiler, upd);
  $("#e_back").onclick = () => { S.edit = null; go("verwaltung"); };
  $("#e_next").onclick = () => confirmSend("Benutzeränderung", `${e.vorname} ${e.nachname}`, () => api.createEdit(editCalc().payload), "user");
}

// =====================================================================
//  Generisches Postfach (CreateGenericScreen → cra69_userantrags)
// =====================================================================
const searchGen = debounce(async () => {
  const g = S.gen, term = g.search;
  if (!term.trim()) { g.hits = []; } else {
    try { const r = await api.searchUsers(S.hotel, term); if (term !== g.search) return; g.hits = r.filter(u => !L.istFunktionspostfach(u)).slice(0, 8); }
    catch (e) { g.hits = []; toast(e.message, "err"); }
  }
  if (S.view === "generisch") keepFocus(() => viewGen($("#view")));
}, 350);

function viewGen(v) {
  const h = S.hotel, g = S.gen;
  const payload = { cra69_hotel: h.raw, cra69_apprunner: myMail(), cra69_generic: g.mail, cra69_freigabefur: g.freigabe.join(";") };
  const ready = g.checked === "ok" && g.freigabe.length > 0;
  const status = { ok: '<div class="status ok">Adresse ist verfügbar.</div>', exists: '<div class="status err">Diese Adresse existiert bereits im Tenant.</div>',
    domain: `<div class="status err">Die Domain muss @${CONFIG.allowedGenericDomains.join(" oder @")} sein.</div>`,
    busy: '<div class="status">Wird geprüft …</div>', error: '<div class="status err">Prüfung fehlgeschlagen. Bitte erneut versuchen.</div>' }[g.checked]
    || `<small>Erlaubt: @${CONFIG.allowedGenericDomains.join(", @")}</small>`;
  v.innerHTML = `<h1>Generisches Postfach erstellen</h1><p class="sub">${esc(h.name)}</p>
  <div class="split"><div class="panel">
    <div class="sec"><div class="note info">Ein generisches Postfach ist eine Mailadresse ohne Lizenzkosten, die ausschließlich vorhandenen persönlichen Konten zugewiesen wird. Eine Anmeldung am PC oder das Arbeiten mit Outlook und anderen Office-Programmen ist damit nicht möglich.</div></div>
    <div class="sec"><h2>Adresse</h2>
      <div class="field"><label for="g_mail">E-Mail-Adresse <span class="req">*</span></label>
      <div class="inline"><input id="g_mail" type="email" value="${esc(g.mail)}" placeholder="bankett.${esc(h.nr.toLowerCase())}@dorint.com" autocomplete="off"><button class="btn ghost" id="g_check" ${g.mail ? "" : "disabled"}>Prüfen</button></div>
      ${status}</div>
    </div>
    <div class="sec"><h2>Zugriff für</h2>
      <div class="picked">${g.freigabe.length ? g.freigabe.map(m => `<span class="chip" aria-pressed="true">${esc(m)}<button aria-label="${esc(m)} entfernen" data-rm="${esc(m)}">×</button></span>`).join("") : "<small>Noch niemand ausgewählt</small>"}</div>
      <div class="field" style="margin-top:16px"><label for="g_search">Personen suchen</label><input id="g_search" type="search" value="${esc(g.search)}" placeholder="Name eingeben" autocomplete="off"></div>
      <div class="users">${g.hits.map(u => `<div class="urow static"><div class="uav">${esc((u.givenName || "?")[0])}${esc((u.surname || "")[0] || "")}</div>
        <div><b>${esc(u.givenName)} ${esc(u.surname)}</b><div class="meta">${esc(u.userPrincipalName)}</div></div>
        <button class="btn sm ${g.freigabe.includes(u.userPrincipalName) ? "ghost" : ""}" data-add="${esc(u.userPrincipalName)}">${g.freigabe.includes(u.userPrincipalName) ? "Hinzugefügt" : "Hinzufügen"}</button></div>`).join("")}</div>
    </div>
    <div class="actions"><button class="btn ghost" id="g_back">Abbrechen</button><button class="btn" id="g_next" ${ready ? "" : "disabled"}>Weiter</button></div>
  </div>
  ${techPanel({ "Postfach": g.mail, "Zugriff für": g.freigabe.join("; ") }, "POST", CONFIG.tables.antraege, payload)}
  </div>`;
  const m = $("#g_mail");
  m.oninput = () => { g.mail = m.value.trim().toLowerCase(); g.checked = null; keepFocus(() => viewGen(v)); };
  $("#g_check").onclick = async () => {
    const domain = g.mail.split("@")[1] || "";
    if (!L.emailOk(g.mail) || !CONFIG.allowedGenericDomains.includes(domain)) { g.checked = "domain"; return viewGen(v); }
    g.checked = "busy"; viewGen(v);
    try { g.checked = (await api.mailExists(g.mail)) ? "exists" : "ok"; } catch { g.checked = "error"; }
    viewGen(v);
  };
  const s = $("#g_search"); s.oninput = () => { g.search = s.value; searchGen(); };
  v.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { if (!g.freigabe.includes(b.dataset.add)) g.freigabe.push(b.dataset.add); viewGen(v); });
  v.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { g.freigabe = g.freigabe.filter(x => x !== b.dataset.rm); viewGen(v); });
  $("#g_back").onclick = () => { resetForms(); go("start"); };
  $("#g_next").onclick = () => confirmSend("Generisches Postfach", g.mail, () => api.createAntrag(payload), "generic");
}

// =====================================================================
//  Opera (nurfurOpera = true)
// =====================================================================
const OP_KEYS = ["vorname", "nachname", "telefon", "mobil", "abteilung", "position", "eintritt", "bemerkung"];
const opMap = p => Object.fromEntries(OP_KEYS.map(k => [p + k, k]));
const opValid = o => o.vorname.trim() && o.nachname.trim() && o.position.trim() && o.abteilung.trim();
const opPayload = (o, h) => ({ cra69_vorname: o.vorname, cra69_nachname: o.nachname, cra69_telefon: o.telefon, cra69_mobil: o.mobil,
  cra69_abteilung: o.abteilung, cra69_position: o.position, cra69_eintrittsdatum: L.dateToIso(o.eintritt), cra69_bemerkung: o.bemerkung,
  cra69_nurfuropera: true, cra69_hotel: h.raw, cra69_anzeigename: L.anzeigename(o.vorname, o.nachname), cra69_apprunner: myMail() });
const opForm = (p, o) => `<div class="grid">
  ${fText(p + "vorname", "Vorname", o.vorname, { req: 1 })}${fText(p + "nachname", "Nachname", o.nachname, { req: 1 })}
  ${fText(p + "telefon", "Telefon", o.telefon)}${fText(p + "mobil", "Mobil", o.mobil)}
  ${fText(p + "abteilung", "Abteilung", o.abteilung, { req: 1 })}${fText(p + "position", "Position", o.position, { req: 1 })}
  ${fText(p + "eintritt", "Eintritt / Beginn", o.eintritt, { type: "date" })}
  <div class="field full"><label for="${p}bemerkung">Bemerkung</label><textarea id="${p}bemerkung">${esc(o.bemerkung)}</textarea></div></div>`;

function viewOpNeu(v) {
  const h = S.hotel, o = S.opNeu;
  v.innerHTML = `<h1>Opera-Benutzer erstellen</h1><p class="sub">Nur Zugang zu Opera PMS, kein M365-Konto · ${esc(h.name)}</p>
  <div class="split"><div class="panel"><div class="sec">${opForm("o_", o)}</div>
  <div class="actions"><button class="btn ghost" id="o_back">Abbrechen</button><button class="btn" id="o_send" ${opValid(o) ? "" : "disabled"}>Opera-Benutzer beantragen</button></div></div>
  ${techPanel({ "Anzeigename": L.anzeigename(o.vorname, o.nachname) }, "POST", CONFIG.tables.antraege, opPayload(o, h))}</div>`;
  bind(o, opMap("o_"), () => keepFocus(() => viewOpNeu(v)));
  $("#o_back").onclick = () => { resetForms(); go("start"); };
  $("#o_send").onclick = async e => {
    e.target.disabled = true; e.target.textContent = "Wird gesendet …";
    try { await api.createAntrag(opPayload(o, h)); toast("Opera-Antrag wurde gespeichert."); S.opNeu = Object.fromEntries(OP_KEYS.map(k => [k, ""])); }
    catch (err) { toast(`Fehler: ${err.message}`, "err"); }
    viewOpNeu(v);
  };
}

async function viewOpEdit(v) {
  const h = S.hotel;
  if (S.operaList === null) {
    S.operaList = undefined;
    api.listOpera(h).then(l => { S.operaList = l; }).catch(e => { S.operaList = []; toast(e.message, "err"); })
      .finally(() => { if (S.view === "operaEdit") viewOpEdit($("#view")); });
  }
  const list = S.operaList, o = S.opEdit;
  v.innerHTML = `<h1>Opera-Benutzer bearbeiten</h1><p class="sub">Opera-Anträge am Standort ${esc(h.name)}</p>
  <div class="split"><div class="panel"><div class="sec"><div class="field"><label for="oe_pick">Opera-Benutzer auswählen</label>
  ${list === undefined ? "<small>Wird geladen …</small>" : `<select id="oe_pick"><option value="">Bitte auswählen</option>${list.map(x =>
    `<option value="${esc(x.cra69_userantragid)}" ${o && o.id === x.cra69_userantragid ? "selected" : ""}>${esc(x.cra69_anzeigename || L.anzeigename(x.cra69_vorname, x.cra69_nachname))}</option>`).join("")}</select>
    ${list.length ? "" : "<small>Für diesen Standort gibt es noch keine Opera-Anträge.</small>"}`}</div></div>
  ${o ? `<div class="sec">${opForm("oe_", o)}</div><div class="actions"><button class="btn" id="oe_send" ${opValid(o) ? "" : "disabled"}>Opera-Benutzer aktualisieren</button></div>` : ""}</div>
  ${o ? techPanel({ "Datensatz": o.id }, "PATCH", `${CONFIG.tables.antraege}(${o.id})`, opPayload(o, h)) : ""}</div>`;
  const pick = $("#oe_pick");
  if (pick) pick.onchange = () => {
    const x = list.find(r => r.cra69_userantragid === pick.value);
    S.opEdit = x ? { id: x.cra69_userantragid, vorname: x.cra69_vorname || "", nachname: x.cra69_nachname || "", telefon: x.cra69_telefon || "", mobil: x.cra69_mobil || "",
      abteilung: x.cra69_abteilung || "", position: x.cra69_position || "", eintritt: L.isoToDate(x.cra69_eintrittsdatum), bemerkung: x.cra69_bemerkung || "" } : null;
    viewOpEdit(v);
  };
  if (o) {
    bind(o, opMap("oe_"), () => keepFocus(() => viewOpEdit(v)));
    $("#oe_send").onclick = async e => {
      e.target.disabled = true; e.target.textContent = "Wird gespeichert …";
      try { await api.updateAntrag(o.id, opPayload(o, h)); toast("Opera-Benutzer wurde aktualisiert."); S.opEdit = null; S.operaList = null; }
      catch (err) { toast(`Fehler: ${err.message}`, "err"); }
      viewOpEdit(v);
    };
  }
}

// =====================================================================
//  Bestätigung + Erfolg
// =====================================================================
function confirmSend(art, wer, send, kind) {
  const root = $("#modalRoot");
  root.innerHTML = `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
    <h3 id="mt">Sind alle Angaben korrekt?</h3>
    <p>${esc(art)}: <b>${esc(wer)}</b><br>Standort: ${esc(S.hotel.name)}</p>
    <div class="merr" id="m_err" hidden></div>
    <div class="mbtns"><button class="btn" id="m_menu">Antrag senden und zurück zum Hauptmenü</button>
    <button class="btn ghost" id="m_done">Antrag senden und abschließen</button>
    <button class="btn ghost" id="m_cancel">Noch etwas ändern</button></div></div></div>`;
  const close = () => root.innerHTML = "";
  const run = async target => {
    root.querySelectorAll("button").forEach(b => b.disabled = true);
    $("#m_menu").textContent = "Wird gesendet …";
    try {
      await send();
      close(); resetForms();
      if (target === "menu") { toast("Antrag wurde übermittelt."); go("start"); } else { S.successKind = kind; go("success"); }
    } catch (e) {
      const err = $("#m_err"); err.hidden = false; err.textContent = `Der Antrag konnte nicht gespeichert werden: ${e.message}`;
      root.querySelectorAll("button").forEach(b => b.disabled = false); $("#m_menu").textContent = "Antrag senden und zurück zum Hauptmenü";
    }
  };
  $("#m_cancel").onclick = close;
  $("#m_menu").onclick = () => run("menu");
  $("#m_done").onclick = () => run("done");
  root.addEventListener("keydown", e => { if (e.key === "Escape") close(); }, { once: true });
  $("#m_cancel").focus();
}

function viewSuccess(v) {
  const generic = S.successKind === "generic";
  v.innerHTML = `<div class="success"><div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></div>
    <h1>Ihr Antrag wurde übermittelt</h1>
    <p class="sub">${generic
      ? "Ihre Anfrage für ein generisches Postfach wurde an die IT-Abteilung weitergeleitet und wird zeitnah bearbeitet. Benutzer mit Zugriff finden das Postfach anschließend automatisch in ihrem Outlook."
      : `In Kürze erhalten Sie eine E-Mail mit den Details an ${esc(myMail())}.`}</p>
    <button class="btn" id="s_home">Zum Hauptmenü</button></div>`;
  $("#s_home").onclick = () => go("start");
}

boot();
