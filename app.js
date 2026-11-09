const API_URL = "api.php"; 

let mainokset = [];
let nykyinenKayttajaId = null; // Seurataan kuka on kirjautuneena sisään

// 1. KÄYNNISTYSLOGIIKKA SIVUN LATAUTUESSA
document.addEventListener("DOMContentLoaded", () => {
    lataaData();
    alustaSuodatinLogiikka(); 
    alustaNavigaatio();
    alustaAuthLogiikka();
    alustaTeema(); // Käynnistetään tumma teema
});

// 2. HAETAAN DATA JA KIRJAUTUMISTIETO BACKENDISTA
async function lataaData() {
    try {
        const vastaus = await fetch(`${API_URL}?action=lue`);
        if (!vastaus.ok) throw new Error("Datan lataus epäonnistui");
        
        const data = await vastaus.json();
        mainokset = data.mainokset;
        nykyinenKayttajaId = data.nykyinen_kayttaja_id; 
        
        naytaMainokset(mainokset);
        paivitaNavigaationakyvyys();
    } catch (virhe) {
        console.error("Virhe:", virhe);
        document.getElementById("mainos-grid").innerHTML = "<p>Tietojen hakeminen epäonnistui.</p>";
    }
}

// 3. KORTTIEN TULOSTUS + NETTISIVUPAINIKE + POISTONAPIT
function naytaMainokset(suodatettuData) {
    const grid = document.getElementById("mainos-grid");
    grid.innerHTML = "";

    if (suodatettuData.length === 0) {
        grid.innerHTML = "<p>Ei löytynyt ilmoituksia tällä valinnalla.</p>";
        return;
    }

    suodatettuData.forEach(kohde => {
        const kortti = document.createElement("div");
        kortti.className = `kortti ${kohde.kategoria}`;
        if (parseInt(kohde.suositeltu) === 1) kortti.classList.add("suositeltu-nosto");

        const kuva = kohde.kuvaUrl ? kohde.kuvaUrl : "https://unsplash.com";

        // ARKKITEHTUURINEN LISÄYS: Jos ilmoituksella on nettisivulinkki, luodaan sille tyylikäs painike
        let nettisivuHtml = "";
        if (kohde.nettisivuUrl) {
            // target="_blank" avaa linkin uudelle välilehdelle ja rel="noopener" suojaa tietoturvaa
            nettisivuHtml = `<a href="${kohde.nettisivuUrl}" target="_blank" rel="noopener" class="kotisivu-linkki">🌐 Vieraile verkkosivuilla</a>`;
        }

        let poistoNappiHtml = "";
        if (nykyinenKayttajaId !== null && kohde.kayttaja_id == nykyinenKayttajaId) {
            poistoNappiHtml = `<button class="poisto-nappi" onclick="poistaMainos(${kohde.id})">🗑️ Poista ilmoitus</button>`;
        }

        kortti.innerHTML = `
            <img src="${kuva}" alt="${kohde.ravintola}" class="kortti-kuva">
            <div class="kortti-sisalto">
                <span class="tagi tagi-${kohde.kategoria}">${kohde.kategoria.toUpperCase()}</span>
                <h3 class="ravintola-nimi">${kohde.ravintola}</h3>
                <h4 class="mainos-otsikko">${kohde.otsikko}</h4>
                <p class="mainos-kuvaus">${kohde.kuvaus}</p>
                
                <!-- Syötetään mahdollinen nettisivulinkki tähän väliin ennen alalaitaa -->
                ${nettisivuHtml}

                <div class="kortti-ala">
                    <span class="pvm-info">🕒 ${kohde.pvm}</span>
                    ${poistoNappiHtml}
                </div>
            </div>
        `;
        grid.appendChild(kortti);
    });
}

// 4. SUODATUSLOGIIKKA (Filtterit)
function alustaSuodatinLogiikka() {
    const napit = document.querySelectorAll(".suodatin-nappi");
    napit.forEach(nappi => {
        nappi.addEventListener("click", (e) => {
            document.querySelector(".suodatin-nappi.aktiivinen").classList.remove("aktiivinen");
            e.target.classList.add("aktiivinen");
            const kategoria = e.target.dataset.filter;
            if (kategoria === "kaikki") {
                naytaMainokset(mainokset);
            } else {
                const suodatettu = mainokset.filter(m => m.kategoria === kategoria);
                naytaMainokset(suodatettu);
            }
        });
    });
}

