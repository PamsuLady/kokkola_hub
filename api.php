<?php
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, DELETE");

$host = "localhost";
$db   = "kokkola_hub";
$user = "root";
$pass = "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
try {
     $pdo = new PDO($dsn, $user, $pass, [
         PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
     ]);
} catch (\PDOException $e) {
     echo json_encode(["status" => "error", "message" => "Tietokantavirhe: " . $e->getMessage()]);
     exit;
}

$metodi = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// 1. HAETAAN MAINOKSET (GET)
if ($metodi === 'GET' && $action === 'lue') {
    try {
        $stmt = $pdo->query("SELECT * FROM mainokset ORDER BY id DESC");
        $tulokset = $stmt->fetchAll();
        echo json_encode([
            "mainokset" => $tulokset,
            "nykyinen_kayttaja_id" => $_SESSION['kayttaja_id'] ?? null
        ]);
    } catch (\PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Haku epäonnistui: " . $e->getMessage()]);
    }
    exit;
}

// 2. REKISTERÖITYMINEN (POST)
if ($metodi === 'POST' && $action === 'rekisteroidy') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!empty($input['tunnus']) && !empty($input['salasana'])) {
        try {
            $suojattu_salasana = password_hash($input['salasana'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("INSERT INTO kayttajat (kayttajatunnus, salasana) VALUES (:tunnus, :salasana)");
            $stmt->execute([':tunnus' => $input['tunnus'], ':salasana' => $suojattu_salasana]);
            echo json_encode(["status" => "success", "message" => "Tunnus luotu! Voit nyt kirjautua."]);
        } catch (\PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Käyttäjätunnus on jo varattu."]);
        }
    }
    exit;
}

// 3. KIRJAUTUMINEN (POST)
if ($metodi === 'POST' && $action === 'kirjaudu') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!empty($input['tunnus']) && !empty($input['salasana'])) {
        $stmt = $pdo->prepare("SELECT * FROM kayttajat WHERE kayttajatunnus = :tunnus");
        $stmt->execute([':tunnus' => $input['tunnus']]);
        $kayttaja = $stmt->fetch();

        if ($kayttaja && password_verify($input['salasana'], $kayttaja['salasana'])) {
            $_SESSION['kayttaja_id'] = $kayttaja['id'];
            $_SESSION['tunnus'] = $kayttaja['kayttajatunnus'];
            echo json_encode(["status" => "success", "message" => "Kirjautunut!", "kayttaja_id" => $kayttaja['id']]);
        } else {
            echo json_encode(["status" => "error", "message" => "Väärä tunnus tai salasana."]);
        }
    }
    exit;
}

// 4. KIRJAUTUMINEN ULOS (POST)
if ($metodi === 'POST' && $action === 'ulos') {
    session_destroy();
    echo json_encode(["status" => "success"]);
    exit;
}

