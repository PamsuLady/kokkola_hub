# Kokkola Hub – Ravintolat & Tapahtumat 🍽️✨

Kokkola Hub on puhtaalla Full Stack -web-arkkitehtuurilla (Vanilla JS, Pure PHP, MySQL) toteutettu sovellus, joka kokoaa Kokkolan alueen ravintoloiden lounaslistat, kampanjat, edut ja tapahtumat yhteen selkeään paikkaan.

Projekti on saanut alkunsa käytännön tarpeesta: ravintoloiden sosiaalisen median markkinointi hukkuu helposti algoritmeihin. Tämä sovellus tarjoaa kuluttajille nopean tavan löytää paikalliset tarjoukset ja ravintoloitsijoille suojatun B2B-hallintapaneelin ilmoitusten itsenäiseen hallintaan.

## 🚀 Ohjelmistoarkkitehtuuri & Teknologiat

Projekti on rakennettu ilman raskaita kolmannen osapuolen kirjastoja tai viitekehyksiä, mikä korostaa ydinteknologioiden hallintaa ja puhdasta järjestelmäsuunnittelua:

*   **Frontend (Käyttöliittymä):** HTML5, CSS3 (Moderni CSS Grid & Flexbox) ja asynkroninen JavaScript (ES6+ / Fetch API).
*   **Backend (API-rajapinta):** PHP-pohjainen REST API, joka käsittelee istuntoja (Sessions), kuvankäsittelyä sekä moniosaista lomakedataa (`Multipart/Form-Data`).
*   **Tietokanta:** MySQL/MariaDB-relaatiotietokanta datan pysyvään tallennukseen ja käyttäjäsidonnaisuuksien hallintaan.

## 🌟 Avaintoiminnot & UI/UX-ratkaisut

### 1. Kuluttajanäkymä & Responsiivinen Asiatettelu
*   **Dynaaminen kategoriasuodatus:** Käyttäjä voi suodattaa ilmoituksia (Lounaat, Tapahtumat, Edut) lennosta ilman sivun uudelleenlatausta.
*   **Sticky UI:** Kiinnitetty yläpalkki pitää navigaation ja suodattimet aina saatavilla sivua rullatessa.
*   **Mobiilioptimoitu skaalaus (UX):** Media Queryt optimoivat puhelimen pystysuuntaisen tilan muuttamalla yläpalkkia matalammaksi ja piilottamalla tarpeettomat kuvaustekstit automaattisesti alle 600px laitteilla.
*   **Line-Clamping:** Korttien kuvaustekstit katkaistaan siististi kolmannen rivin kohdalla (`...`), mikä pitää korttien visuaalisen koon aina yhtenäisenä ja siistinä.
*   **Säästyvä Dark Mode:** Minimalistinen, yhdellä emojilla (☀️/🌙) toimiva teemanvaihtaja, joka tallentaa käyttäjän valinnan selaimen muistiin (`localStorage`).

### 2. Suojattu B2B-Hallintapaneeli & Autentikaatio
*   **Käyttäjäistunnot (Authentication):** Sisäänkirjautumis- ja rekisteröitymisjärjestelmä toteutettu turvallisesti PHP-sessioilla (`session_start()`).
*   **Salasanasuojaus:** Salasanojen tallennus ja vertailu suoritetaan tietokantaan kryptografisesti suojattuna (`PASSWORD_BCRYPT` & `password_verify`).
*   **Omistajuuden hallinta (Authorization):** Järjestelmä tunnistaa sisäänkirjautuneen käyttäjän ja generoi poistopainikkeen (`DELETE`) *ainoastaan* niihin kortteihin, jotka kyseinen tunnus on itse luonut.
*   **Roolipohjainen navigaatio:** Asiakasnäkymä on oletuksena täysin puhdas ylläpitotyökaluista. Hallintapaneelin painikkeet ja peruutusvaihtoehdot ilmestyvät näkyviin dynaamisesti käyttäjän tilan mukaan.

### 3. Automaattinen kuvankäsittely & Tiedostolataus
*   Ravintoloitsijat voivat ladata ilmoituksiin kuvatiedostoja suoraan omalta laitteeltaan (`type="file"`), joka lähetetään `FormData`-olion avulla palvelimelle.
*   PHP-backend suorittaa tiedostolle turvatarkistukset (tiedostokoko, sallitut päätteet) ja prosessoi kuvan **GD-kirjastolla**.
*   **Crop & Center -logiikka:** Palvelin rajaa ja muokkaa jokaisen ladatun kuvan automaattisesti täsmälleen **600x400 pikselin** suorakulmioksi, mikä säästää levytilaa, nopeuttaa sivuston latautumista ja takaa sen, että kuvat istuvat korteille aina täydellisesti ilman leikkautumisvirheitä.

## 📂 Tietokantarakennen (MySQL)

Järjestelmä hyödyntää kahta toisiinsa linkitettyä taulua:

```sql
CREATE TABLE kayttajat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kayttajatunnus VARCHAR(50) NOT NULL UNIQUE,
    salasana VARCHAR(255) NOT NULL,
    luotu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mainokset (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ravintola VARCHAR(100) NOT NULL,
    kategoria VARCHAR(50) NOT NULL,
    otsikko VARCHAR(150) NOT NULL,
    kuvaus TEXT NOT NULL,
    pvm VARCHAR(100) NOT NULL,
    suositeltu TINYINT(1) DEFAULT 0,
    kuvaUrl VARCHAR(255) DEFAULT NULL,
    nettisivuUrl VARCHAR(255) DEFAULT NULL,
    kayttaja_id INT NOT NULL,
    luotu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ Paikallinen asennus ja käynnistys

1. Kloonaa tai siirrä tämä projektikansio XAMPP-palvelimen `htdocs`-kansioon (esim. `C:\xampp\htdocs\kokkolahub`).
2. Käynnistä XAMPP Control Panelista **Apache**- ja **MySQL**-palvelimet.
3. Avaa selaimessa phpMyAdmin (`http://localhost/phpmyadmin/`), luo uusi tietokanta nimellä `kokkola_hub` ja aja yllä olevat SQL-lausekkeet **SQL**-välilehdellä.
4. Varmista, että projektikansion juuressa on tyhjä kansio nimellä `uploads` ladattavia kuvatiedostoja varten.
5. Avaa sovellus selaimessa osoitteessa: `http://localhost/kokkolahub/`
