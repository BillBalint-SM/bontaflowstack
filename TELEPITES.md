# BontaFlowStack — magyar bemutató és telepítés

[English](README.md) · **Magyar**

### Az első ötlettől az átadható eredményig.

**34 egymáshoz kapcsolódó skill a Codexhez és a Claude Code-hoz.** Formálj terméket az ötletedből,
tervezd meg a felületét, építsd meg az elfogadott terv alapján, és ellenőrizd valódi
böngészőben. Később ott folytathatod, ahol abbahagytad: a projektdöntések és az
elvégzett ellenőrzések bizonyítékai a munka mellett maradnak.

[![npm](https://img.shields.io/npm/v/bontaflowstack)](https://www.npmjs.com/package/bontaflowstack/v/1.1.0)
[![Licenc: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows_x64-0078D6)
![Hostok: Codex és Claude Code](https://img.shields.io/badge/Hosts-Codex%20%2B%20Claude%20Code-222222)

**Előkészített npm-kiadás: `1.1.0`.**
· [Telepítés lépésről lépésre](#telepítés-windowsra)
· [Korábbi 1.0.0-s bizonyítékok](docs/bontaflowstack/RELEASE-1.0.0.md)

Az `1.1.0` kiadás az Impeccable CLI-t is
automatikusan telepíti és beállítja mindkét hosthoz. A változtatás és a próbák
az [Impeccable-telepítés leírásában](docs/bontaflowstack/IMPECCABLE-SETUP.md) szerepelnek.

Ezen az oldalon együtt találod a BontaFlowStack bemutatóját, a skillek listáját
és a teljes magyar telepítési útmutatót. A projekt alapértelmezett főoldala az
[angol README](README.md).

## Vidd végig a terméked útját a saját projektedben

Van egy kipróbálandó ötleted, egy javítandó képernyőd vagy egy befejezésre váró
funkciód? A BontaFlowStack célzott munkamódszereket ad a Codexnek és a Claude Code-nak ezekhez:

- **Találd meg a következő hasznos lépést.** A kezdeti elképzelésből legyen
  megfogalmazott ügyfélprobléma, specifikáció, tervezési irány vagy fejlesztési terv.
- **Őrizd meg a döntéseket a munkával együtt.** Mentsd az elfogadott terveket,
  projekttényeket, haladást és checkpointokat, majd töltsd vissza őket egy későbbi chatben.
- **Építsd meg és vizsgáld meg az eredményt.** Valósítsd meg az elfogadott feladatot,
  nézesd át a változtatásokat, és járd végig a webes folyamatokat a plugin böngészőjével.
- **Dönts és avatkozz be, amikor szükséges.** Válassz a látványtervek közül,
  vedd át a látható böngészőt a bejelentkezéshez, majd add vissza a vezérlést az agentnek.
- **Bizonyítékkal add át a munkát.** A dokumentáció és a Git-alapú átadás a ténylegesen
  módosított fájlokra és a rögzített ellenőrzésekre épüljön.

Használhatsz egyetlen skillt egy konkrét feladathoz, vagy a routerre bízhatod
a megfelelő belépési pont kiválasztását. Magyarul is kérheted a munkát.

## Kezdd itt

**Szükséges:** Windows x64, Node.js 24+ npm-mel, Git és legalább egy támogatott
host CLI-vel a PATH-on: Codex vagy Claude Code. A kiadás telepítési parancsa:

```powershell
npx bontaflowstack@1.1.0 setup
```

Ugyanez a rögzített csomag `setup` nélkül is elindítja a beállítást. Alapértelmezésben
a telepítő felismeri a Codexet és/vagy a Claude Code-ot, és minden megtalált hostot
beállít. Egyetlen hosthoz használd a `--host codex` vagy `--host claude` kapcsolót;
a `--host all` mindkettő meglétét kéri. A csomag verziózott hostadaptereket telepít
az npm-cache-en kívül, és előkészíti a böngésző/render motort. A motorfüggőségekhez
és a Chromiumhoz internet kell; a munkafolyamatok futtatásához bejelentkezett hostfiók.

Telepítés után nyiss új munkamenetet. Codexben a saját projektedben küldd el:

```text
$bfs-router Segíts megtervezni egy időpontfoglaló oldalt a szolgáltatásomhoz. Először tisztázzuk az ügyfélproblémát és a legkisebb hasznos első változatot.
```

Claude Code-ban a `/bontaflowstack:bfs-router` paranccsal kezdd. A telepítő nem
ad hook-bizalmat, és nem módosítja a host jogosultságait; a hookokat a host szokásos
bizalmi felületén kell áttekinteni és jóváhagyni, ha erre kér.

## Válassz a feladatodhoz illő skillt

| Következő lépés | Ezzel kezdd | Mire való? |
| --- | --- | --- |
| Ötlet kidolgozása | `$bfs-business-builder` | Ügyfélprobléma, termékirány és tesztelhető brief |
| Tervezés | `$bfs-spec`, `$bfs-autoplan` | Elfogadási feltételek és összehangolt tervértékelés |
| Vizuális irány kiválasztása | `$bfs-design-consultation` | Irányok összehasonlítása és a kiválasztott designrendszer meghatározása |
| Felület megépítése | `$bfs-design-html` | Reszponzív HTML és komponensek, a megjelenített eredmény vizsgálatával |
| Elfogadott változtatás megvalósítása | `$bfs-implement` | Körülhatárolt fejlesztés és ellenőrzés |
| Weboldal használata | `$bfs-browse`, `$bfs-scrape` | Látható böngésző, emberi vezérlésátvétel és ellenőrzött adatkinyerés |
| Hibakeresés és felülvizsgálat | `$bfs-bug-issue-investigate`, `$bfs-review`, `$bfs-qa` | Diagnózis, kódellenőrzés és valódi webes folyamatok vizsgálata |
| Átadás előkészítése | `$bfs-documentation`, `$bfs-finisher` | Forrásalapú dokumentáció, commit, push és PR-műveletek |
| Folytatás később | `$bfs-save-context`, `$bfs-load-context` | Checkpoint mentése és visszatöltése, az eltérések felismerésével |
| Következő feladat kiválasztása | `$bfs-wayfinder` | Projektállapot és a következő hasznos lépés |

A [katalógus](plugins/bontaflowstack/catalog.json) és a
[parancsreferencia](plugins/bontaflowstack/references/commands.md) további részleteket ad.

## Mind a 34 skill

<details>
<summary>A teljes skilllista megnyitása</summary>

| Skill | Rendeltetés |
| --- | --- |
| `bfs-router` | A BFS beállítása vagy a feladathoz illő skill és munkafolyamat kiválasztása. |
| `bfs-implement` | Elfogadott terv, specifikáció, design vagy körülhatárolt változtatás megvalósítása és ellenőrzése. |
| `bfs-business-builder` | Ügyfélprobléma vagy termékirány tisztázása tesztelhető üzleti brieffé. |
| `bfs-spec` | A projektre épülő specifikáció készítése vagy módosítása, megfigyelhető elfogadási esetekkel. |
| `bfs-autoplan` | A releváns tervértékelések összehangolása és egyeztetett terv készítése a nyitott döntésekkel. |
| `bfs-plan-ceo-review` | A terv ügyfélértékének, üzleti illeszkedésének és mérhető sikerfeltételeinek értékelése. |
| `bfs-plan-eng-review` | A terv architektúrájának, helyességének és megvalósíthatóságának értékelése a kódbázis alapján. |
| `bfs-plan-design-review` | Tervezett képernyők és folyamatok használhatósági, akadálymentességi és állapotkezelési értékelése. |
| `bfs-plan-devex-review` | Tervezett API-k, CLI-k, SDK-k és bevezetési folyamatok fejlesztői használhatóságának értékelése. |
| `bfs-plan-tune` | Opcionális BFS-preferenciák, paneles vagy chates kérdések és módosítási javaslatok kezelése. |
| `bfs-design-consultation` | Vizuális arculat meghatározása, irányok összehasonlítása és a választott designrendszer finomítása. |
| `bfs-design-html` | Reszponzív HTML és komponensek készítése vagy finomítása elfogadott designból, megjelenítésük ellenőrzésével. |
| `bfs-design-review` | Megjelenített felület használhatósági és vizuális hibáinak vizsgálata, illetve a kért javítások ellenőrzése. |
| `bfs-browse` | Weboldal olvasása vagy használata, látható böngésző megnyitása és emberi bejelentkezés utáni folytatás. |
| `bfs-scrape` | Ellenőrzött oldaladatok kinyerése JSON-ként vagy oldallal kapcsolatos kérdés megválaszolása forrásokkal. |
| `bfs-benchmark` | Böngészős teljesítménymérés, összehasonlítható alapértékek, romlások és trendek jelentése. |
| `bfs-bug-issue-investigate` | Reprodukálható hiba diagnózisa, illetve közös okának javítása és a javítás ellenőrzése. |
| `bfs-review` | Kódváltoztatás ellenőrzése a követelmények és a hívók alapján, vagy a kért hibák javítása és újraellenőrzése. |
| `bfs-cso-audit` | A kódból vagy változtatásból ténylegesen elérhető biztonsági kockázatok és javítási prioritások vizsgálata. |
| `bfs-health` | Meglévő projektellenőrzések futtatása a parancsok, eredmények és korlátok jelentésével. |
| `bfs-qa` | Valódi webes folyamatok és reszponzív állapotok tesztelése, illetve a kért hibák javítása és újraellenőrzése. |
| `bfs-documentation` | Forrással egyeztetett projektdokumentáció készítése, frissítése vagy hiányainak feltárása. |
| `bfs-finisher` | Ellenőrzött változtatás átadásának előkészítése vagy kért commit-, push- és PR-műveletek elvégzése. |
| `bfs-prod-deploy` | Kiválasztott változtatás vizsgálata, integrálása vagy telepítése, az átadott verzió és működés ellenőrzésével. |
| `bfs-landing-report` | Integrációs sor, verzióütközések és ellenőrzések frissességének jelentése a repository módosítása nélkül. |
| `bfs-bontaflow-memory` | Projektdöntések, tények, tervek és tanulságok olvasása, módosítása vagy kivezetése. |
| `bfs-save-context` | Ellenőrzött munka mentése, szüneteltetése, exportálása vagy checkpointok listázása. |
| `bfs-load-context` | Checkpoint visszatöltése, eltérések felismerése és folytatás ellenőrzött következő lépésből. |
| `bfs-guard` | Az aktuális feladat parancsfigyelmeztetéseinek és projektszerkesztési határainak vizsgálata vagy kifejezetten kért módosítása. |
| `bfs-retro` | A tényleges munkanyomok áttekintése újrahasználható tanulságokért, elkülönítve a mechanikus ellenőrzést a szakmai értékeléstől. |
| `bfs-prototype` | Kis, elkülönített kísérlet egy konkrét termék- vagy műszaki kérdés eldöntésére, a bizonyíték megőrzésével. |
| `bfs-triage` | Jelzett probléma bizonyítékalapú, rangsorolt értékelése és a következő út kijelölése. |
| `bfs-wayfinder` | A következő hasznos projektlépés meghatározása a kontextusból, munkafolyamatból és feladatállapotból. |
| `bfs-learn` | Elkülönített, futtatható gyakorlófeladat készítése vagy a tényleges tanulási eredmény vizsgálata. |

</details>

## Böngésző, amelynek átveheted a vezérlését

Kérd meg a BFS-t, hogy látható ablakban nyisson meg egy oldalt. Amikor a webhely
a te közreműködésedet igényli, vedd át a böngészőt, végezd el a lépést, majd kérd
az agent folytatását. A csomag `bfs` böngészőkapcsolata a kiválasztott projektet
használja, és bekapcsolva tartja a Chromium sandboxját.

[A böngészős munkafolyamat részletei](plugins/bontaflowstack/references/browser.md).

## A projekt kontextusa helyben marad

A core a Node.js standard könyvtárára épül. A döntések, a munkafolyamatok haladása,
a checkpointok és a böngésző állapota helyi állapottárba kerülnek; a motorok
fájljai külön települnek. A beállítás megőrzi a meglévő projektutasításokat.

A csomag tartalmazza az ellenőrzőösszeggel rögzített **0.3.3-as motor forrásarchívumát**.
A böngésző függőségei és a Chromium a beállítás során töltődnek le. Az opcionális
designintegrációkat akkor adhatod hozzá, amikor szükség van a képességeikre.

[Helyi adatok, mentés és eltávolítás](docs/bontaflowstack/LOCAL-DATA.md).
Az opcionális hookok mindkét hoston a natív bizalmi jóváhagyást igénylik; a
telepítő ezt nem kerüli meg. A guard feladatra korlátozott figyelmeztetést és szerkesztési ellenőrzést ad; nem
operációs rendszer szintű biztonsági határ.

## Mire épül az 1.0.0?

Ez a kiadás az igazolt 0.7.5-ös megvalósítást viszi tovább **1.0.0** néven,
frissített verziójelöléssel és felhasználói dokumentációval. A kiadási kapu
ellenőrzi, hogy a pluginban csak a két verziómező változott: a többi pluginfájl,
a motor, a setup és a marketplace bájtjainak egyezniük kell az elfogadott csomagéval.

A megőrzött gyakorlati bizonyíték **Windows x64-en, valódi Codex Desktopban,
Full Access mellett, ZIP-ből telepített pluginra** vonatkozik. Lefedi a projekthez
kapcsolódást, a látható Chromiumot, az emberi beavatkozást, az agent folytatását,
a visszaolvasást és a lezárást. Ez a futás 0.7.5-tel történt; az eredeti verzióval
és környezettel őrizzük meg, nem nevezzük át új 1.0.0-s próbának.

[Bizonyítékok és kompatibilitási határok](docs/bontaflowstack/RELEASE-1.0.0.md)
· [Változásnapló](docs/bontaflowstack/CHANGELOG.md)

## Telepítés Windowsra

Az aktuális egyetlen telepítési út az npm-csomag pontos verziója. A **1.1.0**
kiadás publikálásra előkészítve. [Kiadási jelentés](docs/bontaflowstack/RELEASE-1.1.0.md).

```powershell
npx bontaflowstack@1.1.0 setup
```

Ugyanez a parancs `setup` nélkül is elindítja a beállítást. Ne tölts le ZIP-et,
ne másold kézzel a plugint, és ne regisztrálj külön marketplace-et.

### Előfeltételek

- Windows x64.
- Node.js 24 vagy újabb, npm-mel és a Git for Windows.
- Codex és/vagy Claude Code a CLI-vel a `PATH` környezeti változóban.
- Internet a motorfüggőségek és Chromium letöltéséhez.
- Bejelentkezett hostfiók a modellalapú workflow-k használatához; a telepítéshez nem kell bejelentkezés.

Ellenőrizd PowerShellben:

```powershell
node --version
npm.cmd --version
git --version
Get-Command codex,claude -ErrorAction SilentlyContinue
```

Legalább az egyik host CLI-jének meg kell jelennie. Alapértelmezésben a setup
felismeri mindkét telepített hostot és mindegyikhez regisztrál. Választhatod az
egyiket `--host codex` vagy `--host claude` kapcsolóval, illetve kérheted mindkettőt
`--host all` kapcsolóval. A `all` hibaüzenettel leáll, ha valamelyik host hiányzik.

### Telepítés és első indítás

Futtasd az egyetlen telepítési parancsot:

```powershell
npx bontaflowstack@1.1.0 setup
```

Siker esetén az installer kiírja a verziót, a regisztrált hostokat és a tartós
telepítési könyvtárakat. A csomag a verziózott hostfájlokat az npm-cache-en kívül,
`%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0\hosts` alatt tartja.
Az installer egyetlen már létező BFS-állapotgyökeret automatikusan újrahasznál,
beleértve a Windows Store által átirányított LocalAppData útvonalat is. Ha nincs
korábbi adat, az alapértelmezett gyökér `%LOCALAPPDATA%\BontaFlowStack\state\v2`.
Ha két különböző gyökérben is van adat, a telepítés a hostok beállítása előtt leáll;
állítsd be a `BFS_STATE_HOME` változót az általad kiválasztott meglévő útvonalra.
Az adatok nem olvadnak össze. Minden host `install-state.json` fájlja a kiválasztott
közös útvonalat rögzíti.

Nyiss új munkamenetet, és kezdd a hostnak megfelelő routerrel:

- Codex: `$bfs-router`
- Claude Code: `/bontaflowstack:bfs-router`

A routerrel állítsd be a böngésző- és rendermotort, ha ezekre is szükséged van.
A csomag előkészíti a rögzített motorverziót; a Chromium és a függőségek letöltése
eltarthat. A `doctor` fájlellenőrzése önmagában nem bizonyítja a böngészőindítást.

### Trust és engedélyek

Az installer nem módosít hostjogosultságot és nem hagy jóvá hookokat. Ha a Codex
vagy Claude Code hook-trustot kér, olvasd át a hookokat a host natív felületén,
és csak saját döntésed alapján hagyd jóvá. Ne kapcsold be a trust-bypass módot.
Tartsd meg a választott permission profilt; a böngésző Chromium sandboxja maradjon bekapcsolva.

### Frissítés és visszaállítás

Frissítéshez futtasd ugyanazt a parancsot egy új, pontos csomagverzióval, például
`npx bontaflowstack@1.1.0 setup` egy korábbi verzióról való frissítéshez. A telepítő a
régi hostverziókat és a közös `state/v2` adatot megőrzi; egyszerre egy setupot futtass.
Visszaállításhoz a korábbi, ismert verzió parancsát használd, ha az elérhető.

### Eltávolítás

A pluginregisztrációt a host saját plugin-kezelőjével távolítsd el. Codexben a
`bontaflowstack@bontaflowstack` plugin, Claude Code-ban a
`bontaflowstack@bontaflowstack-npx` plugin és a `bontaflowstack-npx` marketplace
tartozik ehhez a telepítéshez. A verziózott
telepítési fájlok és a közös állapottár megmaradnak; törlésük külön, tudatos adatkezelési
művelet, lásd a [helyi adatok útmutatóját](docs/bontaflowstack/LOCAL-DATA.md).

### Elakadások

| Jelenség | Teendő |
| --- | --- |
| A parancs `not published` vagy `404` hibát ad | Ellenőrizd a pontos verziót és a registryt: `npm view bontaflowstack@1.1.0 version --registry=https://registry.npmjs.org`. A verzió állapotát a kiadási jelentés rögzíti. |
| Nincs host CLI a PATH-on | Telepítsd és nyisd újra a PowerShellt; ellenőrizd a `Get-Command codex,claude` kimenetét. |
| Régi verzió töltődik be | Indíts új hostmunkamenetet, majd ellenőrizd a pluginverziót és a `readFromFolder` útvonalat. |
| A motor a terminálból elérhető, hostból nem | A telepítő és az adapter a közös `install-state.json` útvonalat használja; futtasd a hostból a `doctor` ellenőrzést, és őrizd meg a kimenetet. |
| Hook-trustot kér a host | Vizsgáld át és hagyd jóvá a natív felületen; az installer nem tudja ezt helyetted megtenni. |
| npm vagy Chromium letöltési hiba | Őrizd meg a pontos hálózati/proxyhibát, rendezd, majd ismételd meg a rögzített verzió setupját. |

Az angol [Windows telepítési útmutató](docs/bontaflowstack/INSTALL-WINDOWS.md)
és a [Claude Code részletei](docs/bontaflowstack/INSTALL-CLAUDE-CODE.md) ugyanazt az npm-belépőt írják le.

## Alakítsd te is a folytatást

Hibát találtál? [Nyiss hibajegyet](https://github.com/BillBalint-SM/bontaflowstack/issues),
és add meg a plugin, a Desktop és a CLI verzióját, a megkísérelt műveletet és
a tényleges hibaüzenetet. Távolítsd el a személyes útvonalakat, hitelesítési adatokat
és privát oldaltartalmakat.

Szívesen fogadunk hozzájárulásokat. Az architektúra és a működési szerződés
megismerését a [HOST.md](plugins/bontaflowstack/HOST.md) és a
[core modulok](plugins/bontaflowstack/core) leírásánál kezdd. A karbantartóknak
szóló kiadási folyamat a forrásrepository `docs/bontaflowstack/RELEASE-PROCESS.md`
fájljában található.

## Licenc

[MIT](LICENSE). Készítette: Bálint Bilisics / BontaFlow.
