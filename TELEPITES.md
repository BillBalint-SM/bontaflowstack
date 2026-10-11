# BontaFlowStack 1.0.0 — telepítés Windowsra

[English guide](docs/bontaflowstack/INSTALL-WINDOWS.md) ·
[Kiadási bizonyítékok](docs/bontaflowstack/RELEASE-1.0.0.md)

Ez az útmutató az **1.0.0-s ZIP-csomaghoz** készült. Nem igényel fejlesztői
checkoutot, személyes gépútvonalat vagy korábbi BFS-telepítést.
A Codex saját jogosultsági profilját megtarthatod. Az 1.0.0 a Full Access alatt
igazolt 0.7.5 működését viszi tovább: csak a verziójelölés és a felhasználói
dokumentáció változott. A korábbi gyakorlati bizonyíték eredeti verzióját
megőriztük; új 1.0.0 Desktop-próbát nem állítunk. A Chromium sandboxja bekapcsolva marad.

## 1. Előfeltételek

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

## 2. Ellenőrzés és kibontás

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

## 3. A plugin telepítése

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

## 4. Betöltés és a böngészőmotor beállítása

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

## 5. Tényleges használat ellenőrzése

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

## Frissítés és visszaállítás

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

## Gyakori elakadások

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

