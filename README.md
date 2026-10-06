# Roska-astiajärjestelmä

Trash Heatmap seuraa tapahtumissa roska-astioiden tyhjennystä. Työntekijä kirjaa tyhjennyksen astiaan kiinnitetyn QR-koodin kautta. Järjestelmä tallentaa tapahtuman ja näyttää astioiden käytön koontinäkymissä.

Suositeltu käyttötapa on Docker Compose, joka käynnistää sovelluksen ja Redis-istuntopalvelun. Sovellus toimii myös suoraan Node.js:llä, kun Redis on käytettävissä.

## Miten järjestelmä toimii

1. QR-koodi avaa astian kirjaussivun osoitteessa `/bin.html?bin=<astianumero>`.
2. Työntekijä valitaan käyttäjänimellä. Selain muistaa viimeksi käytetyn nimen; hyväksytty nimi kirjataan automaattisesti sivua avattaessa. Uusi tai vaihdettu nimi annetaan sivulla.
3. Palvelin tarkistaa käyttäjänimen käyttäjätaulusta kirjainkoosta riippumatta ja tallentaa tapahtumaan tietokannasta löytyvän nimen, astianumeron ja aikaleiman.
4. Saman astian uutta tyhjennystä ei hyväksytä 10 minuuttiin edellisestä kirjauksesta. Esto koskee kaikkia käyttäjiä.
5. Koontinäkymät lukevat tietokannasta astioiden sijainnit, viimeisimmät tyhjennykset, käyttäjien aktiivisuuden ja astioiden käyttökerrat.

Hallintapaneelissa ylläpidetään käyttäjiä, astioiden sijainteja, QR-tarroja ja kirjauksia. Hallintakirjautuminen luo palvelinistunnon, jota säilytetään Redisissä.

## Käyttöönotto Dockerilla

Tarvitset Docker Enginen tai Docker Desktopin sekä Docker Compose v2:n.

1. Luo `.env` mallista, jos tiedostoa ei vielä ole. Älä korvaa olemassa olevaa `.env`-tiedostoa:

   ```powershell
   Copy-Item .env.example .env
   ```

   Linuxissa tai macOS:ssa komento on `cp .env.example .env`.

2. Aseta `.env`-tiedostoon oma vahva `ADMIN_PASSWORD`. Luo myös satunnainen `SESSION_SECRET`; esimerkiksi Node.js:llä:

   ```bash
   node -p "require('crypto').randomBytes(32).toString('hex')"
   ```

3. Käynnistä sovellus ja Redis:

   ```bash
   docker compose up --build -d
   docker compose ps
   docker compose logs -f app
   ```

4. Avaa `http://localhost:3001/dashboard.html`.

Docker-kuva käyttää Node.js 26:ta. Säiliö luo puuttuvat astiat 0–55 käynnistyessään. Tietokanta ja lokit säilyvät projektin `database/`- ja `logs/`-hakemistoissa; Redis-istunnot säilyvät Docker-volyymissa.

Pysäytä säiliöt komennolla `docker compose down`. Se ei poista tietokantaa, lokitiedostoja eikä Redis-volyymia. Komento `docker compose down -v` poistaa Redis-volyymin ja sen istuntotiedot.

### Käyttö tapahtumaverkossa

Toisilta laitteilta käytettävää osoitetta varten aseta `.env`-tiedostoon palvelimen verkko-osoite `PUBLIC_HOST`- ja `QR_HOST`-muuttujiin. Aseta lisäksi `PUBLIC_PROTOCOL` ja `QR_PROTOCOL` arvoon `http` tai `https`. HTTPS-asennuksessa TLS-yhteys päätetään esimerkiksi käänteisessä välityspalvelimessa. Salli palomuurissa valittu `HOST_PORT` (oletus `3001`).

Kun asetuksia muutetaan, luo sovelluskuva uudelleen ja käynnistä palvelut:

```bash
docker compose up --build -d
```

## Käyttö

### Työntekijä

