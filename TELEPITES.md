# BontaFlowStack — magyar bemutató és telepítés

[English](README.md) · **Magyar**

### Az első ötlettől az átadható eredményig.

**34 egymáshoz kapcsolódó skill a Codex Desktophoz.** Formálj terméket az ötletedből,
tervezd meg a felületét, építsd meg az elfogadott terv alapján, és ellenőrizd valódi
böngészőben. Később ott folytathatod, ahol abbahagytad: a projektdöntések és az
elvégzett ellenőrzések bizonyítékai a munka mellett maradnak.

[![Kiadás](https://img.shields.io/github/v/release/BillBalint-SM/bontaflowstack)](https://github.com/BillBalint-SM/bontaflowstack/releases/latest)
[![Licenc: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows_x64-0078D6)
![Host: Codex Desktop](https://img.shields.io/badge/Host-Codex_Desktop-222222)

**[Az 1.0.0 letöltése](https://github.com/BillBalint-SM/bontaflowstack/releases/tag/v1.0.0)**
· [Telepítés lépésről lépésre](#telepítés-windowsra)
· [A kiadás részletei](docs/bontaflowstack/RELEASE-1.0.0.md)

Ezen az oldalon együtt találod a BontaFlowStack bemutatóját, a skillek listáját
és a teljes magyar telepítési útmutatót. A projekt alapértelmezett főoldala az
[angol README](README.md).

## Vidd végig a terméked útját a saját projektedben

Van egy kipróbálandó ötleted, egy javítandó képernyőd vagy egy befejezésre váró
funkciód? A BontaFlowStack célzott munkamódszereket ad a Codexnek ezekhez:

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

**Szükséges:** Windows x64, Codex Desktop, Node.js 24+ npm-mel és a plugintelepítést
támogató Codex CLI. A böngésző beállításához internet, a Git-műveletekhez Git is kell.

1. Töltsd le a [BontaFlowStack-1.0.0.zip](https://github.com/BillBalint-SM/bontaflowstack/releases/download/v1.0.0/BontaFlowStack-1.0.0.zip)
   fájlt és a hozzá tartozó [SHA256-fájlt](https://github.com/BillBalint-SM/bontaflowstack/releases/download/v1.0.0/BontaFlowStack-1.0.0.zip.sha256).
   Ezeket a kiadási fájlokat válaszd, ne a GitHub automatikus „Source code” archívumát.
2. Kövesd a [lenti telepítési lépéseket](#telepítés-windowsra): ellenőrizd az
   ellenőrzőösszeget, bontsd ki tartós könyvtárba, és regisztráld a plugint.
3. Teljesen indítsd újra a Codex Desktopot, nyisd meg a saját projektedet, és küldd el:

```text
$bfs-router Állítsd be a BontaFlowStacket ehhez a projekthez, a böngésző-, render- és designképességekkel együtt. A telepített 1.0.0-s plugint használd.
```

Utána jöhet a saját feladatod:

```text
$bfs-router Időpontfoglaló oldalt szeretnék a szolgáltatásomhoz. Segíts meghatározni
az első használható változatot, összehasonlítani a tervezési irányokat és megtervezni
a megvalósítást.
```

A telepítési rész a frissítést, a visszaállítást és az egyes lépések elvárt eredményét
is tartalmazza. Megtarthatod a választott Codex-jogosultsági profilt: a dokumentált
Full Access használathoz nem kell on-request módra váltanod.

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
az agent folytatását. A csomag `bfs-browser` kapcsolata a Codexben kiválasztott
projektet használja, és bekapcsolva tartja a Chromium sandboxját.

[A böngészős munkafolyamat részletei](plugins/bontaflowstack/references/browser.md).

## A projekt kontextusa helyben marad

A core a Node.js standard könyvtárára épül. A döntések, a munkafolyamatok haladása,
a checkpointok és a böngésző állapota helyi állapottárba kerülnek; a motorok
fájljai külön települnek. A beállítás megőrzi a meglévő projektutasításokat.

A ZIP tartalmazza az ellenőrzőösszeggel rögzített **0.3.3-as motor forrásarchívumát**.
A böngésző függőségei és a Chromium a beállítás során töltődnek le. Az opcionális
designintegrációkat akkor adhatod hozzá, amikor szükség van a képességeikre.

[Helyi adatok, mentés és eltávolítás](docs/bontaflowstack/LOCAL-DATA.md).
Az opcionális hookok a Codex szokásos bizalmi jóváhagyását igénylik. A guard
feladatra korlátozott figyelmeztetést és szerkesztési ellenőrzést ad; nem
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

Az alábbi útmutató az **1.0.0-s ZIP-csomaghoz** készült. Nem igényel fejlesztői
checkoutot, személyes gépútvonalat vagy korábbi BFS-telepítést.
A Codex saját jogosultsági profilját megtarthatod; a Chromium sandboxja bekapcsolva marad.
Az [angol telepítési útmutató](docs/bontaflowstack/INSTALL-WINDOWS.md) külön is elérhető.

### 1. Előfeltételek

- Windows x64, Codex Desktop és bejelentkezett Codex-fiók.
- Node.js **24 vagy újabb**, a hozzá tartozó npm-mel, a PATH-on.
- Codex CLI, amelyben van `plugin marketplace` és `plugin add` parancs.
- Internet a böngészőmotor npm-függőségei és a Chromium letöltéséhez.
  A 0.3.3-as motor forrásarchívuma már a csomagban van.
- Git csak Git-alapú projektmunkához kell; a ZIP telepítéséhez nem.

Normál Windows PowerShellben, a Desktopot használó Windows-fiókkal:

```powershell
node --version
npm.cmd --version
codex --version
codex --no-daemon plugin --help
```

**Elvárt:** Node 24+, működő npm, és a Codex pluginparancsainak súgója.
Az igazolt környezet Desktop `26.1007.2314.0`, CLI `0.162.0-alpha.17.2`.
Ez a ténylegesen vizsgált verziópár, nem bizonyított minimális követelmény.

Hiányzó Node esetén telepíts a [hivatalos oldalról](https://nodejs.org/en/download).
Hiányzó Codex CLI esetén az OpenAI
[hivatalos útmutatója](https://developers.openai.com/codex/cli/)
alapján használható:

```powershell
npm.cmd install -g @openai/codex@latest
```

Ezután nyisd újra a PowerShellt és a Codexet. Ne az alkalmazás gyorsítótárából
kimásolt `codex.exe`-t indítsd. Ha a CLI nem ismeri a pluginparancsokat vagy
a `--no-daemon` kapcsolót, előbb frissítsd.

### 2. Ellenőrzés és kibontás

A [GitHub Release oldalról](https://github.com/BillBalint-SM/bontaflowstack/releases/tag/v1.0.0)
töltsd le a két összetartozó fájlt:

- `BontaFlowStack-1.0.0.zip`
- `BontaFlowStack-1.0.0.zip.sha256`

Az alábbi példa a Letöltések mappával számol. Ha máshová mentetted őket,
csak a `$downloadDir` értékét módosítsd. A cél egy új, tartós könyvtár legyen.

```powershell
$downloadDir = Join-Path $env:USERPROFILE 'Downloads'
$archive = Join-Path $downloadDir 'BontaFlowStack-1.0.0.zip'
$checksum = "$archive.sha256"
$expected = ((Get-Content -LiteralPath $checksum -Raw).Trim() -split '\s+')[0]
if ($expected -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid checksum file.' }
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($actual -ine $expected) { throw 'Checksum mismatch. Stop installation.' }

$packageDir = Join-Path $env:USERPROFILE 'Tools/BontaFlowStack/1.0.0'
if (Test-Path -LiteralPath $packageDir) { throw 'Destination exists. Choose a new empty directory.' }
Unblock-File -LiteralPath $archive
Expand-Archive -LiteralPath $archive -DestinationPath $packageDir
Set-Location -LiteralPath $packageDir
```

**Elvárt:** nincs hiba; a kibontott mappában megtalálható a `README.md`,
a `TELEPITES.md`, a `.agents/plugins/marketplace.json` és a
`plugins/bontaflowstack` könyvtár. Eltérő ellenőrző összegnél ne folytasd.

A fenti nevű kiadási fájlokat használd. A GitHub automatikus „Source code”
archívuma fejlesztői forrás, nem a véglegesített telepítési csomag.

### 3. A plugin telepítése

**Első telepítésnél** ugyanabban a PowerShell-ablakban:

```powershell
codex --no-daemon plugin marketplace add $packageDir --json
if ($LASTEXITCODE -ne 0) { throw 'Marketplace registration failed.' }
codex --no-daemon plugin add bontaflowstack@bontaflowstack --json
if ($LASTEXITCODE -ne 0) { throw 'Plugin installation failed.' }
```

**Elvárt:** a telepítés eredményében `bontaflowstack@bontaflowstack`,
**1.0.0** és a telepített plugin könyvtára szerepel.
Ha a `bontaflowstack` marketplace már létezik, a lenti frissítési lépéseket használd.

A kibontott csomag könyvtárát tartsd meg: ez a regisztrált helyi forrás.

### 4. Betöltés és a böngészőmotor beállítása

1. Mentsd az aktív munkádat, majd teljesen lépj ki a Codex Desktopból és indítsd újra.
   Egy új üzenet önmagában nem cserélte le a már futó régi MCP-kapcsolatot.
2. A **saját projekted könyvtárában** nyiss chatet, ne a plugin kibontási könyvtárában.
3. Tartsd meg a választott jogosultsági profilt. Ha a Codex kéri,
   a normál plugin/MCP-kezelőben engedélyezd a `bfs-browser` kapcsolatot.
4. Küldd el:

```text
$bfs-router Állítsd be a BontaFlowStacket ehhez a projekthez, a böngésző-, render- és designképességekkel együtt. A telepített 1.0.0-s plugint használd.
```

**Elvárt:** a router a telepített plugin setupját futtatja `-WithEngines`
kapcsolóval. Ellenőrzi a mellékelt motorarchívumot, telepíti a rögzített
függőségeket és a Chromiumot, majd késznek jelzi a core és browser/render képességeket.
Várd meg a letöltések végét. A Desktopból futtatott beállítás ugyanannak a hostnak
az állapottárát használja, mint a plugin kapcsolata.

Csak tervezési/core használathoz hagyd el a böngésző/render/design kérést.
A core nem igényel npm-függőségeket.

A router megőrzi a meglévő projektutasításokat. Hiányzó issue-tracker- vagy
szakterületi forrásnál előbb kérdez, és csak a válasz alapján készíti el
a hiányzó projektútmutatót. A panel/chat preferenciakérdésnél válassz kedved szerint.
Az opcionális impeccable és Google DESIGN.md hiánya nem akadályozza az alap
böngésző-, render- és designmunkát.

Ha használni akarod a guard védelmét, a Codex `/hooks` felületén tekintsd át és
hagyd jóvá a **PreToolUse** és **Stop** hookokat.
A plugin telepítése önmagában nem ad nekik natív bizalmat.
[Részletes hookleírás](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)

### 5. Tényleges használat ellenőrzése

Ugyanabban a projektchatben:

```text
$bfs-browse A telepített plugin böngészőjével nyisd meg láthatóan a https://example.com oldalt. Előbb írd ki a kapcsolat verzióját, projektjét és jogosultsági állapotát. Olvasd vissza az oldal címét, majd állítsd le csak ennek a feladatnak a böngészőjét.
```

| Ellenőrzés | Elvárt, helyes eredmény |
| --- | --- |
| Plugin | 1.0.0 |
| Projekt | A Codexben kiválasztott projekt; `bindingSource=host-workspace` |
| Jogosultság | A választott profil nem változik; Full Access esetén a host `type=disabled` értéket ad |
| Motor | 0.3.3, browser ready |
| Valós használat | Látható böngésző, visszaolvasott Example Domain cím |
| Leállítás | A feladat saját böngészője bezárul, állapota stopped |

Hálózati hibát külön kell jelezni. A `doctor` vagy a fájlok megléte még nem
bizonyítja a böngészőindítást. Bejelentkezésnél kérj látható átadást, te írd be
az adatokat, majd kérd a folytatást.

A projektkönyvtáron kívüli útvonalhoz külön, tényleges hostjóváhagyás kell.
A nem támogatott vagy elutasított jóváhagyás nem ad hozzáférést.

### Frissítés és visszaállítás

Bontsd ki az új, ellenőrzött csomagot új verziókönyvtárba. A `$packageDir`
változóban annak abszolút útvonala legyen. A régi könyvtárat és a szükséges
[helyi adatokat](docs/bontaflowstack/LOCAL-DATA.md) őrizd meg.

Csak a BFS regisztrációját cseréld:

```powershell
codex --no-daemon plugin marketplace remove bontaflowstack
if ($LASTEXITCODE -ne 0) { throw 'Could not remove the old BFS marketplace registration.' }
codex --no-daemon plugin marketplace add $packageDir --json
if ($LASTEXITCODE -ne 0) { throw 'Could not register the selected BFS directory.' }
codex --no-daemon plugin add bontaflowstack@bontaflowstack --json
if ($LASTEXITCODE -ne 0) { throw 'Could not install the selected BFS version.' }
```

Ezután teljes Desktop-kilépés/újraindítás és verzióellenőrzés következik.
Változó motorverziónál kérd újra a motor beállítását a Desktopból.

Visszaállításhoz ugyanezt a regisztrációs/telepítési sorrendet használd a korábbi,
ellenőrzött könyvtárral. A régebbi verzió ismert hibái is visszatérhetnek:
a 0.7.3/0.7.4 nem tartalmazza ezt az igazolt Full Access Desktop-javítást.

### Gyakori elakadások

| Jelenség | Teendő |
| --- | --- |
| Nincs `node` vagy `codex` | Telepítsd az előfeltételt, nyisd újra az alkalmazásokat, ellenőrizd a fenti verzióparancsokkal. |
| `no complete local package` CLI-hiba | Használd a fenti `--no-daemon` parancsokat vagy a teljes standalone CLI-t. |
| Már létező marketplace | A BFS-re korlátozott frissítési sorrendet használd. |
| Még mindig régi verzió látszik | A telepítés eredményét ellenőrizd, majd ténylegesen lépj ki a Desktopból és indítsd újra. |
| `project=null` vagy jóváhagyási hiba | Nyisd meg a valós projektet; ellenőrizd a 1.0.0 verziót és a host workspace-adatát. Ne válts profilt kerülőútként. |
| Terminálban van motor, Desktopban nincs | A telepített routerrel a Desktopból futtasd a setupot; a Windows alkalmazáscsomag más LOCALAPPDATA-helyet használhat. |
| Egyedi `BFS_STATE_HOME` | A Desktop és a telepítő ugyanazt az értéket örökölje. Alapesetben hagyd beállítatlanul. |
| Hiányzik a böngészőeszköz | Engedélyezd a plugin MCP-kapcsolatát a Codex normál felületén. |
| `CreateWindowStationW` | A csomag host MCP-kapcsolatát használd, ne shellből indított helyettesítőt. A sandboxot hagyd bekapcsolva; őrizd meg a pontos hibát, ha az MCP-út is elbukik. |
| Checksumeltérés | Állj meg, kérd le újra a ZIP-et és a hozzá tartozó ellenőrző összeget. |
| npm/Chromium letöltési hiba | A jelzett hálózati/proxyhibát rendezd, majd ismételd a telepítőt. Offline böngészőbináris nincs a ZIP-ben. |

Eltávolításhoz a Codex plugin-kezelőjét használd. A helyi memória, checkpointok,
böngészőadatok és motorok megmaradnak; mentésüket és célzott törlésüket a
[helyi adatok útmutatója](docs/bontaflowstack/LOCAL-DATA.md) írja le.

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