// 5. MAINOKSEN POISTO TIETOKANNASTA
async function poistaMainos(id) {
    if (!confirm("Haluatko varmasti poistaa tämän ilmoituksen pysyvästi?")) return;

    try {
        const vastaus = await fetch(`${API_URL}?action=poista&id=${id}`, {
            method: "DELETE"
        });
        const tulos = await vastaus.json();

        if (tulos.status === "success") {
            alert(tulos.message);
            lataaData(); 
        } else {
            alert("Virhe: " + tulos.message);
        }
    } catch (virhe) {
        console.error("Virhe poistossa:", virhe);
    }
}

// 6. KIRJAUTUMISEN JA REKISTERÖITYMISEN LOGIIKKA
function alustaAuthLogiikka() {
    const form = document.getElementById("kirjautumis-lomake");
    const rekisteroidyNappi = document.getElementById("nappi-rekisteroidy");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const tunnus = document.getElementById("auth-tunnus").value;
        const salasana = document.getElementById("auth-salasana").value;

        const vastaus = await fetch(`${API_URL}?action=kirjaudu`, {
            method: "POST",
            body: JSON.stringify({ tunnus, salasana })
        });
        const tulos = await vastaus.json();

        if (tulos.status === "success") {
            form.reset();
            await lataaData(); 
            const authNappi = document.getElementById("nappi-auth");
            authNappi.classList.remove("aktiivinen");
            const asiakasOsio = document.getElementById("asiakas-osio");
            const authOsio = document.getElementById("auth-osio");
            asiakasOsio.classList.remove("piilossa");
            authOsio.classList.add("piilossa");
        } else {
            alert(tulos.message);
        }
    });

    rekisteroidyNappi.addEventListener("click", async () => {
        const tunnus = prompt("Syötä uusi käyttäjätunnus:");
        if (!tunnus) return;
        const salasana = prompt("Syötä uusi salasana:");
        if (!salasana) return;

        const vastaus = await fetch(`${API_URL}?action=rekisteroidy`, {
            method: "POST",
            body: JSON.stringify({ tunnus, salasana })
        });
        const tulos = await vastaus.json();
        alert(tulos.message);
    });

    document.getElementById("nappi-ulos").addEventListener("click", async () => {
        await fetch(`${API_URL}?action=ulos`, { method: "POST" });
        nykyinenKayttajaId = null;
        await lataaData();
        const authOsio = document.getElementById("auth-osio");
        const ravintolaOsio = document.getElementById("ravintola-osio");
        const asiakasOsio = document.getElementById("asiakas-osio");
        authOsio.classList.add("piilossa");
        ravintolaOsio.classList.add("piilossa");
        asiakasOsio.classList.remove("piilossa");
    });

    // Uuden mainoksen lisäys (Päivitetty lukemaan nettisivukenttä)
    document.getElementById("lisaa-mainos-lomake").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append("ravintola", document.getElementById("lomake-ravintola").value);
        formData.append("kategoria", document.getElementById("lomake-kategoria").value);
        formData.append("otsikko", document.getElementById("lomake-otsikko").value);
        formData.append("kuvaus", document.getElementById("lomake-kuvaus").value);
        formData.append("pvm", document.getElementById("lomake-pvm").value);
        formData.append("suositeltu", document.getElementById("lomake-suositeltu").checked);
        
        // PÄIVITETTY RIVI: appendataan uusi nettisivulinkki mukaan post-pakettiin
        formData.append("nettisivuUrl", document.getElementById("lomake-nettisivut").value);
        
        const tiedostoInput = document.getElementById("lomake-kuvatiedosto");
        if (tiedostoInput.files.length > 0) {
            formData.append("kuva", tiedostoInput.files[0]); 
        }

        try {
            const vastaus = await fetch(`${API_URL}?action=lisaa`, {
                method: "POST",
                body: formData
            });
            
            const tulos = await vastaus.json();

            if (tulos.status === "success") {
                document.getElementById("lisaa-mainos-lomake").reset();
                await lataaData();
                document.getElementById("nappi-palaa").click();
            } else {
                alert("Tallennus epäonnistui: " + tulos.message);
            }
        } catch (virhe) {
            console.error("Virhe lähetettäessä tiedostoa:", virhe);
            alert("Yhteysvirhe palvelimeen.");
        }
    });
}