- Skannaa astiaan kiinnitetty QR-koodi puhelimella.
- Ensimmäisellä käyttökerralla anna hyväksytty käyttäjänimi ja valitse **Empty the bin**. Selain tallentaa nimen ja yrittää kirjata tyhjennyksen automaattisesti seuraavilla QR-koodin avauskerroilla. Tarkista nimi ennen skannausta; voit vaihtaa sen **Change User** -painikkeella.
- Jos nimi ei ole hyväksytty, pyydä ylläpitäjää lisäämään se hallintapaneelissa.
- Jos astia on kirjattu viimeisen 10 minuutin aikana, odota sivulla ilmoitettu aika ennen uutta kirjausta.

### Ylläpitäjä

- Avaa `/admin_login.html` ja kirjaudu `.env`-tiedoston `ADMIN_USERNAME`- ja `ADMIN_PASSWORD`-tiedoilla.
- Hallintapaneelissa (`/admin.html`) voit lisätä tai poistaa työntekijöitä, tarkastella kirjauksia sekä palauttaa astioiden sijainnit lähtöpaikkaan.
- Astioiden sijainteja muokataan sivulla `/bin_editor.html`; QR-tarroja hallitaan sivulla `/qr_labels.html`.
- Kirjauslokien tyhjennys ja astioiden sijaintien palautus luovat JSON-varmuuskopion hakemistoon `database/backups/`.
- Kirjauslokien tyhjennys vaatii ensin hallintapaneelissa asetetun nimimerkin. Nimimerkki tallennetaan auditointia varten.

## Ajo ilman Dockeria

Asenna Node.js 26, npm ja Redis. Suorita komennot projektin juurihakemistossa, koska tietokannan polku on suhteellinen nykyiseen hakemistoon.

```bash
npm ci
node scripts/createBins.js
npm start
```

Varmista ennen käynnistystä, että juuren `.env` sisältää ainakin `ADMIN_USERNAME`, `ADMIN_PASSWORD` ja vahvan `SESSION_SECRET`-arvon. Oletuksena sovellus etsii Redis-palvelinta osoitteesta `redis://127.0.0.1:6379`; osoitteen voi vaihtaa `REDIS_URL`-muuttujalla. Palvelin kuuntelee oletuksena porttia 3001.

## Asetukset

| Muuttuja                         | Käyttö                                         | Oletus                         |
| -------------------------------- | ---------------------------------------------- | ------------------------------ |
| `ADMIN_USERNAME`                 | Hallintakirjautumisen käyttäjänimi             | Ei oletusta                    |
| `ADMIN_PASSWORD`                 | Hallintakirjautumisen salasana                 | Ei oletusta                    |
| `SESSION_SECRET`                 | Istuntoevästeen allekirjoitusavain             | Asetettava itse                |
| `REDIS_URL`                      | Redis-palvelimen osoite                        | `redis://127.0.0.1:6379`       |
| `PORT`                           | Sovelluksen kuunteluportti                     | `3001`                         |
| `BIND_ADDR`                      | Kuunteluosoite                                 | `0.0.0.0`                      |
| `HOST_PORT`                      | Dockerin julkaisema portti                     | `3001`                         |
| `PUBLIC_HOST`, `PUBLIC_PROTOCOL` | Palvelimen julkinen osoite ja protokolla       | Dockerissa `localhost`, `http` |
| `QR_HOST`, `QR_PROTOCOL`         | QR-koodeihin tulostettava osoite ja protokolla | Dockerissa `localhost`, `http` |

`.env` on tarkoitettu paikallisille salaisuuksille, ja se on rajattu pois Docker-kuvan rakennuskontekstista sekä Gitistä. Älä lähetä sitä versionhallintaan. Tuotantokäytössä käytä vahvaa salasanaa ja satunnaista istuntoavainta.

## Tietojen tallennus ja varmuuskopiointi