// 5. UUDEN MAINOKSEN LISÄYS + AUTOMAATTINEN KUVANRAJAUS (POST)
if ($metodi === 'POST' && $action === 'lisaa') {
    if (!isset($_SESSION['kayttaja_id'])) {
        echo json_encode(["status" => "error", "message" => "Kirjaudu ensin sisään."]);
        exit;
    }

    $ravintola = $_POST['ravintola'] ?? '';
    $kategoria = $_POST['kategoria'] ?? '';
    $otsikko = $_POST['otsikko'] ?? '';
    $kuvaus = $_POST['kuvaus'] ?? '';
    $pvm = $_POST['pvm'] ?? '';
    $suositeltu = (isset($_POST['suositeltu']) && ($_POST['suositeltu'] === 'true' || $_POST['suositeltu'] === '1')) ? 1 : 0;
    $nettisivuUrl = $_POST['nettisivuUrl'] ?? '';
    
    $kuvaPolku = null;

    if (isset($_FILES['kuva']) && $_FILES['kuva']['error'] === UPLOAD_ERR_OK) {
        $tiedostoTmp_name = $_FILES['kuva']['tmp_name'];
        $tiedostoName = $_FILES['kuva']['name'];
        $tiedostoSize = $_FILES['kuva']['size'];
        
        $paate = strtolower(pathinfo($tiedostoName, PATHINFO_EXTENSION));
        $sallitut_paatteet = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        
        if ($tiedostoSize > 5 * 1024 * 1024) {
            echo json_encode(["status" => "error", "message" => "Kuva on liian suuri (max 5MB)."]);
            exit;
        }

        if (in_array($paate, $sallitut_paatteet)) {
            $uusiNimi = uniqid('kuva_', true) . '.' . $paate;
            $kohdeKansio = 'uploads/' . $uusiNimi;
            
            // AUTOMAATTINEN KUVANMUOKKAUS (GD-kirjasto)
            if ($paate === 'png') {
                $alkuperainenKuva = imagecreatefrompng($tiedostoTmp_name);
            } elseif ($paate === 'webp') {
                $alkuperainenKuva = imagecreatefromwebp($tiedostoTmp_name);
            } else {
                $alkuperainenKuva = imagecreatefromjpeg($tiedostoTmp_name);
            }

            if ($alkuperainenKuva) {
                $orig_w = imagesx($alkuperainenKuva);
                $orig_h = imagesy($alkuperainenKuva);

                // Määritetään tasan 600x400 koon kohdealue kortteja varten
                $kohde_w = 600;
                $kohde_h = 400;

                $uusiKuvaPohja = imagecreatetruecolor($kohde_w, $kohde_h);

                // Säilytetään läpinäkyvyysasetukset PNG- ja WEBP-kuville
                imagealphablending($uusiKuvaPohja, false);
                imagesavealpha($uusiKuvaPohja, true);

                // Lasketaan kuvasuhteet keskittävää rajausta varten (Crop & Center)
                $ratio_orig = $orig_w / $orig_h;
                $ratio_kohde = $kohde_w / $kohde_h;

                if ($ratio_orig > $ratio_kohde) {
                    $src_h = $orig_h;
                    $src_w = $orig_h * $ratio_kohde;
                    $src_x = ($orig_w - $src_w) / 2;
                    $src_y = 0;
                } else {
                    $src_w = $orig_w;
                    $src_h = $orig_w / $ratio_kohde;
                    $src_x = 0;
                    $src_y = ($orig_h - $src_h) / 2;
                }

                // Luodaan rajattu ja optimoitu kopio kuvasta
                imagecopyresampled($uusiKuvaPohja, $alkuperainenKuva, 0, 0, $src_x, $src_y, $kohde_w, $kohde_h, $src_w, $src_h);

                // Tallennetaan muokattu kuva kiintolevylle uploads-kansioon oikealla tyypillä
                if ($paate === 'png') {
                    imagepng($uusiKuvaPohja, $kohdeKansio);
                } elseif ($paate === 'webp') {
                    imagewebp($uusiKuvaPohja, $kohdeKansio);
                } else {
                    imagejpeg($uusiKuvaPohja, $kohdeKansio, 85); 
                }

                imagedestroy($alkuperainenKuva);
                imagedestroy($uusiKuvaPohja);
                
                $kuvaPolku = $kohdeKansio;
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Virheellinen tiedostomuoto."]);
            exit;
        }
    }

    if (!empty($ravintola) && !empty($otsikko)) {
        try {
            $sql = "INSERT INTO mainokset (ravintola, kategoria, otsikko, kuvaus, pvm, suositeltu, kayttaja_id, kuvaUrl, nettisivuUrl) 
                    VALUES (:ravintola, :kategoria, :otsikko, :kuvaus, :pvm, :suositeltu, :kayttaja_id, :kuvaUrl, :nettisivuUrl)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':ravintola'   => $ravintola,
                ':kategoria'   => $kategoria,
                ':otsikko'     => $otsikko,
                ':kuvaus'      => $kuvaus,
                ':pvm'         => $pvm,
                ':suositeltu'  => $suositeltu,
                ':kayttaja_id' => $_SESSION['kayttaja_id'],
                ':kuvaUrl'     => $kuvaPolku,
                ':nettisivuUrl'=> !empty($nettisivuUrl) ? $nettisivuUrl : null
            ]);
            echo json_encode(["status" => "success"]);
        } catch (\PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Tietokantatallennus epäonnistui: " . $e->getMessage()]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Pakollisia tietoja puuttuu."]);
    }
    exit;
}

// 6. MAINOKSEN POISTAMINEN (DELETE)
if ($metodi === 'DELETE' && $action === 'poista') {
    if (!isset($_SESSION['kayttaja_id'])) {
        echo json_encode(["status" => "error", "message" => "Kirjaudu sisään."]);
        exit;
    }

    $mainos_id = $_GET['id'] ?? null;
    
    try {
        $stmt = $pdo->prepare("SELECT kayttaja_id FROM mainokset WHERE id = :id");
        $stmt->execute([':id' => $mainos_id]);
        $mainos = $stmt->fetch();

        if ($mainos && $mainos['kayttaja_id'] == $_SESSION['kayttaja_id']) {
            $deleteStmt = $pdo->prepare("DELETE FROM mainokset WHERE id = :id");
            $deleteStmt->execute([':id' => $mainos_id]);
            echo json_encode(["status" => "success", "message" => "Ilmoitus poistettu!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Ei poisto-oikeutta."]);
        }
    } catch (\PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Poisto epäonnistui: " . $e->getMessage()]);
    }
    exit;
}
?>
