# UserantragV2 – IT Benutzerverwaltung (Web)

Web-App für die HR-Ansprechpartner der DHI-Standorte. Ersetzt die Power App „Userantrag“.
Die App schreibt in **dieselben Dataverse-Tabellen** wie die Power App. Darum laufen die
bestehenden Flows (`Userantrag_erstellen`, Edit-Flow, PAD-Flows) unverändert weiter.

- Reines HTML/JavaScript, kein Build-Schritt
- Anmeldung über Entra ID (MSAL.js, Auth Code + PKCE), **kein Client Secret**
- Daten: Microsoft Graph (Benutzer, Gruppen, Zusatztools) und Dataverse Web API
- Design: Dorint CD 2023

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Oberfläche und Styles (Dorint CD 2023) |
| `js/config.js` | Tenant, Client-ID, Dataverse-URL, Regeln (Lizenzlisten, Domains) |
| `js/auth.js` | Anmeldung mit MSAL |
| `js/api.js` | Graph- und Dataverse-Aufrufe |
| `js/logic.js` | Geschäftslogik aus den Power-Fx-Formeln |
| `js/app.js` | Screens: Start, Neuer Benutzer, Bearbeiten/Abmelden, Generisches Postfach, Opera |
| `js/demo.js` | Beispieldaten für den Demo-Modus |
| `vendor/` | MSAL Browser 3.28.1 (lokal, kein CDN) |
| `staticwebapp.config.json` | Sicherheits-Header für Azure Static Web Apps |

## Power App → Web-App

| Power App | Web-App |
|---|---|
| Menu Screen | Start (Hotelauswahl + Kacheln) |
| NewUser Screen → `Userantrags` | Neuen Benutzer anmelden → `POST cra69_userantrags` |
| Overview + EditUserScreen → `UserantragEdits` | Benutzer bearbeiten / abmelden → `POST cra69_userantragedits` |
| CreateGenericScreen | Generisches Postfach → `POST cra69_userantrags` |
| Opera-User-beantragen / -bearbeiten | Opera erstellen (`POST`) / bearbeiten (`PATCH`) |
| Flow `Zusatztools_abrufen` | Entfällt: ein Graph-Aufruf liest die Extension-Attribute 1–4 |
| `Office365-Benutzer`, `AzureAD`-Konnektor | Microsoft Graph |

Korrigiert gegenüber der Power App:
- Opera bearbeiten speichert jetzt die richtigen Felder.
- Opera-Anzeigename wird aus den Opera-Feldern gebildet.
- „Postfach prüfen“ meldet erst nach der Prüfung „verfügbar“ und prüft auch Gruppen und Aliase.
- Neuer Benutzer: Es wird live geprüft, ob der Anmeldename schon existiert.
- Hotelnamen mit Leerzeichen am Ende werden bei der Benutzersuche trotzdem gefunden.

## 1. App-Registrierung einrichten (einmalig)

App-Registrierung `7b0f4c77-e3fe-4a69-a706-9ab6dbc6ed82` im Entra Admin Center:

1. **Authentifizierung → Plattform hinzufügen → Single-Page-Anwendung**
   Umleitungs-URIs (genau so, mit `/` am Ende):
   - `http://localhost:5500/`
   - `https://<name>.azurestaticapps.net/` (nach dem Deployment)
2. **API-Berechtigungen** (Delegiert):
   - Microsoft Graph: `User.Read`, `User.Read.All`, `GroupMember.Read.All`
   - Dynamics CRM: `user_impersonation`
   - Danach **Administratorzustimmung erteilen**.
3. **Zertifikate & Geheimnisse:** Für diese App wird kein Secret gebraucht.
4. **Zugriff einschränken (empfohlen):** Unternehmensanwendungen → App öffnen →
   Eigenschaften → **Zuweisung erforderlich = Ja** → unter „Benutzer und Gruppen“
   die HR-Gruppe zuweisen. Dann können sich nur diese Personen anmelden.

Wer Anträge schreiben darf, regeln weiterhin die **Dataverse-Sicherheitsrollen**
(wie bei der Power App).

## 2. Lokal testen

```powershell
cd UserantragV2
python -m http.server 5500
```

- Echte Daten: `http://localhost:5500/`
- Demo ohne Anmeldung: `http://localhost:5500/?demo=1`

`file://` funktioniert nicht, die App braucht einen Webserver.

## 3. Deployment (Azure Static Web Apps, Free)

1. Im Azure-Portal **Static Web App** anlegen, Plan **Free**, Quelle **Andere**.
2. Unter **Bereitstellungstoken verwalten** das Token kopieren.
3. Im GitHub-Repo: **Settings → Secrets and variables → Actions → New repository secret**
   Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`, Wert: das Token.
4. Push auf `main` → GitHub Actions deployt automatisch.
5. Die URL der Static Web App als SPA-Umleitungs-URI eintragen (siehe Schritt 1).

## Konfiguration ändern

Alles in `js/config.js`: Lizenzlisten (`licME3`, `licFE3`), erlaubte Domains für
generische Postfächer, ausgeblendete Funktionspostfächer, Support-Kontakte.
Hotels, Abteilungen, Berechtigungen und Verteilerlisten kommen live aus Dataverse.

## Sicherheit

- Keine Secrets im Code. Client-ID und Tenant-ID sind öffentlich.
- Tokens liegen nur in der Browser-Sitzung (`sessionStorage`).
- Content-Security-Policy erlaubt nur Login, Graph und die eigene Dataverse-Umgebung.