- `database/trash.db` sisältää käyttäjät, astiat, tyhjennyskirjaukset ja auditointitiedot.
- `logs/server.log` sisältää palvelimen pyyntö- ja virhelokeja.
- `database/backups/` sisältää hallintatoimintojen luomia JSON-varmuuskopioita.
- Docker Compose liittää tietokannan ja lokit projektihakemistoihin. Redis käyttää erillistä Docker-volyymia.

Ota tietokannasta erillinen varmuuskopio ennen ylläpitotoimia. SQLite-tiedosto kannattaa kopioida, kun sovellus on pysäytetty:

```powershell
docker compose stop app
Copy-Item database/trash.db database/trash.db.bak
docker compose start app
```

## Keskeiset rajapinnat

| Rajapinta                        | Tarkoitus                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `POST /api/log`                  | Lisää hyväksytyn käyttäjän tyhjennyskirjauksen                                  |
| `GET /api/status`                | Astiat ja niiden viimeisimmät tyhjennysajat                                     |
| `GET /api/heatmap`               | Astioiden käyttökerrat; `range=hour`, `day` tai `week` rajaa ajanjakson         |
| `GET /api/activity`              | Viimeisimmät käyttäjien ja astioiden tapahtumat                                 |
| `GET /api/ranking`               | Astioiden käyttökerrat järjestettynä määrän mukaan                              |
| `GET /api/logs`                  | Viimeisimmät kirjaukset; `bin_id` rajaa yhteen astiaan                          |
| `GET /api/qr/:bin`               | Luo astian QR-koodin ja palauttaa sen URL-osoitteen                             |
| `POST /api/admin/login`          | Aloittaa hallintaistunnon                                                       |
| `POST /api/admin/logout`         | Päättää hallintaistunnon                                                        |
| `POST /api/admin/reset-logs`     | Tyhjentää kaikki kirjaukset tai valitun astian kirjaukset varmuuskopion jälkeen |
| `POST /api/admin/reset-all-bins` | Palauttaa astioiden sijainnit koordinaatteihin `0,0` varmuuskopion jälkeen      |

## Tietoturvahuomio

Hallintasivut ja resetointitoiminnot tarkistavat kirjautumisistunnon. Käyttäjien API-reitit (`/api/users`) eivät tällä hetkellä tarkista ylläpitäjän istuntoa. Pidä palvelu luotetussa tapahtumaverkossa ja palomuurin takana; älä julkaise sitä suoraan internetiin ennen näiden reittien suojaamista.

Älä julkaise Redis-porttia internetiin. Kun sovellusta käytetään HTTPS:n takana, aseta `PUBLIC_PROTOCOL=https`, jotta istuntoeväste merkitään suojatuksi.

## Vianmääritys

- **Kirjaus ei onnistu:** tarkista käyttäjänimen kirjoitusasu ja että nimi on lisätty hallintapaneelissa. Tarkista myös, ettei samaa astiaa kirjattu viimeisen 10 minuutin aikana.
- **Kirjautuminen ei säily:** varmista, että Redis toimii ja `REDIS_URL` osoittaa oikeaan palvelimeen. Tarkista, että `SESSION_SECRET` on asetettu.
- **QR-koodi ohjaa väärään osoitteeseen:** tarkista `QR_HOST` ja `QR_PROTOCOL` sekä luo QR-tarrat uudelleen.
- **Tietokantaa ei voi avata:** käynnistä palvelin projektin juurihakemistosta ja varmista, että `database/` on kirjoitettavissa.
- **Docker-palvelu ei käynnisty:** tarkista tila komennolla `docker compose ps` ja lokit komennolla `docker compose logs app`.

## Projektin rakenne

```text
public/       Käyttöliittymät ja selainpuolen JavaScript
server/       Express-palvelin, tietokanta, middleware ja API-reitit
database/     SQLite-tietokanta ja varmuuskopiot
logs/         Palvelimen lokit
scripts/      Ylläpito- ja alustuskomennot
Dockerfile    Node.js-sovelluksen kuva
docker-compose.yml  Sovellus- ja Redis-palvelut
```
