// =====================================================================
//  Beispieldaten für den Demo-Modus (?demo=1) – keine echten Personen
// =====================================================================
export const DEMO_HOTELS = [
  { cra69_hotelstammdaten_databaseid: "h1", cra69_hotelname_string: "DHI Head Office", cra69_dorinthnr: "DHO501", cra69_telephone: "+49 221 48901-0", cra69_domain: "@dho-hotels.de", cra69_dc: "honestis.net", cra69_cloud: "Ja", cra69_street: "Aachener Str. 1051", cra69_zip: "50858", cra69_city: "Köln", cra69_state: "NRW", cra69_country: "DE", cra69_company: "Dorint GmbH", cra69_domainadmin: "tu_exadmin", cra69_outarget: "OU=User,OU=DHO501,DC=honestis,DC=net", cra69_netbiosname: "honestis" },
  { cra69_hotelstammdaten_databaseid: "h2", cra69_hotelname_string: "Honestis HV", cra69_dorinthnr: "HON001", cra69_telephone: "+49 221 48901-0", cra69_domain: "@honestis.ag", cra69_dc: "honestis.net", cra69_cloud: "", cra69_street: "Aachener Str. 1051", cra69_zip: "50858", cra69_city: "Köln", cra69_state: "NRW", cra69_country: "DE", cra69_company: "Honestis AG", cra69_domainadmin: "tu_exadmin", cra69_outarget: "OU=User,OU=HON001,DC=honestis,DC=net", cra69_netbiosname: "honestis" },
  { cra69_hotelstammdaten_databaseid: "h3", cra69_hotelname_string: "Dorint Beispielhotel Köln", cra69_dorinthnr: "DOR030", cra69_telephone: "+49 221 80190-0", cra69_domain: "@dorint.com", cra69_dc: "mydorint.net", cra69_cloud: "Ja", cra69_street: "Musterstr. 1", cra69_zip: "50667", cra69_city: "Köln", cra69_state: "NRW", cra69_country: "DE", cra69_company: "Dorint Hotelbetriebs GmbH", cra69_domainadmin: "adm_dor030", cra69_outarget: "OU=User,OU=DOR030,DC=mydorint,DC=net", cra69_netbiosname: "mydorint" },
  { cra69_hotelstammdaten_databaseid: "h4", cra69_hotelname_string: "Dorint Beispielhotel Bonn ", cra69_dorinthnr: "DOR405", cra69_telephone: "+49 228 7269-0", cra69_domain: "@dorint.com", cra69_dc: "mydorint.net", cra69_cloud: "", cra69_street: "Musterweg 2", cra69_zip: "53111", cra69_city: "Bonn", cra69_state: "NRW", cra69_country: "DE", cra69_company: "Dorint Hotelbetriebs GmbH", cra69_domainadmin: "adm_dor405", cra69_outarget: "OU=User,OU=DOR405,DC=mydorint,DC=net", cra69_netbiosname: "mydorint" }
];

export const DEMO_OPTIONS = {
  cra69_verteilerliste: ["VLT-BuHa-Alle-Exkl-Mgmt-Lizenz","VLT-Buchhaltung-Management","VLT-Einkauf","VLT-Empfang-Hotel","VLT-Hausdamen","VLT-Kueche","VLT-Kuechenleiter","VLT-Personal-Hotel","VLT-Reservierung-Exkl-Lizenz","VLT-Reservierung-Lizenz","VLT-Sales-Exkl-Lizenz","VLT-Sales-Lizenz","VLT-Sales-Postf-Exkl-Lizenz","VLT-Sales-Postf-Lizenz","VLT-Service","VLT-Technik","VLT-Veranstaltung-Exkl-Lizenz","VLT-Veranstaltung-Lizenz"],
  cra69_abteilung: ["Abteilungsleiter","All","Bankett","Buchhaltung","Direktion","F&B","Front Office","Housekeeping","Kueche","Personal","Reservierung","Sales","Sekretariat","SPA Wellness","Technik","HV Architektur","HV Buchhaltung","HV Controlling","HV Distribution & Revenue","HV E-Commerce & Digital Distrubtion","HV HR","HV IPM","HV IT","HV Marketing","HV Procurement","HV Recht","HV Sales","HV Technik","HV Yoga","HV Zentrale Finanzdienstleistung"],
  cra69_shortkey: ["AC","AL","BQ","EA","EN","FB","FO","GM","HD","HK","HR","KI","MS","RE","TH","VPN"]
};

export const DEMO_USERS = [
  { id: "u1", userPrincipalName: "anna.beispiel@dorint.com", givenName: "Anna", surname: "Beispiel", jobTitle: "Front Office Managerin", department: "Front Office", officeLocation: "Dorint Beispielhotel Köln", businessPhones: ["+49 221 80190-214"], mobilePhone: "0171 0000001", groups: ["G-DOR030-M365-FO", "G-DOR030-M365-AL", "VLT-Empfang-Hotel"], ext: { 1: "Jedox" } },
  { id: "u2", userPrincipalName: "jonas.muster@dorint.com", givenName: "Jonas", surname: "Muster", jobTitle: "Küchenchef", department: "Kueche", officeLocation: "Dorint Beispielhotel Köln", businessPhones: [], mobilePhone: "", groups: ["G-DOR030-M365-KI", "VLT-Kuechenleiter"], ext: { 3: "Onventis" } },
  { id: "u3", userPrincipalName: "lea.test@dorint.com", givenName: "Lea", surname: "Test", jobTitle: "Sales Managerin", department: "Sales", officeLocation: "Dorint Beispielhotel Köln", businessPhones: [], mobilePhone: "0152 0000003", groups: ["G-DOR030-M365-MS", "SG-VPN-Users", "VLT-Sales-Lizenz"], ext: { 2: "NHSales" } },
  { id: "u4", userPrincipalName: "empfang.dor030@dorint.com", givenName: "Empfang", surname: "DOR030", jobTitle: "", department: "", officeLocation: "Dorint Beispielhotel Köln", businessPhones: [], mobilePhone: "", groups: [], ext: {} },
  { id: "u5", userPrincipalName: "tim.probe@dorint.com", givenName: "Tim", surname: "Probe", jobTitle: "Haustechniker", department: "Technik", officeLocation: "Dorint Beispielhotel Bonn ", businessPhones: ["+49 228 7269-300"], mobilePhone: "", groups: ["G-DOR405-M365-TH", "VLT-Technik"], ext: { 4: "Datev" } }
];

export const DEMO_OPERA = [
  { cra69_userantragid: "op1", cra69_vorname: "Paul", cra69_nachname: "Beispiel", cra69_anzeigename: "Beispiel, Paul", cra69_telefon: "", cra69_mobil: "", cra69_abteilung: "Front Office", cra69_position: "Rezeptionist", cra69_eintrittsdatum: "2026-12-01T00:00:00Z", cra69_bemerkung: "", cra69_hotel: "Dorint Beispielhotel Köln" }
];
