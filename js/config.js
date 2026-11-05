// =====================================================================
//  UserantragV2 – Konfiguration
//  Hier stehen KEINE Secrets. Client-ID und Tenant-ID sind öffentlich
//  und dürfen im Repo liegen (SPA mit Auth Code + PKCE).
// =====================================================================
export const CONFIG = {
  // Entra ID – App-Registrierung (Plattform: Single-Page-Anwendung)
  tenantId: "ef47d84c-bc40-4eda-a872-196b403dc32c",
  clientId: "7b0f4c77-e3fe-4a69-a706-9ab6dbc6ed82",

  // Dataverse-Umgebung „E&P Service GmbH (default)“
  dataverseUrl: "https://org95513c9a.crm4.dynamics.com",
  dataverseApi: "v9.2",

  // Scopes (delegiert)
  graphScopes: ["User.Read", "User.Read.All", "GroupMember.Read.All"],
  get dataverseScopes() { return [`${this.dataverseUrl}/user_impersonation`]; },

  // Dataverse-Tabellen (EntitySetName)
  tables: {
    hotels: "cra69_hotelstammdaten_databases",
    antraege: "cra69_userantrags",
    edits: "cra69_userantragedits",
    departments: "cra69_department_databases"
  },

  // Globale Auswahllisten (Option Sets) in Dataverse
  optionSets: {
    verteiler: "cra69_verteilerliste",
    abteilung: "cra69_abteilung",
    shortkey: "cra69_shortkey"
  },

  // Directory-Extension für Zusatztools (Jedox=1, NH-Sales=2, Onventis=3, Datev=4)
  extPrefix: "extension_cbe97c3540ff47efbe27638cbc3bf5fe_msDS_cloudExtensionAttribute",

  // Lizenzgruppen-Regeln (aus NewUser Screen → Memberof)
  licME3: ["DOR030", "DOR037", "DOR040", "DOR052", "DOR320", "DOR321", "DOR322", "DOR323", "DOR403", "HOM302"],
  licFE3: ["DHO501", "DHO504", "DOR405"],

  // Generisches Postfach – erlaubte Domains
  allowedGenericDomains: ["dorint.com", "hommage-hotels.com"],

  // Funktionspostfächer, die in der Benutzerliste ausgeblendet werden
  excludeNames: ["DOR", "HOM", "Reservierung", "Bankett", "Sales", "Info", "Empfang", "Restaurant",
                 "Technik", "Botschafter", "Personal", "HSK", "Kueche"],

  // Admins: sehen zusätzlich „Automatisch berechnet“ und „Daten an Dataverse“.
  // E-Mail-Adressen (klein geschrieben) und/oder Name einer Entra-Gruppe.
  admins: ["mohammed.babat@honestis.ag"],
  adminGroup: "",

  // Support & Handbuch
  supportMail: "it-support@dorint.com",
  supportPhone: "+49 221 48901-1199",
  handbuchUrl: "https://it-ticketsystem.honestis.net/help/de-de/103/71",

  // Demo-Modus: Beispieldaten ohne Anmeldung. Aktiv mit ?demo=1 in der URL.
  demo: new URLSearchParams(location.search).has("demo")
};