// 7. NAVIGAATIONÄKYMIEN HALLINTA
function alustaNavigaatio() {
    const palaaNappi = document.getElementById("nappi-palaa");
    const ravintolaNappi = document.getElementById("nappi-ravintola");
    const authNappi = document.getElementById("nappi-auth");
    const peruutaAuthLomake = document.getElementById("loman-peruuta-auth");
    
    const asiakasOsio = document.getElementById("asiakas-osio");
    const ravintolaOsio = document.getElementById("ravintola-osio");
    const authOsio = document.getElementById("auth-osio");

    function palaaPaonakymaan() {
        vaihdaAktiivinenNappi(palaaNappi);
        naytaVainOsio(asiakasOsio);
        palaaNappi.classList.add("piilossa"); 
        if (nykyinenKayttajaId !== null) {
            ravintolaNappi.classList.remove("piilossa");
        }
    }

    palaaNappi.addEventListener("click", palaaPaonakymaan);
    peruutaAuthLomake.addEventListener("click", palaaPaonakymaan);

    ravintolaNappi.addEventListener("click", () => {
        vaihdaAktiivinenNappi(ravintolaNappi);
        naytaVainOsio(ravintolaOsio);
        ravintolaNappi.classList.add("piilossa"); 
        palaaNappi.classList.remove("piilossa"); 
    });

    authNappi.addEventListener("click", () => {
        vaihdaAktiivinenNappi(authNappi);
        naytaVainOsio(authOsio);
        palaaNappi.classList.remove("piilossa"); 
        ravintolaNappi.classList.add("piilossa"); 
    });

function vaihdaAktiivinenNappi(nappi) {
const aktiivinen = document.querySelector(".nav-nappi.aktiivinen");
if (aktiivinen) aktiivinen.classList.remove("aktiivinen");
if (nappi.classList.contains("nav-nappi")) {
nappi.classList.add("aktiivinen");
}
}
function naytaVainOsio(osio) {
[asiakasOsio, ravintolaOsio, authOsio].forEach(o => o.classList.add("piilossa"));
osio.classList.remove("piilossa");
}
}
// 8. NAVIGAATION NÄKYVYYS
function paivitaNavigaationakyvyys() {
const palaaNappi = document.getElementById("nappi-palaa");
const ravintolaNappi = document.getElementById("nappi-ravintola");
const authNappi = document.getElementById("nappi-auth");
const ulosNappi = document.getElementById("nappi-ulos");
if (nykyinenKayttajaId !== null) {
ravintolaNappi.classList.remove("piilossa");
ulosNappi.classList.remove("piilossa");
authNappi.classList.add("piilossa");
palaaNappi.classList.add("piilossa");
} else {
ravintolaNappi.classList.add("piilossa");
ulosNappi.classList.add("piilossa");
palaaNappi.classList.add("piilossa");
authNappi.classList.remove("piilossa");
}
}
// 9. VAALEA / TUMMA TEEMA
function alustaTeema() {
const teemaNappi = document.getElementById("nappi-teema");
const tallennettuTeema = localStorage.getItem("teema");
if (tallennettuTeema === "dark") {
document.documentElement.setAttribute("data-theme", "dark");
teemaNappi.textContent = "☀️";
} else {
document.documentElement.setAttribute("data-theme", "light");
teemaNappi.textContent = "🌙";
}
teemaNappi.addEventListener("click", () => {
const nykyinenTeema = document.documentElement.getAttribute("data-theme");
if (nykyinenTeema === "light") {
document.documentElement.setAttribute("data-theme", "dark");
localStorage.setItem("teema", "dark");
teemaNappi.textContent = "☀️";
} else {
document.documentElement.setAttribute("data-theme", "light");
localStorage.setItem("teema", "light");
teemaNappi.textContent = "🌙";
}
});
}