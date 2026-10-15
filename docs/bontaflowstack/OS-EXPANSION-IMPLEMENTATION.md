# Issue #6: Linux/macOS megvalósítási napló

Dátum: 2026-10-14. Alap: [issue #6](https://github.com/BillBalint-SM/bontaflowstack/issues/6).
Felhasználói elfogadás: „Rendben, kezdd el a #6 issue megvalósítását a specifikáció
szerinti sorrendben. A meglévő Windows-működést őrizd meg, és a Linux-támogatás
ne legyen Ubuntuhoz kötve.”

**Állapot: hat közös kódszelet megvalósítva; az issue nincs kész.**
Nincs teljes Linux/Mac támogatási vagy natív hostelfogadási állítás.
A helyi npm-jelölt Linux/macOS x64/ARM64 célokat is elfogad; Windows x64 megmarad.
Ez fejlesztési állapot, nem publikált vagy minden hoston natívan elfogadott támogatás.

## OS01: kiindulópont és elérhető környezetek

- BFS-forrás: `c9057d67c662a9d740eaec70403bf68044a97648`; külön helyi clone,
  `codex/linux-macos` branch. A régi workbook checkout és korábbi módosításai megőrzöttek.
- Engine publikus main: `e7abcaf0ae9d3e997e95a46dffd87fa77fcf86b8`, verzió `0.3.2`.
  Külön olvasott clone; termékkódja ebben a szeletben nem változott.
- A BFS beágyazott `0.3.3` source ZIP hash-e a lockkal egyezett:
  `f48d62c878894d537e163aa4ac1864495f4b167573fe6eb1f8e7067cda6b61a9`.
  `src/host-browser.mjs` van a ZIP-ben, de nincs a publikus engine mainben.
  OS05-ben a checksumhoz kötött 0.3.3 tartalom és a publikus engine-forrás
  különbségét kell megőrzött forrásként rendezni, nem a régebbi engine-t bemásolni.
- Windows x64: helyi Node `26`; a forrás Node 24+ követelménye teljesül.
- Linux: WSL Ubuntu **26.04 LTS**, `x86_64`. Külön, a munkához letöltött
  Linux Node **24.21.0**, a Node hivatalos SHASUMS256 alapján ellenőrzött archívumból.
  A runtime workspace-local; nincs globális Node/npm telepítési módosítás.
- DISPLAY és WAYLAND_DISPLAY jelenléte megfigyelve; ez önmagában nem
  látható browser/handoff bizonyíték. Azok nem futottak.
- Docker CLI elérhető, a Linux daemon pipe-jához kapcsolódás nem sikerült.
  Fedora/Arch/Alpine container-próba nem futott; nem bizonyítja e disztribúciók hibáját.
- Felhasználói válasz: **jelenleg nincs elérhető Mac**. ARM64/Intel Mac és
  Linux ARM64 natív futási bizonyíték nincs. Ez a közös kód folytatását nem akadályozza.

### Upstream hostleltár: dokumentáció/metaadat, nem futási bizonyíték

2026-10-14-én olvasott npm registry stable verziók; nem automatikus frissítési döntések:

| Host | Olvasott verzió | Vizsgált platformforrás |
| --- | --- | --- |
| Codex CLI | 0.162.1 | npm optional csomagok Linux/Darwin x64/ARM64; [hivatalos CLI-út](https://developers.openai.com/codex/cli) és rust-v0.162.1 release assetleltár |
| Claude Code CLI | 2.1.299 | npm Linux/Darwin x64/ARM64 és Linux musl csomagok; [setup](https://code.claude.com/docs/en/setup) külön musl-feltételekkel |
| Gemini CLI | 0.64.0 | Node >=20 registry-feltétel, [hivatalos npm és Mac/Linux telepítés](https://geminicli.com/docs/get-started/installation/); ARM64 natív próba még hiányzik |
| GitHub Copilot CLI | 1.0.97 | npm Linux/Darwin x64/ARM64 és Linux musl csomagok; [hivatalos install](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli) |
| Cursor IDE | A BFS jelenlegi minimuma 3.24.12 | [Letöltési oldal](https://cursor.com/download) Mac x64/ARM64/Universal, Linux x64/ARM64 deb/rpm/AppImage; natív POSIX IDE-verzió még nincs megmérve |
| OpenCode CLI | 1.19.0 | npm Linux/Darwin x64/ARM64, Linux musl/baseline csomagok; BFS V1 API megőrzendő |

Codex Desktop külön OS/arch/verzióleltára, a distro-image digestek és a nem helyi
gépek továbbra is OS01 nyitott tételei. A CLI-leltár nem Desktop-bizonyíték.

## Első implementációs szelet

### OS02 rész: közös útvonal és privát state-létrehozás

- `core/state.mjs`: `dataPaths` közös alapérték a setup és runtime számára.
  Linux XDG_DATA_HOME/XDG_STATE_HOME, Mac Application Support, Windows meglévő
  LOCALAPPDATA út. Üres/relatív XDG fallback. Az explicit relatív BFS_STATE_HOME hibás.
- Override → ellenőrzött install pin → native default prioritás megmarad;
  a telepítő ownership/default döntése a meglévő szerződés szerint működik.
- Új saját state- és call/browser-munkakönyvtár 0700, privát fájl 0600;
  meglévő idegen könyvtár jogosultsága nem módosul. Windows mode-kezelés változatlan.
- State/core/reliability, setup és install-pin tesztek érintve. A POSIX módok
  ellenőrzése Linux `/tmp` fixture-ben történt, nem Windows mounted FS jogosultságain.
- Nyitott: Mac case-sensitive/insensitive és rendszeraliasok, teljes setup/motor
  útvonal-összhang (OS05/06), új OS/arch payload-elkülönítés. OS02 egészében még nem PASS.

### OS03 rész: Cursor POSIX-layout felismerés

- Linux PATH-ból feloldott `cursor` executable, symlink realpath és
  resources/app metadata; Mac app-bundle Resources/app metadata felismerése.
- A setup átadja a saját platformját a felderítőnek; Windows felismerési út megőrzött.
- Windows és Linux fixture-próba külön teszteli a két POSIX-layoutot.
  A Mac layout itt szintetikus, nem futási Mac-elfogadás.
- Nyitott: a többi CLI POSIX-felderítése, Mac GUI Node-indítás,
  a hat adapter tényleges natív regisztrációja és Cursor POSIX hookgenerálása.

### OS04 rész: shell és Codex POSIX hookparancs

- Ismeretlen/sh/zsh/fish shell nem kaphat hallgatólagos PowerShell/Bash
  ellenőrzött döntést; guard warnings esetén emberi ellenőrzést kér.
  Windows meg nem nevezett alap-PowerShell útja megmaradt; explicit Bash megmaradt.
- Codex `command` Node POSIX belépő, `commandWindows` eredeti Windows launcher.
  Stdin/stdout, context marker és Stop/interrupted működés ellenőrzött Linux shellből.
- Ez valódi Linux-folyamatpróba kontrollált hosteseménnyel; nem tényleges
  Codex-sessionből megfigyelt natív hookbetöltés. A hostelfogadás nyitott.

## TDD és végrehajtott ellenőrzések

Megfigyelt kezdeti eltérések: Windows relatív state-root nem dobott hibát;
Linux call-binding könyvtár 0755 volt 0700 helyett; ismeretlen shell git status
parancsa nem kért ellenőrzést; POSIX Cursor felismerés LOCALAPPDATA hiányán
elbukott; Codex POSIX hookparancs Windows launchert tartalmazott.
Ezekhez a célzott teszt sikertelen volt a megfelelő javítás előtt, majd sikeres.
A Linux alapútvonal/jogosultság első futása runtime-elérési setuphibán állt meg;
az nem viselkedési RED. Linux alapútvonal később GREEN, nem utólag kitalált RED.
A POSIX Stop teszt első GREEN-körében a teszt rossz resume-mezőt olvasott;
ez teszthiba volt, a meglévő publikus `steps` mezőre javítva.

| Ellenőrzés | Megfigyelt eredmény | Határ |
| --- | --- | --- |
| Windows `node --test tests/core.test.mjs tests/reliability.test.mjs tests/npm-setup.test.mjs` | 67 PASS, 1 POSIX skip, 0 FAIL | Első útvonalváltozás regressziója |
| Windows `node --test tests/core.test.mjs tests/reliability.test.mjs tests/npm-setup.test.mjs tests/claude-host.test.mjs tests/copilot-host.test.mjs tests/browser-host.test.mjs` | 94 PASS, 2 POSIX skip, 0 FAIL | State/private folder/guard/Codex-hook/Cursor változások; hostesemény- és browser szerződésfixture-k, nem teljes modellút |
| Windows `node --test --test-name-pattern='Cursor discovery reads native POSIX\|Cursor setup' tests/npm-setup.test.mjs` | 3/3 PASS | Utolsó platform-argumentum továbbadás után ismételt affected Cursor-próba |
| Linux Node24 `--test-name-pattern='POSIX hook commands\|guard does not certify\|state roots\|private state\|memory\|workflow' tests/core.test.mjs` | 12/12 PASS | Natív Linux filesystem/core/process határ; kontrollált hookesemény |
| Linux Node24 `--test-name-pattern='Cursor discovery reads native POSIX' tests/npm-setup.test.mjs` | 1/1 PASS | POSIX filesystem-layout fixture |
| Windows és Linux `node tests/install-state.test.mjs` | Mindkettő self-check PASS | Native fallback, pin/override precedence, malformed/relative/wrong-schema elutasítás |
| Clone `git diff --check` | PASS az ellenőrzéskor | Diff formátum, nem viselkedési teszt |

Windows logok: `.tmp/os02-windows.log`, `.tmp/os02-final-windows.log`,
`.tmp/os03-cursor.log`. Install-state gépi evidence a `.tmp/install-state-*/result.json`
fájlokban. Linux célzott futások kimenete a feladat tool-trace-ében.

## Folytatási pont és korlátok

1. OS01: a bundled 0.3.3 engine-forrás különbségeinek követett helyi rendezése;
   distro-környezetek és natív hostverziók pontosítása, Desktop külön leltár.
2. OS02: a közös defaults motorinstallerhez kötése és POSIX OS/arch payload-layout.
3. OS03/04: a többi CLI POSIX-felderítése, platformhelyes generált hookok,
   Mac GUI runtime-pinning, natív regisztráció.
4. OS05/06: közös Node engine build/install, target manifest/Impeccable,
   részleges core setup és doctor; csak együtt lazuljon a Windows-only npm-kapu.
5. OS07–10: három-OS/distro/CPU próbák, natív feladatút, handoff és támogatási mátrix.

Mac, Linux ARM64, Fedora/Arch/Alpine, teljes npm POSIX setup, engine install,
látható browser/handoff és valódi Linux/Mac host/modellsession nem lett tesztelve.
Ezek nincsenek készre jelentve. Nincs disztribúció allowlist a most hozzáadott core-ban.
Nem történt commit/push, új issue-komment, kiadás, globális hostkonfiguráció vagy sudo.

## Második szelet: hostfelderítés és engine-port

### OS03: a megmaradt POSIX CLI-keresés

- Mind az öt CLI-hosthoz natív, végrehajtható jelöltek keresése a saját home
  `.local/bin`, OpenCode-nál `.opencode/bin`, majd PATH könyvtáraiban.
  POSIX-on nincs `.exe`, APPDATA vagy LOCALAPPDATA követelmény.
  Hibás verzióválaszt nem fogad el a felderítő; a következő jelöltet próbálja.
- Meglévő Codex/Claude/Gemini/Copilot/OpenCode regisztrációs protokoll és
  minimumverzió használata marad. A Windows jelöltlista és Store legacy-felderítés megmaradt.
- POSIX install-payload: `versions/<platform>-<arch>/<version>`; a Windows
  meglévő `versions/<version>` útja változatlan. Impeccable platformcsomag és
  végrehajtható fájl szintén OS/arch szerint választott, külön POSIX tool-rootban.
- Setup helper, npm-platformmezők, csomagtesztek és help összehangolva.
  A Mac home a setupnak átadott abszolút HOME alapján izolálható; a Windows
  alapútvonal és a már ellenőrzött pin/override szabály változatlan.
- Az öt CLI mindkét POSIX platformágban eljutott saját regisztrációs
  protokolljáig kontrollált CLI-válasszal. Codex/Claude mock-regisztráció és
  ismétlés is végigfutott. **Ez nem valódi natív host/modellsession bizonyíték.**
- Még nyitott: Mac GUI Node-felderítés, Gemini/Cursor platformhelyes hookgenerálás,
  és a teljes natív portelfogadás. A Mac hiánya a közös kódot nem állította meg.

### OS05: közös Node-build és installer

- Az engine clone forrása a checksum-ellenőrzött bundled 0.3.3 tartalmára
  lett helyreállítva; a régebbi publikus 0.3.2 nem írta felül a browser-host belépőt.
  `SOURCE-PROVENANCE.json` őrzi a BFS commitot és az eredeti ZIP hashét.
- Helyi **0.3.4 engine-jelölt**, új `scripts/build.mjs`: rögzített npm lock,
  platformhelyes npm-hívás és Chromium install; sandboxolt headless launch
  a manifest generálása előtt. A manifest a tényleges OS/arch értékét írja.
- Engine `build.ps1` és plugin `install-engines.ps1` vékony kompatibilitási
  belépő lett, meglévő Windows-paraméterekkel. A közös installer Node-ban fut.
- A ZIP-kezelés Node standard-library kód: stored/deflate, CRC-ellenőrzés,
  512 MiB és 10 000 bejegyzés korlát, útvonalkilépés/link/speciális fájl,
  duplikáció/file-directory konfliktus és nem hordozható név elutasítás.
  ZIP64/encryption nem támogatott; a kiválasztott archívum nem igényli őket.
  Az összes tartalom ellenőrzése írás és forrásfuttatás előtt történik.
- Egyedi staging, sikertelen stage megőrzése, manifest/component hash és
  platform ellenőrzése promotion előtt; csak utána végleges regisztráció.
  `verifyEngine` a már meglévő register-validációt osztja meg az installerrel.
- Windows engine-root forma megmaradt; POSIX engine-root OS/arch suffixet kapott.
  A két telepítő ugyanazt a core context/pin/default adatútvonalat használja.
- Új bundled source ZIP és lock, SHA-256:
  `1a9969bed342adc00e6aae073640f5968eafd048c3aba80e2d9f4a03054994c5`.
  A régi ZIP csak a munkabranch csomagjából került ki; Git-előzményben és az
  ellenőrzött baseline-copyban megmaradt. Telepített felhasználói adatot nem töröltünk.
- Mindkét OS-en a **tényleges új archívumból** végigfutott a Node install/build,
  sandboxos launch, manifestellenőrzés és izolált engine-regisztráció.
  A design-detect az engine-only fixture-ben nem ready, mert ott nincs Impeccable;
  teljes natív Impeccable CSS-feladatút ebben a körben nem lett állítva.

### Valódi Linux-korlát és a teszt feltételei

WSL Ubuntu 26.04, x64, glibc 2.43, UID 1000. Az első browser-próba a rendszerből
hiányzó `libnspr4.so`, `libnss3.so`/`libnssutil3.so` és `libasound.so.2` miatt hibázott.
A csomagok az OS konfigurált repositoryjából **letöltve és saját tesztkönyvtárba
kibontva** kerültek be; nem történt rendszertelepítés, root/sudo vagy sandbox-kikapcsolás.
Verziók: libnspr4 `2:4.38.2-1ubuntu1`, libnss3 `2:3.120-1ubuntu2.1`,
libasound2t64 `1.2.15.3-1ubuntu1.1`.

A sikeres Linux browser/render/build/install eredmény kifejezett
`LD_LIBRARY_PATH`-ot használt a saját `prerequisites/libraries/usr/lib/x86_64-linux-gnu`
könyvtárhoz. A könyvtárak nélkül a rendszer továbbra is hiányos. Ez nem
általános distro-támogatási bizonyíték; a termék telepítője nem hív aptot,
és nincs Ubuntu-allowlist vagy automatikus rendszerfüggőség-telepítés.

### Második szelet ellenőrzései

| Ellenőrzés | Megfigyelt eredmény és határ |
| --- | --- |
| Windows `node scripts/check.mjs` | **162 PASS, 2 POSIX skip, 0 FAIL**, 34 skill. A source checker a canonical manifest 1.0.0 címkéjét írja ki; az npm-builder saját 1.2.0 címkézése külön csomagtesztben ellenőrzött, nem visszaállított kiadás. |
| Windows setup/core/install-state/Node installer/ZIP fókuszkör | 68 PASS, 2 POSIX skip, 0 FAIL. |
| Windows npm pack + browser-host package + Node installer/ZIP | 7/7 PASS; tényleges csomag bytes/inventory és új engine lock. |
| Windows kompatibilitási PS installer és Node failure/retry | 5/5 PASS; checksum/unsafe archive hibák forrásfuttatás előtt, first build 17, retry és megőrzött failed stage. |
| Linux POSIX setup/protocol és Node installer/ZIP | 5/5 PASS; valódi Linux process/filesystem, kontrollált CLI-protokoll és buildhiba-fixture. A darwin ág itt szintetikus. |
| Windows engine browser/design | 5/5 PASS, valódi sandboxolt Chromium és helyi fixture. |
| Linux engine browser/design, hiányzó rendszerkönyvtárakkal | 4 PASS, 1 FAIL; a browser loaderhiba miatt. |
| Linux engine browser/design, saját library-példányokkal | 5/5 PASS, sandbox bekapcsolva. |
| Windows és Linux `tests/render.integration.test.mjs` | Mindkettő 1/1 PASS; valódi sandboxolt render, 640×480 PNG és PDF. Az első testparancsban megadott `render.test.mjs` nem létezett és nem adott render-bizonyítékot; ezt az új tényleges integration test pótolta. |
| Native source archive Node install, Windows és Linux | Mindkettő exit 0, 0.3.4 regisztrálva. Linuxon a fent megnevezett saját library-envvel. |

A browser-test neve „actual handoff”-ot említ, de ebben a futásban automatizált
fixture-átadás történt. Tényleges emberi belépést vagy natív modellből indított
handoff/resume-t ez nem igazol. Mac, ARM64 és más Linux disztribúció nem futott.

Logok a BFS clone `.tmp/` könyvtárában: `os05-full-windows.log`,
`os05-windows.log`, `os05-package-windows.log`, `os05-installer-final-windows.log`,
`os05-posix-boundary-linux.log`, `native-engine-install-windows.log`,
`native-engine-install-linux.log`. Engine Linux tesztlogok és saját library-példányok
a külön `issue-6-engines-linux` fixture-ben; Windows engine-logok az engine cloneban.

### Második szelet végén nyitott határ

OS06 még nyitott: motorhiba mellett regisztrálható core és hiányos setup/doctor
státusz; a jelen setup továbbra is a motorokat készíti elő a hostregisztráció előtt.
Natív Impeccable-feladatút, Mac GUI runtime-pinning, Gemini/Cursor POSIX hookok,
Fedora/Arch/Alpine és ARM64, natív hostmodellút és emberi handoff, CI és végleges
támogatási dokumentáció továbbra is az issue hátralévő része.

Nem történt commit/push, publikálás, issue-komment vagy globális hostkonfiguráció.
Az engine forrásában a jelölt csomag készítéséhez explicit staging történt;
a jelölt nincs kiadva.

## Harmadik szelet — OS06 core-regisztráció és setup/doctor

Elfogadott kérés: „engine-hiba mellett is működjön a core-regisztráció, és
legyenek pontos setup/doctor státuszok”, Windows-megőrzéssel és Ubuntu-kötés nélkül.
Hatókör: R08/R11, A17/A18 közös setup/doctor viselkedése; a teljes OS06 és a
natív host/session elfogadás ettől még nincs készre jelentve.

### Megvalósított működés

- Sorrend: payload/preflight és saját tartós másolat/state-pin ellenőrzése →
  hostregisztráció és readback → Impeccable és bundled engine → összegzés.
  Sérült saját adapter vagy idegen config továbbra is a regisztráció előtt
  elutasított; engine-hiba már nem törli vagy akadályozza a valid core regisztrációját.
- Az Impeccable és a bundled engine hibái külön kezeltek: az egyik hibája
  mellett a másik telepítése is megpróbálható. Sikertelen telepítés után a
  megőrzött stage/config helye az eredeti hibaüzenetben marad; nincs automatikus törlés.
- A setup eredménye és `setup-status.json` additív mezőket kapott: `status`,
  `core`, `platform`, `arch`, Linuxon `libc`, `capabilities`, engine-issues és
  `nextAction`. A korábbi host/readback/reload mezők megmaradtak.
- Core-regisztráció és engine-hiány esetén `status: incomplete`, `exitCode: 1`;
  a tényleges CLI is 1-gyel lép ki. A jelentésben a host regisztrált marad,
  a hibás motor külön fázist, konkrét okot és azonos verziójú setup retry-parancsot kap.
  A `phase: complete` a setup-futás befejezését jelenti, nem teljes telepítési sikert.
- A doctor továbbra is csak a kért skill/mód szükségleteit blokkolja. Motor nélkül
  a core doctor 0-val, a browser doctor 1-gyel tér vissza; utóbbi `unavailable`
  capability-t, konkrét okot és javítási lépést ad. Hiányzó natív guard-hook
  `unverified`, saját hostesemény-ellenőrzési következő lépéssel.
- Engine-status `ready` a komponensfájlok és konfiguráció ellenőrzésének határa;
  ezt a `verified` mező neve kimondja. A runtime külön `unverified`, mert a doctor
  nem indít Chromiumot vagy külső design motort. Hiányzó külső design eszköznél
  a következő lépés a megfelelő environment-konfiguráció, nem egy azt nem telepítő setup.
- Érvénytelen/hiányzó doctor-válasz nem lehet siker: setup incomplete,
  capability-k unverified. A Linux libc glibc csak a tényleges Node report
  `glibcVersionRuntime` adata esetén; egyébként unknown. Nincs distro-allowlist,
  package-manager hívás, root/sudo vagy sandbox-kikapcsolás.

### Ellenőrzés és bizonyítékhatár

Kezdeti viselkedési RED: két célzott teszt exit 1; engine-hibánál a setup a
hostregisztráció előtt megállt, a doctorból hiányzott az új státusz/diagnosztika.
Ugyanezek a módosítás után 2/2 PASS. Ez tényleges viselkedési eltérés volt,
nem import- vagy tesztkörnyezeti hiba.

| Ellenőrzés | Megfigyelt eredmény |
| --- | --- |
| Windows setup suite | 32/32 PASS; Impeccable-hiány/hiba, módosított tool megőrzése, engine-failure/retry, állapot és adapter megőrzése, korábbi rollback/config/integrity esetek. |
| Linux célzott setup/doctor | 6/6 PASS; POSIX setup, hiányos telepítés/retry, Impeccable önálló hiba, invalid doctor és tényleges CLI-kilépés. |
| Végső Windows és Linux fókuszkör | Mindkettő 3/3 PASS; engine-status határa, core/browser doctor és a tényleges setup CLI + memória-listázás. |
| Teljes Windows checker | 166 PASS, 2 POSIX skip, 0 FAIL, 168 teszt; a lezáró stderr-pontosítás előtti kódon. |

A lezáró felülvizsgálatban új viselkedési RED igazolta, hogy az engine CLI hibája
a progressbe még csak `node.exe failed (1). See the command output above.`
üzenettel került. A setup most begyűjti az installer kimenetét: sikernél kiírja,
hibánál a konkrét stderr megmarad az engine-issue okában. A checksum-hiba saját
progressben visszaolvasott oka is ellenőrzött. A végleges módosításra külön
Windows/Linux setup-fókuszkör futott; teljes checker ismétlése ehhez az utolsó,
kimenetkezelést érintő javításhoz nem történt.
Mindkét végső fókuszkör **6/6 PASS**, 0 FAIL; a telepítési sorrend, önálló
Impeccable-hiba, engine failure/retry, invalid doctor és konkrét CLI/progress-hiba ellenőrzött.

A CLI-próba a generált npm-payload saját izolált másolatából valódi Node/setup/
engine-installer/doctor/memory folyamatokat futtatott. A saját source-checksum
szándékosan hibás volt: a source nem futott; setup exit 1, host-fixture regisztrált,
core doctor és `memory list` exit 0, browser doctor exit 1. A host CLI **kontrollált
helyi fixture**, nem valódi Codex-modellsession. A többi host/protokoll és engine
előfeltétel több tesztben mock; ezek natív hostműködést nem bizonyítanak.
Az ebben a körben futtatott Linux-próbák nem igényeltek Chromium library-pótlást,
mert checksum-hibát/core-t ellenőriztek, nem browser-launchot.

Az első teljes Windows-futásban 163 PASS, 2 POSIX skip és 3 FAIL volt: három
korábbi teszt még a most felváltott „engine előbb, hiba előtt nincs regisztráció”
szerződést várta. Ezek elvárását R08 új sorrendjére és a megmaradó core-ra
állítottuk, megtartva a config/állomány-megőrzés és retry ellenőrzését.

Logok: `.tmp/os06-full-windows.log` (első kör), `.tmp/os06-setup-windows.log`,
`.tmp/os06-linux.log`, `.tmp/os06-final-focus-windows.log`,
`.tmp/os06-final-focus-linux.log`, `.tmp/os06-full-windows-final.log` (végső checker).
Az utolsó stderr-javítás logjai: `.tmp/os06-captured-errors-windows.log` és
`.tmp/os06-captured-errors-linux.log`.
Felülvizsgált fájlok/hash-ek: `.tmp/os06-reviewed-files.json`.

Standards-felülvizsgálat: PASS a kért közös kód határán; payload/integrity
regisztráció előtti elutasítás, engine-hiba elkülönítése, meglévő hostállapot,
fájlok és config megőrzése végigkövetett. Spec-felülvizsgálat: PASS a közös
setup/doctor viselkedésre, a fenti fixture/funkcionális határokkal. A két passzt
ugyanaz az agent végezte; független reviewer nincs állítva.

Mac/ARM64, más Linux-disztribúció, grafikus session/handoff és teljes natív
hostmodellút ebben a körben nem tesztelt. Mac GUI runtime-pinning és Gemini/Cursor
POSIX hookok, OS07/08 CI/distro/hardware munka, OS09 natív elfogadás és OS10
végleges dokumentáció továbbra is nyitott. Nincs commit/push vagy publikálás;
a #6 nincs lezárva.

## Negyedik szelet — Gemini/Cursor POSIX hook és Mac GUI Node

Elfogadott kérés: Gemini/Cursor POSIX hookok és Mac GUI Node-felderítés,
Windows-megőrzéssel, Ubuntu-kötés nélkül; a Mac hiánya nem állíthatja meg a közös kódot.
R05/R06, OS03/OS04 közös megvalósítás; a natív Mac-elfogadás továbbra is nyitott.

### Megvalósítás és megőrzött határ

- A standard npm setup saját stagingjében készülnek a platformhelyes JSON-ok.
  A publikus csomag nem tartalmaz gépspecifikus Node-elérési utat. A módosított
  JSON byte/hash az elvárt inventory része: staging, ismétlés, source-copy és
  natív host-readback ugyanazt a materializált payloadot ellenőrzi.
  Idegen hostkonfiguráció és engedély/trust változatlan.
- Gemini POSIX hook: shell-literal módon idézett abszolút Node és a tartós,
  verziózott canonical Gemini hookfájl. Nem hagyatkozik a host által shellszövegbe
  behelyettesített extension-path idézésére; aposztróf/dollár/szóköz út is próbált.
  A hook canonical fájlt használ, a host pedig ellenőrzött saját extension-copyt;
  mindkettő ugyanazt a pinned state-et és session/workspace kötést használja.
- Cursor POSIX hook: abszolút Node és idézett `$CURSOR_PLUGIN_ROOT` script-útvonal.
  Eseménynevek, timeout, stdin/stdout szerződés és `preToolUse.failClosed` megmaradt.
  A Windows EncodedCommand/here-string hookparancsok nem változtak.
- Node-kiválasztás: a setup már futó `process.execPath` értéke; a meglévő
  Node 24+ preflight igazolja ennek aktuális process-verzióját. Nincs találgatott
  Homebrew/nvm út, login-shell/profile futtatás vagy globális Node-telepítés.
  Gemini/Cursor POSIX MCP-je és hookja ezt az abszolút Node-ot használja;
  Macen a Codex MCP és POSIX hook is ezt kapja. A GUI-nak ehhez nem kell Node a PATH-ban.
  A setup-result/progress `runtime` mezője a kiválasztott utat és a futó verziót
  mutatja, de a natív GUI-session státusza explicit `unverified`.
- Cursor Mac saját `~/Applications` discovery és profil-elhelyezés az adott HOME
  értéket is figyelembe veszi. A Windows USERPROFILE-prioritás megmaradt.
- A Gemini POSIX shell-eseménye Bash-ként megy a meglévő parserhez. Ennek alapja
  a [hivatalos Gemini shell-szerződés](https://geminicli.com/docs/tools/shell/):
  Windows PowerShell, más platform Bash. Ez forrásállítás; nem natív Gemini-session próba.
- Cursor POSIX Shell input nem igazolja a konkrét nyelvtant, ezért `unknown`
  a shell és a meglévő generic command inspector az út. Bekapcsolt guard warnings
  mellett pontos pending jóváhagyás kell, nincs PowerShell-fallback vagy csendes allow.
  A [Cursor hook-leírás](https://cursor.com/docs/hooks) szerint a preToolUse ask
  nincs érvényesítve; a meglévő BFS guard eleve deny + pending-ID választ ad,
  és ez a válasz megmarad. A tényleges emberi jóváhagyási UI nem futott itt.
- Egy Windows-próba `git $args` esetén reprodukált egy meglévő parser-hiányt:
  nem jelzett ellenőrzési igényt. A PowerShell AST most változó- vagy
  subexpression jelenléténél nem ad valid literal-parser eredményt; a meglévő
  guard pending jóváhagyási útja kezeli. `git log --oneline` változatlanul
  átmegy a parseren. Ez a két dinamikus AST-forma ellenőrzött, nem teljes PowerShell audit.

### Bizonyíték

Kezdeti setup viselkedési RED: 2 FAIL — a Gemini POSIX payloadban PowerShell
parancs maradt, a Mac GUI MCP command pedig még PATH-beli `node` volt.
Ugyanaz a két eset a materializálás után 2/2 PASS. Külön Linux Cursor RED
igazolta, hogy az ismeretlen POSIX shell nem kapta meg az elvárt ellenőrzési
igényt. Külön Windows Gemini RED a fenti `git $args` inputra; a parser-fix után PASS.

| Kör | Megfigyelt eredmény és határ |
| --- | --- |
| Windows setup célzott materializálás | 2/2 PASS; Linux/darwin ágak kontrollált host CLI-vel, ismétlés/source-copy és GUI Node-pin. Windows alatt ezek nem POSIX shell-folyamatok. |
| Linux setup + shell-guard célzott kör | 4/4 PASS. A generált Gemini/Cursor hookok `/bin/sh` folyamatból, PATH üresen indultak; a konfigurált MCP command/args szintén PATH nélkül. Natív hook fixture-input → egyszer használatos `_bfsCall` → tényleges Node JSON-RPC process → helyes hostWorkspace readback. Darwin ág Linuxon szimulált. |
| Linux Gemini/Cursor host-tesztsor | 8/8 PASS; session/workspace/replay kötés, memória/lifecycle/interruption és guard. Kontrollált hook/RPC események, nem host-modellsession. |
| Windows teljes `node scripts/check.mjs` | 168 PASS, 2 POSIX skip, 0 FAIL; 170 teszt. A külön új PowerShell-parser unit-eset még nem volt ebben a futásban; az alábbi végső fókuszkör tartalmazza. |
| Végső Windows PowerShell-parser + Gemini/Cursor guard | 3/3 PASS; változó és subexpression ask/pending, literál parser-siker és adapter-válasz. |

Logok: `.tmp/os03-runtime-setup-windows.log`, `.tmp/os03-posix-red-linux.log`,
`.tmp/os03-runtime-hooks-linux.log`, `.tmp/os03-hosts-linux.log`,
`.tmp/os03-full-windows.log`, `.tmp/os03-guard-final-windows.log`.
Az első Windows adapterkör `.tmp/os03-hooks-windows.log` fájljában a dinamikus
PowerShell input még hibázott; a végső parser-próba ezt az esetet már ellenőrzi.
Felülvizsgált fájl/hash-leltár: `.tmp/os03-reviewed-files.json`.

Standards: PASS a fenti közös diff határán — saját staging/inventory, idézés,
forrás- és configmegőrzés, callback és consumer út végigkövetve. Spec: PASS a
kért közös materializálás/pinning/shell-routing viselkedésre; Mac GUI és natív
hostsession elfogadása nincs állítva. A két passzt ugyanaz az agent végezte.

### Nyitott ellenőrzés és runtime-feltétel

A rögzített Node-binárisnak a konfigurált abszolút útvonalon rendelkezésre kell
állnia. Eltávolítása/áthelyezése vagy verziókezelő miatti megváltozott Node-path
nem automatikus pin-migráció: ugyanazon BFS-verzió más runtime-byteja jelenleg
inventory-eltérésként elutasított és megőrzött. Ez a helyreállítási eset külön
nyitott R12-ellenőrzés; nincs automatikus felülírás vagy kitalált siker.

Mac Finder/GUI, ARM64 és más Linux-disztribúció nem futott. A Windows és Linux
folyamatpróbák a közös kód bizonyítékai; a natív host UI, modellből indított
hook/MCP és emberi handoff továbbra is hiányzik. A saját Ubuntu WSL tesztgép
neve nem termékkapu; nincs distro-allowlist, apt/sudo vagy sandbox-kikapcsolás.
Nincs commit/push, publikálás vagy globális hostkonfiguráció-módosítás.

## Ötödik szelet — a rögzített Node-útvonal helyreállítása (R12)

Ez a szelet felülírja a fenti, korábbi Node-path migrációs korlátot. Az új
Node-dal futtatott azonos verziójú setup automatikusan helyreállítja a saját
Linux/macOS konfigurációit. A régi Node-nak nem kell léteznie vagy futnia.
A már futó host nem kap menet közbeni runtime-cserét: új session/IDE reload kell.

- A verziókönyvtár `runtime.json` fájlja platformhoz, architektúrához, verzióhoz
  és változatlan stateHome-hoz köti a korábban generált Node-útvonalakat.
  Régebbi telepítésnél a matching `setup-status.json` pinje adja az átmenetet.
  A történeti útvonalak kizárólag a csomagból újraszámolt hash-leltárhoz kellenek;
  a setup nem indítja el az ott szereplő binárisokat.
- Az egész saját canonical hosts payloadnak pontosan egy ismert generált
  leltárral kell egyeznie. A setup a meglévő source-copy staging/rename/rollback
  eljárást használja; megszakadt csere esetén ellenőrzött korábbi snapshotot
  állít helyre. Idegen vagy kézzel átírt payloadnál hibát ad és megőrzi a fájlokat.
- A canonical másolat után a Gemini tartós source és aktív saját másolata,
  valamint a Cursor saját local pluginja is frissül. Gemini telepítési
  metaadatai byte szerint megmaradnak; a beállítások, enablement és integrity
  store nem kapnak felülírást. Macen a canonical Codex hook/MCP pin is frissül.
- A setup `runtime.recovery.status` mezője `pending`, majd sikeres host-regisztráció
  után `repaired`; változatlan ismétlésnél `unchanged`. A runtime history a
  host-frissítés előtt megmarad, ezért egy részleges hiba után újrapróbálható a
  parancs. A Cursor natív státusza továbbra is reload-required/unverified.
  A Gemini aktív másolatának helyét csere előtt külön saját `active.json`
  rekord tárolja. Ha a csere után hiányzik a könyvtár, a validált snapshot
  visszaállítása még a natív extension-list lekérdezése előtt megtörténik.
- A Windows runtime-konfigurációk nem kapnak POSIX pinninget vagy runtime.json
  migrációt. A Linux ág platform/architektúra alapján működik; nincs disztribúció-
  allowlist, Ubuntu-csomagnév, apt/sudo, shell-profile vagy globális Node-install.

### Gemini forrásellenőrzés és korrekció

Az első próba azonos verziójú `extensions install` műveletet használt. A
kezdeti vezérelt fixture ezt elfogadta, ezért annak PASS eredménye nem igazolta
a valódi CLI viselkedését. A további
[ExtensionManager forrásellenőrzés](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/config/extension-manager.ts)
szerint a már telepített név újratelepítése hibát ad; a
[local update forrása](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/config/extensions/github.ts)
csak verziókülönbséget vizsgál. A megoldás ezért az ellenőrzött saját aktív
copy tranzakciós frissítése, natív CLI-újratelepítés nélkül. A fixture most
elutasítja az ismételt installt, és a list/MCP választ a ténylegesen kihelyezett
manifestből olvassa. A
[Gemini integrity forrása](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/extensions/integrity.ts)
a telepítési metaadatot hash-eli; ezt byte szerint megőrizzük. Ezek upstream
forrásállítások és tervezési indokok, nem natív Gemini-session bizonyítékok.

### Ellenőrzött esetek és határok

A teszt a tényleges Node-binárist saját temp helyre másolja, azzal telepít,
majd törli ezt a tesztpéldányt. A másik Node-process ugyanazon BFS-verziónál
helyreállítja a pinninget. A próba legacy metadata nélküli telepítésből indul,
megszakadt canonical csere snapshotját állítja helyre, majd injektált Gemini
rename-hibát és rollbacket követően újrapróbál. Az aktív Gemini-könyvtár
átnevezése utáni megszakítás is szerepel a próbában; a setup saját rekordból
állítja helyre, mielőtt a fixture listázhatná. A memória, a telepítési út és
a Gemini metaadat megmarad; egy extension marad, nincs új install. A Cursor
MCP pinje frissül; darwin fixture-ben a canonical Codex pin is. A hostmásolat
és a canonical payload külön kézi módosítását megőrzi és elutasítja.

A legelső viselkedési RED a korábbi azonos-verziós inventory-elutasítás volt.
Egy korai Windows-futás 30 másodperces child-process timeoutja nem viselkedési
bizonyíték; a végső próba 120 másodperces limitet használ. A Cursor-próba
első kibővített körében a fixture HOME/USERPROFILE eltérése miatt hibás helyen
keresett fájlt; a fixture profilja egységesítve lett.

| Ellenőrzés | Eredmény és bizonyítékhatár |
| --- | --- |
| Windows teljes `node scripts/check.mjs` | 172 teszt: 169 PASS, 2 POSIX skip, 1 FAIL. Az egyetlen hiba a már futó körbe betöltött Cursor fixture HOME/USERPROFILE eltérése volt. Ez nem teljes zöld regresszió. |
| Végső Windows célzott setup-kör | 4/4 PASS: Node-path recovery, megszakítás/rollback/retry, user-edit megőrzés, POSIX materializálás, szimulált Mac pin és hagyományos Gemini consent/readback. Tartalmazza a végső aktív-könyvtár recovery rekordot és a javított fixture-t. |
| Végső Linux célzott setup-kör | 3/3 PASS: ugyanaz a Node-path recovery, plusz POSIX hook/MCP tényleges Node-process üres PATH-pal. Linux és darwin hostválaszok vezérelt fixture-ből; darwin nem Mac-futtatás. |
| Dokumentáció/linkek és `git diff --check` | PASS. A meglévő PowerShell-fájl CRLF→LF figyelmeztetése nem diff-check hiba. |

Logok: `.tmp/os06-full-windows.log`, `.tmp/os06-recovery-final-windows.log`,
`.tmp/os06-recovery-final-linux.log`. A teljes Windows-kör a korábbi fixture-t
és az aktív-könyvtár recovery rekord előtti implementációt futtatta; a végső
változást a fókuszkörök ellenőrzik. A teljes csomagot ezek után nem futtattam újra.
Felülvizsgált végső fájl/hash-leltár: `.tmp/os06-reviewed-files.json`.
Standards: PASS a rögzített közös kód hatókörében; ownership, ismert generált
inventory, idézés, native metadata, megszakítás és consumer út ellenőrizve.
Spec: PASS a kért setup-helyreállítás és adatmegőrzés ellenőrzött eseteire;
a teljes issue és natív hostelfogadás nincs kész. Két passz ugyanazzal az agenttel.

Mac hardver, Finder/GUI, natív Gemini/Cursor/Codex modellsession és más Linux
disztribúció továbbra sem volt kipróbálva. Az üres PATH-os Linux hook/MCP
folyamatpróba a közös kódot igazolja, nem a natív hostok teljes elfogadását.
Nincs commit/push, issue-komment vagy publikálás.

## Teljes Windows-regresszió újrafuttatása — 2026-10-15

A felhasználó kérésére a végső Node-recovery kóddal, a Gemini aktív-könyvtár
helyreállítási rekordjával és a javított HOME/USERPROFILE fixture-rel újra
lefutott a teljes `node scripts/check.mjs` a `codex/linux-macos` checkoutban.
Környezet: Windows x64, Node v26.8.1. Eredmény: **172 teszt, 170 PASS,
2 SKIP, 0 FAIL; exit 0**, futási idő 302,842 másodperc. A checker a 34 skill,
README, policy, handoff, hook, licenc és core ellenőrzés sikerét is kiírta.

A korábban hibázó `removed Node path is repaired on the same release without
losing state or accepting user edits` eset most a teljes kör részeként PASS.
Ez felváltja az előző szelet teljes Windows-regressziójának nyitott ismétlési
pontját. Új hiba nem jelent meg, ezért nem történt termékkód- vagy tesztmódosítás.
A futás előtt rögzített 328 követett/nem ignorált bemeneti út hash-e a teszt
után, a jelen dokumentációfrissítés előtt változatlan volt.

A két tervezett kihagyás: POSIX privát könyvtár-/fájljogosultságok és POSIX
hook context/interrupted-workflow szerződés. Ezek Windows alatt továbbra sem
igazoltak. A host CLI-válaszokkal vezérelt setup-próbák nem helyettesítik a
natív modellsessiont; a futás nem Mac- vagy más Linux-disztribúciós ellenőrzés.
A korábbi Linux-bizonyítékok megmaradnak, új Linux-futtatás ebben a körben nem volt.
A Linux-kód változatlan, nem került bele Ubuntu-kötés vagy Mac-előfeltétel.

Bizonyítékok a checkout `.tmp` könyvtárában:

- `os06-full-windows-20261015.log`: a teljes stdout/stderr napló.
- `os06-full-windows-20261015-result.json`: pontos parancs, exit és nyers UTC záróidő.
- `os06-regression-inputs-20261015.json`: a vizsgált bemenetek hash-ei és futtatókörnyezet.
- `os06-regression-drift-20261015.json`: 328 út, nulla eltérés a futás alatt.

Az eredeti munkakönyvtár egyéb módosításai és a tesztelt források megőrzöttek.
Csak ez a megvalósítási napló és helyi bizonyíték/checkpoint frissült.
Nincs commit/push, issue-komment vagy publikálás; a teljes #6 natív/platform
elfogadása továbbra is külön, nyitott feladat.

## Linux host- és engine-ellenőrzések — 2026-10-15

### Natív npx-próbával talált és javított belépési hiba

A valódi Linux npm-bin symlink útja eltért az ESM által feloldott modulúttól.
A setup korábbi `path.resolve(argv[1]) === import.meta.url` ellenőrzése ezért
nem lépett be a CLI-be: üres outputtal, 0 exittel nem csinált semmit.
Az első natív Gemini-kör ezt a hiányzó regisztrációnál találta meg. A korai
„install/repeat lefutott” állítás csak az exit alapján történt, ezért visszavontam;
ez nem volt telepítési bizonyíték.

Az új célzott teszt npm-szerű symlinket indít: előbb RED (`'' !== '1.2.0'`),
majd a `realpathSync` alapú, létezést is ellenőrző belépési feltétellel GREEN.
A verziót kiírja, az érvénytelen argumentum 1-es exittel hibázik. A Windows
belépő és az exportált setup/import útja a teljes regresszióban ellenőrzött.
Mac natív futást ez nem igazol.

A teljes Linux-kör első 9 hibájában Windowsra rögzített tesztbelépők is voltak.
A közös hook-próbák most az adott platform natív parancsát használják; POSIX-on
az üres/stale/locked megfigyelések párhuzamos frissítése is valódi shell/Node
folyamatokban fut. A Git-guard teszt explicit PowerShell/Bash nyelvet ad át,
az ismeretlen héjak elutasítása megmaradt. A bundled installer POSIX-próbája
a valódi Node-belépőt használja. A kizárólag Windows PowerShell-szerződésre
írt esetek megnevezett platformkihagyást kaptak; Windows alatt továbbra is futnak.

### Végső regresszió és tényleges engine-út

| Kör | Megfigyelt eredmény |
| --- | --- |
| Teljes Windows `node scripts/check.mjs`, Node 26.8.1 | 173 teszt: **170 PASS, 3 SKIP, 0 FAIL**, exit 0. Kihagyott: két POSIX-specifikus eset és az új POSIX symlink-próba. |
| Teljes Linux `node scripts/check.mjs`, Node 24.21.0 | 172 teszt: **164 PASS, 8 SKIP, 0 FAIL**, exit 0. Mind a hat adapter közös protokolltesztje szerepel; nem mindegyik valódi host CLI/modellsession. |
| Érintett Windows core/package/OpenCode fókuszkör | 47 PASS, 2 POSIX SKIP, 0 FAIL. |
| WSL Ubuntu 26.04 engine teljes tesztsor | **12/12 PASS**, saját NSS/NSPR/ALSA library-envvel és a helyi `.browsers` útvonal beállításával. Az első körből ez utóbbi kimaradt: 8 PASS/4 FAIL; az nem termékhiba volt. |
| Fedora 44 rootfs engine teljes tesztsor | **12/12 PASS**, saját Fedora library/font csomagokkal, Ubuntu `LD_LIBRARY_PATH` nélkül. |
| Arch 2026.10.01 bootstrap rootfs engine teljes tesztsor | **12/12 PASS**, saját Arch csomagokkal, Ubuntu `LD_LIBRARY_PATH` nélkül. |
| Fedora és Arch: BFS core → tényleges engine bridge | Mindkettőn CSS-detektor 0/2/1 és helyes completed/completed/failed jelentés; `overused-font` találat; 640×480 PNG és PDF; browser kattintás/readback/stop; pretext resource és licenc; megőrzött tesztmemória. |
| Alpine 3.24.2, saját musl Node 24.18.1 | Core/doctor elindul; a libc-diagnózis `unknown`, nem kitalált glibc/musl. Impeccable CSS 0/2/1 funkcionális próba PASS. A jelenlegi Chromium launch/render **FAIL**, lásd lent. |

A nyolc Linux-kihagyás: PowerShell release-package ellenőrzés; Git Bash
Windows-drive eset; PowerShell literal-parser; PowerShell destructive-alias
teszt; PowerShell launcher; a korábbi Windowsra korlátozott npm pack unit-teszt
és release-prepare unit-teszt; OpenCode Windows-shell eset. A valódi Linux
tarball/npx út külön natív Gemini-integrációban futott, nem a skipből következtetett siker.

### Valódi Gemini CLI és a további hostok határa

A meglévő opt-in `tests/gemini-setup.integration.mjs` POSIX HOME/XDG-izolálást,
az aktuális Node-prefixből npm-felderítést és POSIX timeout-kezelést kapott.
A közvetlen engine CLI-hez a fixture saját taskazonosítót ad, ha a környezetben
nincs ilyen. Ennek kezdeti hiánya miatt a második integráció CSS-lépése 1-es
exitet adott; ez fixture-hiány volt. A javított teljes próba **1/1 PASS**:

- Valódi Gemini CLI **0.63.0**, eredeti natív extension/MCP protokoll.
- Helyben készített valódi npm-tarball: `1.2.0` install és repeat, majd kizárólag
  tesztverzióként `9.9.9-gemini-test.1` upgrade; 34 skill és aktív extension.
- Telepített engine 0.3.4 és Impeccable (npm 4.5.2, platformcsomag 0.1.14,
  a bináris által jelentett verzió 4.0.0); a natív CLI visszaolvasta a regisztrációt
  és a csatlakozó BFS MCP-t. A forrás és npm-cache félretétele után is működött
  a pinelt doctor és a tényleges CSS-feladatút, a mentett adat változatlan maradt.
- A meglévő fixture csak a saját izolált workspace/source natív consent
  kérdéseire válaszol; nincs `--consent`, globális enablement- vagy trustmódosítás.
- Külön valódi CLI-próba ugyanazon BFS-verziónál egy másik, saját másolt Node-ra
  váltott: `runtime.recovery=repaired`, natív MCP-readback sikeres, az extension
  install metadata és a mentett adat byte szerint megmaradt. Az eredeti Node-ot
  ebben a natív próbában nem töröltük. A hiányzó régi bináris esete a közös
  regressziós fixture-ben ellenőrzött, nem összemosott bizonyíték.

További, külön telepített Linux x64 hostok: Codex **0.162.0**, Claude Code
**2.1.296**, Copilot **1.0.96**, OpenCode **1.19.0**. Mindegyik tényleges
`--version` és saját izolált profilban plugin-/MCP-listázás exit 0.
A Claude/OpenCode első indulásánál az `--ignore-scripts` miatt hiányzott a
natív bináris kihelyezése; a saját npm-prefix csomagjaiban az elolvasott
postinstallokat külön futtatva helyreállt. Ez nem upstream OS-hiány.
Ezek indulási és API-felderítési eredmények: BFS-regisztrációt/frissítést,
natív hookot és modellből kért engine-műveletet ezen a négy hoston nem igazolnak.
Linux Cursor IDE nem volt telepítve; a Windowsból látszó shim nem számított
natív Linux-hostnak. A kontrollált Cursor hook/MCP folyamatpróbák megmaradnak.

### Disztribúciók, függőségek és megőrzött akadály

A disztribúciós próbák rootless bwrap user/PID namespace-ben, a WSL kernelén
futó valódi disztribúciós userlandek. Nem önálló Fedora/Arch/Alpine gépek és
nem ARM64-próbák. A forrás, a Node és a runtime read-only bindot kapott; a
state/profil a saját írható tesztkönyvtárba került. Az automatizált visible
handoffhoz WSLg/X11 socket és külön írható HOME kellett. Ez nem tényleges emberi
login/handoff vagy külön Wayland-session bizonyíték. A Chromium sandbox végig bekapcsolt.

Ellenőrzött alapok:

- Fedora 44 OCI amd64 manifest:
  `sha256:b1721f7a2ac99cd56e09dc40c80f7d559586302dfe12871dc34f6fccf83848a3`;
  rootfs layer: `sha256:61376557b539078f5995bce2062b0d16705115190813fe93d8300731bbc4874f`.
- Arch bootstrap `2026.10.01`, SHA-256:
  `0c9c97b7a58a8a023c9e07f84cb307a9e8006e65d8fc4c17b83ddc8010b45c10`.
- Alpine minirootfs `3.24.2`, SHA-256:
  `c5ca053cfe1d85c5b96dff8b9bc57045f7f184a30ffb6b65776409ca90388677`.

A hiányzó Fedora/Arch könyvtárakat kizárólag e saját rootfs-ekben, saját
dnf/pacman csomagokkal pótoltuk; a termék nem kapott distro-allowlistet,
apt/sudo hívást vagy automatikus rendszertelepítést. A minimális rootfs-ben
az első browser-text readback üres volt; a fontcsomagok hozzáadása után
a változatlan próba PASS. A headed Chromiumhoz további CUPS/Cairo/Pango kellett.
Fedora cups-filesystem telepítésének kiegészítő chown művelete a korlátozott
UID-mapping miatt hibázott; a cups-libs kihelyeződött, a végső 12/12 runtime-próba
ezen a tényleges könyvtárállapoton futott. Ez nem tiszta teljes RPM-tranzakció állítása.
Az Arch bootstrapben a teszthez mirror/keyring inicializálás és a nem mappelhető
DownloadUser helyett az aktuális namespace-userrel végzett letöltés kellett;
ez csak a saját rootfs konfigurációját érintette, nem a gazdarendszert.

Alpine-on a tényleges launcher `spawn ...chrome-headless-shell ENOENT` hibát
adott. Az ELF a `/lib64/ld-linux-x86-64.so.2` betöltőt kéri, amely ebben a
rootfs-ben nincs jelen. A core és a natív Impeccable működött; a jelenlegi
glibc Chromium-builddel a teljes musl engine-út nincs elfogadva. Natív musl
Chromium/build vagy más igazolt upstream út külön megoldási pont; nem szűkítettük
emiatt az egész Linux-támogatást Ubuntura, és nem kapcsoltuk ki a sandboxot.

### Bizonyíték és folytatás

Checkout `.tmp` bizonyítékok: `os08-full-linux-verified-20261015.log`,
`os08-full-windows-20261015.log` és result JSON; `os08-symlink-red-linux-20261015.log`
és green párja; `os08-gemini-native-final-linux-20261015.log`,
`os08-gemini-native-result-20261015.json`, `os08-gemini-native-node-repair-20261015.log`;
`os08-native-host-versions-final-20261015.log`, `os08-native-host-protocols-20261015.log`;
`os08-fedora-engines-complete-20261015.log`, `os08-arch-engines-complete-20261015.log`,
a két `os08-*-bridge-verified-20261015.log`, és `os08-alpine-bridge-20261015.log`.
A rootfs provenance JSON-ok és csomaglisták ugyanitt vannak. A saját provision,
namespace-runner és probe scriptek is megmaradtak; nem terméktelepítők.

Felülvizsgált végső fájl/hash-leltár: `os08-reviewed-files-20261015.json`.
Standards PASS a rögzített belépő/test/fixture diff hatókörében; Spec PASS a fenti
tételesen végrehajtott esetekre. Két passzt ugyanaz az agent végzett; nincs független
review vagy teljes #6-készre jelentés. Még nyitott: a négy további CLI natív BFS
lifecycle és modellsession, Linux Cursor IDE, musl teljes browser-út, ARM64,
külön Wayland/emberi kézátadás, Mac és a specifikáció többi CI/kiadási feltétele.
Nincs commit/push, issue-komment vagy publikálás; személyes hostprofil nem változott.

## Natív Linux Codex/Claude/Copilot/OpenCode kör — 2026-10-15

Elfogadott feladat: a négy CLI valódi BFS npm-telepítésének, ismétlésének,
frissítésének és modellhasználatának ellenőrzése. Az alábbiak Linux ELF/Node
CLI-kkel, WSL Ubuntu 26.04 x64 alatt futnak, saját tartós tesztkönyvtárban;
a Windows PATH-shimjei ki vannak zárva. Ez natív Linux folyamatbizonyíték WSL-en,
nem külön bootolt gép vagy minden disztribúció elfogadása. A korábbi Fedora/Arch
és Alpine eredmények a saját, fent leírt hatókörükben maradnak érvényesek.

### Teszthordozhatóság

Csak öt meglévő opt-in integrációs teszt és ez a jelentés változik ebben a körben.
Nincs új termékfüggőség, termékkód-módosítás, apt/sudo hívás vagy Ubuntu-ág.

- A Codex–Claude közös lifecycle teszt Windows-only korlátozása helyett natív
  PATH-felderítés, izolált HOME/XDG és standard POSIX npm-elrendezés működik.
- A három lifecycle teszt ugyanazt a core `dataPaths` függvényt használja,
  a POSIX verzióútban ellenőrzi a platform/arch szegmenst. A Windows-elrendezés
  és a Windows CLI-felderítés megmarad.
- A Copilot megszakítás és a két OpenCode modellpróba POSIX-on csak a saját,
  detached gyermek-folyamatcsoportját állítja le; Windowson a meglévő taskkill ág marad.
- Két elavult tesztelvárás korrigálva: a setup végső sikere `completed`, és a
  core-first sorrendben az engine-fázis megszakításakor már regisztrált a Copilot.
  Ezek a korábbi termékváltozásokat követő tesztjavítások, nem új termékhibák.
- Az OpenCode modellpróbái ugyanazt az izolált Linux HOME/XDG profilt kapják,
  mint a telepítési teszt; a megengedett műveletek és az érdemi állítások megmaradnak.

### Natív lifecycle eredmények

Az ellenőrzések valódi `npm pack` → helyi tarballból `npx` → natív host CLI
útvonalon mennek végig. A frissítési cél szintetikus tesztverzió, nem publikált kiadás.
Az npm-cache és a buildforrás félretétele átnevezés; meglévő felhasználói adatot
nem törlünk, hitelesítést és személyes profilt nem másolunk a próbákba.

| Host | Natív verzió | Telepítés / ismétlés / frissítés | Modellpróba |
|---|---|---|---|
| Codex | 0.162.0 | PASS: 1.2.0 → 9.9.9-test.1 → 1.2.0 | Hitelesítésre vár |
| Claude Code | 2.1.296 | PASS: 1.2.0 → 9.9.9-test.1 → 1.2.0 | Hitelesítésre vár |
| Copilot | 1.0.96 | PASS: 1.2.0 → 9.9.9-copilot-test.1 | Hitelesítésre vár |
| OpenCode | 1.19.0 | PASS: 1.2.0 → 9.9.9-opencode-test.1 | Health és browser/render PASS |

Codex és Claude: a natív plugin- és marketplace-listák igazolják a frissített,
majd visszaállított verziót és engedélyezést. A korábbi adapterek megmaradnak.
Átirányított Linux XDG state-default mellett a doctor a rögzített közös állapotot
használja. Eltávolítás után a tesztadat és engine-konfiguráció megmarad; cache/build
félretétele után mindkét adapterből valódi CSS 0/2/1 és completed/failed státusz
ellenőrzött. Kiegészítő körben a már meglévő `keep.json` minden setup-/frissítési/
eltávolítási parancs után bájt szerint változatlan, SHA-256:
`c7cf20554e0959bb4644212857275fc07586fc655a734ab664a5212d2a977a29`.
Ez a kiegészítő kör a félretett, valódi npm-telepítés dependency tree-jének setup
belépőjét közvetlenül hívja; az npx-elfogadást a külön teljes lifecycle kör adja.
A dependency nélküli buildforrásból elsőként megkísérelt kiegészítő setup helyesen
`incomplete`/exit 1-gyel jelzett hiányzó Impeccable-modult, miközben a core-regisztráció
megmaradt. Ez a kiegészítő próba előfeltételhibája volt, nem az elfogadott npx út hibája.

Copilot: a tényleges engine-fázisban megszakított telepítés után a natív
plugin-lista engedélyezett BFS-t ad vissza; az újrafuttatás helyreállítja a setupot.
A forráscsere közben külön megszakított frissítés megőrzi a régi HOST-bájtokat,
majd helyreállítás után csak az ellenőrzött staginget távolítja el. Frissítés után
34 engedélyezett BFS-skill és a tartós forrásra mutató natív MCP-regisztráció látható.
Cache/build félretétele után a doctor és a valódi Impeccable `overused-font` találat
(exit 2) sikeres. A letiltott plugin, az idegen MCP és az ütköző projekt-skill
megmarad; az ilyen setup nem írja felül őket. A tesztállapot megőrzése ellenőrzött.

OpenCode: a frissített tartós pluginból a natív CLI 34 skillt ad vissza, az MCP
`bfs connected`. Cache/build félretétele után doctor és valódi CSS-találat (exit 2)
PASS. A kommenteket és trailing commát tartalmazó JSONC konfiguráció, idegen
plugin, letiltott MCP, ütköző projekt-skill és tesztállapot megőrzése ellenőrzött.

### Modellhozzáférés

Az izolált Linux-profilokban a Codex `Not logged in`, a Claude
`loggedIn:false/authMethod:none` állapotot ad. A Copilot tényleges, eszközhasználat
nélküli próbahívása `No authentication information found` hibával, exit 1-gyel áll le.
A releváns API/OAuth/GitHub környezeti változók jelenlétét csak logikai értékként
ellenőriztük: nem voltak beállítva. Ez nem BFS-modellhiba és nem sikeres modellpróba.
A felhasználó külön válasza: „Rögzítsd hitelesítésre váróként; a többi ellenőrzést
fejezd be.” A három modellág ennek megfelelően függőben marad, bejelentkezést nem
kezdeményezünk. A korábban lezárt Windows-kiadás elfogadása változatlan.

Az OpenCode saját modell-listája visszaadta a meglévő tesztben használt
`opencode/longcat-2.5-preview-free` modellt; ez csak felderítés, nem működési bizonyíték.
A telepített BFS health- és browser/render-modellpróbái külön natív sessionökben futottak.
Az első két modellhívásban sikeres natív skill-aktiválás és BFS-core-hívások történtek,
de a teljes próbák FAIL: a health kör nem hajtotta végre az előírt protokollt,
a browser-körben a hostWorkspace a repo lett a külön tesztprojekt helyett.
Egy modell nélküli, tesztprofilba ideiglenesen tett tracer plugin igazolta, hogy a
`debug config` ugyanazzal a cwd-vel helyes directoryt kap, a különböző PWD-értékektől
függetlenül. Ez nem bizonyítja a `run` eltérésének pontos belső okát.
A natív `run --help` alapján mindkét modellteszt explicit `--dir <project>` kapcsolót
kapott; a workspace/protokoll/engine assertionök változatlanok. Az engine-kör végső
futása 1 PASS / 0 FAIL, exit 0. A modell natív skill-aktiválást, a teljes HOST
visszaolvasását és effective preferences olvasást végzett. A valós munkakönyvtár és
session azonosítása egyezett. Valódi HTTP-fixture oldalon goto/snapshot/click/readback,
PNG screenshot, 1280×800 és 375×800 HTML-render történt. A natív read eredményéhez
csatolt PNG-k bájt szerint egyeztek a renderelt fájlokkal; ez tényleges modellnek
átadott képmelléklet-bizonyíték, nem puszta fájllétezés. A valódi CSS-detektor
`completed`, exit 2 és `overused-font` találatot adott. A saját browser `stopped`,
sandbox true, a fixture/config bájtjai változatlanok, failedTools üres.
A külön health-kör végső futása 1 PASS / 0 FAIL, exit 0: natív skill-aktiválás,
telepített BFS `read bfs-health`, `preferences effective`, helyes hostWorkspace/session,
rögzített engine-readiness, guard-observation és tényleges `node --test check.test.mjs`
futás a `BFS_INSTALLED_HEALTH_OK` eredményjelölővel. A JSONC változatlan.
Az első explicit-dir health-indításból nem keletkezett záró eredmény, és később
nem volt futó WSL-próbafolyamat. Ezt megszakadt/nem értékelhető indításként őrizzük
meg, nem PASS-ként. A végső egészség- és engine-próba új, lezárt natív bizonyíték.

### Ellenőrzések és bizonyíték

Lezárult a négy natív lifecycle és a két OpenCode modellpróba.
Kapcsolódó Linux regresszió: `node --test tests/npm-setup.test.mjs
tests/npm-package.test.mjs tests/copilot-host.test.mjs tests/opencode-host.test.mjs`:
50 teszt, 48 PASS, 2 Windows-specifikus SKIP, 0 FAIL, exit 0. Ugyanez Windowson:
50 teszt, 49 PASS, 1 POSIX-specifikus SKIP, 0 FAIL, exit 0.
A teljes Windows-regresszió előző körben rögzített 170 PASS / 3 SKIP eredményét
nem futtattuk újra; ebben a körben nem változott termékkód.
A szintetikus hosttesztek
nem helyettesítik a fenti tényleges CLI- és modellbizonyítékot.

Checkout `.tmp` naplók: `os09-pair-verified-linux.log`,
`os09-copilot-final-linux.log`, `os09-opencode-final-linux.log`,
`os09-auth-isolated-final-linux.log`, `os09-opencode-health-model-final-linux.log`,
`os09-opencode-engines-model-dir-linux.log`, `os09-linux-regression.log`,
`os09-windows-regression.log`. A korai sikertelen futások is megmaradnak:
elavult státuszszöveg, illetve a Linux verzióút platform-szegmensének hiánya
miatti tesztassertionök; nem termékhibaként vagy sikeres elfogadásként szerepelnek.

Eredménymásolatok: `os09-pair-result.json`, `os09-pair-state-result.json`,
`os09-copilot-result.json`, `os09-opencode-result.json`,
`os09-opencode-health-model-result.json`, `os09-opencode-engines-model-result.json`.
A két végső modell natív eszköz- és képmelléklet-összegzése külön
`os09-opencode-*-model-native-evidence.json` fájl. Natív verziók és runtime:
`os09-native-versions.json`. Az összesített, hash-kötött leltár `os09-summary.json`.

Standards PASS az öt tesztfájl hash-kötött diffjének hatókörében;
leltár: `os09-reviewed-files.json`. A két analitikus passzt ugyanaz az agent végezte.
Spec PASS a négy tényleges lifecycle, a célzott Windows/Linux regresszió és az
OpenCode két végrehajtott modellútja hatókörében. A Codex/Claude/Copilot modellág
hitelesítésre vár a felhasználó kifejezett döntése szerint; nincs teljes modellmátrix-PASS.
Mac, ARM64, Linux Cursor GUI, külön Wayland/
emberi handoff, Alpine teljes Chromium-út és a teljes #6 CI/kiadási elfogadás továbbra
sem lezárt. Nincs commit/push, issue-komment vagy publikálás.

## Natív Linux Cursor telepítés és GUI — 2026-10-15

### Javítások és hatókör

A [hivatalos letöltési oldal](https://cursor.com/download) 3.24-es Linux x64
AppImage útjáról letöltött natív Cursor CLI ténylegesen `3.24.18`, x64 verziót ad.
A letöltött AppImage SHA-256:
`04ed7d3ea19096a2861f3bbba6a96622254316aa6b23bfb4d5317b4f655ba28e`.
A csomagot saját Linux cache-könyvtárba bontottuk; nincs globális telepítés,
személyes Cursor-profil másolása vagy rendszerszintű beállításmódosítás.
A próba WSL Ubuntu 26.04 x64 / WSLg alatt futott, nem külön bootolt gépen.
Az AppImage kiválasztása nem szűkíti a terméktámogatást egy disztribúcióra.

Két reprodukált telepítőhiba javítva, ugyanazon két teszt RED → GREEN körével:

- A felderítő a tényleges Linux `usr/share/cursor/bin/cursor` elrendezésben nem
  találta a szülő gyökér `resources/app/product.json` fájlját. A már ellenőrzött
  lehetséges gyökerek közé bekerült a CLI-könyvtár közvetlen szülője.
- POSIX-on egy örökölt Windows `USERPROFILE` megelőzte a natív HOME-ot. A Cursor
  plugin-, MCP- és skill-útvonalai most POSIX-on HOME-ból származnak; Windowson
  megmarad a korábbi USERPROFILE → HOME → homedir sorrend. A setup átadja a tényleges
  célplatformot a közös Cursor-előkészítőnek. A korábbi, esetleg rossz profilban lévő
  fájlokat nem töröljük vagy mozgatjuk automatikusan.

Az egyetlen `prepareCursor` hívó és a teljes függvény ellenőrizve: a kezelt forrás
leltárának ellenőrzése, a megszakítás-helyreállítás és az ütközésvédelem megmaradt.
A meglévő opt-in Cursor lifecycle teszt HOME/XDG/npm/folyamatkezelése hordozható lett.
A Windows natív IDE-előfeltétel ellenőrzésénél először hiányos teszt-env okozott
`ERR_INVALID_ARG_TYPE` hibát; a precheck megkapta a valódi környezeti adatokat,
majd a végső teszt mindkét rendszeren újrafutott. Ez tesztharness-hiba volt.
Nincs új termékfüggőség, distro-allowlist vagy Ubuntu-specifikus termékág.

### Natív telepítési eredmények

| Ellenőrzés | Linux | Windows |
|---|---|---|
| Valódi npm pack → tarball npx setup, ismétlés, 1.2.0 → 9.9.9-cursor-test.1 frissítés | PASS, 1/1 | PASS, 1/1 |
| 34 kihelyezett skill, tartós pin, korábbi verzió megőrzése | PASS | PASS |
| Cache/build félretétele utáni doctor és valódi Impeccable találat, exit 2 | PASS | PASS |
| Meglévő `bfs` MCP, ütköző `bfs-cursor` MCP, projekt-skill és tesztadat megőrzése | PASS | PASS |
| `npm-setup`, `cursor-host`, `cursor-package` célzott regresszió | 42 PASS, 0 FAIL | 41 PASS, 1 POSIX SKIP, 0 FAIL |

A telepítési siker **fájlkihelyezés és engine-próba**, nem natív IDE-aktiválás.
A setup továbbra is újratöltést kér és nem állít aktív betöltést.
A frissítési verzió szintetikus tesztverzió, nem publikált kiadás.

### Tényleges GUI-eredmény és hiányzó előfeltétel

A natív Linux Electron ablak WSLg alatt megjelent, címe `project with spaces - Cursor`.
Az IDE saját workbench felületéhez loopback CDP-n kapcsolódó Playwright CLI
valódi akadálymentességi snapshotot és képernyőképet készített; nem mock/webes
Cursor-utánzat. A saját user-data/extensions/HOME/XDG könyvtárak elkülönítettek.
A launch nem kapott `--no-sandbox` kapcsolót; ez önmagában nem teljes sandbox-audit.

A látható bejelentkezési képernyő szövege: `Cursor’s AI features require you to be logged in`.
Az Escape nem zárta be; a Customize kattintását az overlay ténylegesen blokkolta.
Nem kattintottunk át erővel, nem módosítottuk az autentikációt vagy a helyi import
policyját. **Az aktív BFS plugin/34 skill/MCP/hook betöltés, IDE-újratöltés utáni
verzió és chatből indított BFS-művelet jelenleg nem tesztelt, bejelentkezésre vár.**
A bejelentkezési kérdés a felhasználónál van; a választ nem feltételezzük.
A külön Linux Cursor-ablak a folytatáshoz nyitva maradt. A korábbi Codex/Claude/
Copilot hitelesítési döntés nem helyettesíti ezt az új Cursor-választ.

Az első GUI-napló natív keymap betöltési hibájának helyi `ldd` oka:
`libxkbfile.so.1` hiányzik a minimális WSL környezetből. A gazda csomagindexének
SHA-256 értékével ellenőrzött libxkbfile1 csomag kizárólag saját tesztkönyvtárba
lett kibontva. Az alkalmazás saját Electron/Node futtatójával a natív keyboard-layout
olvasás ezután ténylegesen sikeres. A tesztindító következő GUI-indításra előkészített
LD_LIBRARY_PATH-ja tartalmazza; **a már futó GUI-t nem indítottuk újra**, amíg a
felhasználó a bejelentkezési kérdésre válaszolhat. Ez a jelenlegi tesztgép előfeltételének
rendezése, nem a BFS telepítőjébe épített apt/deb követelmény vagy más disztrók igazolása.

### Bizonyíték és folytatás

Végső naplók a checkout `.tmp` könyvtárában: `os10-cursor-red.log`,
`os10-cursor-green.log`, `os10-cursor-lifecycle-linux-final.log`,
`os10-cursor-lifecycle-windows-final.log`, `os10-linux-regression.log`,
`os10-windows-regression.log`, `os10-cursor-cli.log`, `os10-gui-attach.log`,
`os10-gui-current.log`, `os10-gui-diagnostics.json`, `os10-cursor-prereq-final.log`.
Natív eredménymásolatok: `os10-cursor-linux-result.json`,
`os10-cursor-windows-result.json`, `os10-cursor-gui-source-result.json`.
GUI-kép: `output/playwright/cursor-linux-initial.png`; a tényleges snapshot
az ugyanitt lévő `.playwright-cli/page-2026-10-15T10-34-34-730Z.yml`.
Az összesítő és a felülvizsgálat fájl/hash-kötése: `.tmp/os10-summary.json`.

Standards PASS a fenti két termékjavítás és két tesztfájl hatókörében; a két analitikus
review-passzt ugyanaz az agent végezte. Spec PASS a végrehajtott lifecycle/adatmegőrzés/
regresszió esetekre, **GUI-aktiválási rész BLOCKED: hiányzó natív bejelentkezés**.
Ez nem a teljes Cursor-port vagy #6 elfogadása. Mac/ARM64, külön Wayland, tényleges
emberi handoff és a teljes #6 mátrix továbbra is a korábban rögzített hatókörben nyitott.
Nincs commit/push, issue-komment vagy publikálás.

### Cursor ablak-láthatóság helyreállítása — 2026-10-15

A felhasználó többször megerősítette, hogy a tálcaikon ellenére nem látható az ablak.
A korábbi belső CDP-kép csak a workbench renderelését igazolta; a Windows-asztalon
látható megjelenést nem. A korábbi általános „megjelent” állítás visszavonva ebben
a hatókörben. A Windows- és natív X11-koordináták mozgatása sem oldotta meg a hibát.

Kizárólag a rögzített, izolált Cursor-folyamatot indítottuk újra normál SIGTERM-mel,
azonos profillal, explicit X11, majd szoftveres grafika mellett. A négy ellenőrzött
state/MCP/plugin/install-state fájl bájtjai változatlanok maradtak. Ez nem teljes
profilazonosság-vizsgálat. WSL-újraindítás, hitelesítési módosítás nem történt.

Megfigyelt tények: a Cursor és az msrdc azonos Windows-munkamenetben fut; DWM cloaked=0.
A layered attribútum lekérése nem sikerült, ezért az alpha=0 kimenet nem bizonyít
átlátszóságot. A PrintWindow fekete képe sem tényleges asztali láthatósági bizonyíték.
A Weston napló rdp_allocate_shared_memory Input/output error és use_gfxredir=0 állapotot,
a Windows RDPClient napló 1033/1404 eseményekben 0x80070490 és
WireDecoderError_DecodeW2S1InvalidData hibákat rögzít. Ez hibás megjelenítési út gyakorlati
bizonyítéka; a pontos kiváltó ok nem igazolt. WSL 2.7.13.0, WSLg 1.0.73.2;
a rendszerdisztróban /mnt/shared_memory létezik és virtiofs mount, tehát nem állítunk
hiányzó mountot. Hasonló upstream tünet: https://github.com/microsoft/wslg/issues/1489 .
A forrásjelentés nem helyi javítási bizonyíték.

Bizonyíték: .tmp/os11-window-style.json, .tmp/os11-rdp-errors.json,
.tmp/os11-wslg-errors.log, .tmp/os11-x11-frame-move.json,
.tmp/os11-window-frame-readback.json és a korábbi os11 célzott ablaknaplók.
A natív GUI-belépés és a Customize/chat ellenőrzés továbbra is BLOCKED:
Windows/WSLg-megjelenítés és hitelesítés. A teljes WSL-újraindítás minden WSL-programot
leállítana; ezt külön felhasználói jóváhagyás nélkül nem végeztük el.
Nincs új termékkód, commit/push vagy issue-komment. A Linux-támogatás továbbra sem
Ubuntuhoz kötött; ez az aktuális WSLg tesztkörnyezet hibája.

### WSL-újraindítás utáni Cursor-megjelenítés — 2026-10-15

A felhasználó kifejezetten jóváhagyta a teljes WSL leállítását, és jelezte, hogy mentett.
A `wsl --shutdown` sikeres volt. Azonos izolált profillal újraindult a natív Cursor;
a négy rögzített state/MCP/plugin/install-state fájl SHA-256 értéke indulás előtt és
után is változatlan. Ez a négy fájl ellenőrzése, nem a teljes profil összehasonlítása.

Új megfigyelések: Weston `use_gfxredir = 1`, a COPY MODE címfigyelmeztetés eltűnt.
Az új msrdc ablak főmonitorra mozgatása és SetForegroundWindow hívása true értéket
adott. Az előtérben lévő célablak területéről készült tényleges Windows-asztali képen
látható a Cursor Log In / Sign Up felülete. Ez már nem belső CDP-kép. A korábban
megfigyelt láthatatlanság ezen asztali felvételen nem reprodukálódott; a felhasználói
visszaigazolás és bejelentkezés még függőben. Az újraindítás hatása megfigyelt, de a
WSLg-hiba pontos kiváltó oka továbbra sem bizonyított.

Bizonyíték: `.tmp/os12-before.json`, `.tmp/os12-after.json`,
`.tmp/os12-window-restore.json`, `.tmp/os12-window-surface.json`,
`.tmp/os12-wslg-after.log`,
`output/playwright/cursor-linux-visible-desktop-after-restart.png`.
A Customize/chat és BFS aktív GUI-ellenőrzés bejelentkezésre vár.
Új termékkód nem változott; új Windows/Linux regresszió nem futott ehhez a
környezeti helyreállításhoz. Nincs commit/push vagy issue-komment.

### Cursor bevitel és böngészőindítás — 2026-10-15

A felhasználó a látható ablakban nem tudott kattintani/írni. A belső CDP snapshot
válaszolt, tehát a renderer ezen ellenőrzéskor nem volt befagyva. A Windows-oldali
mozgatás után a Linux X11-ablak még más koordinátákon volt. Célzott, a rögzített
natív Cursor PID-jére korlátozott X11 frame-igazítás történt; utána a Windows RAIL
ablak (68,287)–(1196,1215) pozíciót olvasott vissza. A geometriai eltérés bevitelre
gyakorolt hatása hipotézis, emberi ellenőrzésre vár.

X11 input focus és Windows foreground kérés után az alkalmazás document.hasFocus()
értéke false-ról true-ra váltott; IsWindowEnabled=true. Ez fókuszállapot-ellenőrzés,
nem igazolja a felhasználó fizikai billentyűzetét/egerét. Bizonyíték:
.tmp/os13-x11-align.json, .tmp/os13-windows-after-align.json,
.tmp/os13-x11-focus.json, .tmp/os13-input-focus.json.

Külön megfigyelt előfeltételhiba: xdg-open és wslview nincs a tesztkörnyezetben;
a natív gui-launch.log több LaunchProcess: failed to execvp: xdg-open hibát rögzít.
Ez blokkolja a külső böngészős belépés indítását, és nem tekinthető bizonyítéknak
arra, hogy a kattintás nem jutott el a gombhoz. A böngészős handoff nincs még javítva.
Nem módosítottuk a hitelesítést, a profil tartalmát vagy a termékkódot.

### Cursor böngészős belépési kérés helyreállítása — 2026-10-15

A felhasználó szerint az ablak húzható, a hover működik, de kattintásra nincs látható
reakció. A hiányzó xdg-open miatt az izolált profil browser-bin könyvtárába kizárólag
HTTPS böngészőkérést helyi, 0600 jogosultságú fájlba rögzítő segéd került. Az útvonal
csak az owned Cursor folyamat PATH-jába lett hozzáadva. Nem globális xdg-open telepítés,
nem BFS-termékfüggőség és nem Ubuntu-követelmény. A segéd file/custom-protocol URL-t,
URL-be ágyazott felhasználónevet/jelszót és vezérlőkaraktert elutasít; a határellenőrzések
lefutottak. A pozitív útvonalat a natív alkalmazás tényleges böngészőkérése igazolta.

Az owned Cursor normál SIGTERM-mel indult újra, azonos profillal. A négy korábban
rögzített adatfájl továbbra is változatlan. Linux-oldali ablakpozíció/fókusz helyreállt.
A natív alkalmazás a segéden keresztül létrehozott egy HTTPS belépési kérést, mielőtt
az agent bármilyen automatizált Log In kattintást végzett volna. Ez az alkalmazásból
érkező böngészőkérés bizonyítéka, nem külön műszerezett fizikai egérkattintás-próba.

A kérés címét kiírás nélkül, HTTPS és Cursorhoz tartozó host allowlist ellenőrzése után
Windows Start-Process nyitotta meg. A folyamatindítás sikeres; a böngésző tényleges
oldalbetöltése és a bejelentkezés felhasználói visszajelzésre vár. A natív auth-kérés
nem került chatbe vagy verziókezelt dokumentumba. A helyi request fájl az izolált Linux
profilban maradt; a belépés után törlendő. A segéd csak rögzít, tehát egy későbbi új
belépési kérés nem nyit automatikusan böngészőt: ez egyszeri teszthandoff.

Az első, kódolt PowerShell böngészőindítót készítő shell-hívást az automatikus
jóváhagyás blocked by policy válasszal elutasította; nem futott le. A végrehajtott
változat helyben rögzít, majd a már ellenőrzött URI-t közvetlen Windows API-nak adja
adatként, kódolt parancs és URI shell-kódba interpolálása nélkül.
Bizonyíték: .tmp/os14-browser-result.json, .tmp/os14-window-focus.json,
.tmp/os14-xdg-open.py, .tmp/os14-prepare-browser.py, .tmp/os14-restart-browser.mjs.
Termékkód/regressziós tesztek nem változtak; a BFS aktív GUI-próbák továbbra is nyitottak.

### Natív Linux böngésző és Cursor GUI — 2026-10-15

A felhasználó jelezte, hogy a Windows böngészős út a Windowsos Cursorhoz irányította.
A korábbi Windows-handoff ezért nem igazolja a Linux hitelesítését, és erre a célra
hibás megoldásként visszavonva. A Windows-profilhoz/hitelesítéshez nem végeztünk
helyreállító vagy kijelentkeztető módosítást.

A tesztprofil xdg-open segédje most a már telepített natív Linux Chromiumot indítja
külön linux-browser profillal. A cursor:// séma célja explicit a natív Linux Cursor
és annak rögzített user-data-dir könyvtára. Ez csak helyi tesztsegéd, nem a BFS
termékkódja és nem globális protokoll-regisztráció. Szintetikus ellenőrzés igazolja
a HTTPS/cursor argv útvonalakat, az elutasított file/javascript/credential/control
karakteres bemeneteket és a shell nélküli processzhívást. A protokoll-visszahívás
külön gyakorlati meghívását nem figyeltük meg, ezért nem állítunk tesztelt callbacket.

A natív Linux Chromium folyamatának exe-je és izolált profilargumentuma ténylegesen
ellenőrizve. Az első, közvetlen indítás utáni PID-lista még üres volt; későbbi olvasás
igazolta az owned böngészőfolyamatokat. A segéd nem használ Windows böngészőt vagy
Windows Cursort. A régi, helyben rögzített Windows böngészőkérés fájlját töröltük.
A Chrome mozgatásának első, NUL-argv-ra építő ownership checkje megtagadta a műveletet;
a gyakorlatban megfigyelt space-joined process title alapján, exe és teljes profilarg
ellenőrzéssel történt a későbbi célzott X11 mozgatás. Nem gyengítettük idegen ablakokra.

Megfigyelt GUI: a Linux Cursor login overlay eltűnt, a nézet Cursor Agents lett.
Automatizált, normál DOM-kattintás megnyitotta a Customize panelt és a Bontaflowstack
Local bővítmény részleteit: Skills 34; Configure bfs-cursor, 5 tools enabled; Hooks
szekció jelen van. Ez a natív GUI-ban történő tényleges betöltés/discovery bizonyítéka,
nem önmagában öt sikeres eszközhívás vagy hook-futás. A fiktív idegen bfs MCP megőrizve.

A felhasználó ezután kifejezetten megerősítette: „Igen, a Linux Cursorban már működik
a kattintás”. A korábbi láthatatlanság/kattintási blokk a jelenlegi emberi ellenőrzésen
megszűnt. A fizikai gépelés, modellválasz, aktív MCP- és hook-folyamat még nincs
igazolva. A teljes Cursor/#6 elfogadása ezért nincs lezárva; Mac hiánya sem változott.

Bizonyíték: .tmp/os15-linux-open.py, .tmp/os15-prepare.py,
.tmp/os15-browser-window.json, .tmp/os15-post-login-ui.log,
.tmp/os15-customize-click.log, .tmp/os15-customize-ui.log,
.tmp/os15-plugin-click.log, .tmp/os15-plugin-ui.log.
Nem változott termékkód; nincs új regressziófuttatás, commit/push vagy issue-komment.

## Cursor natív Linux modell-, MCP- és hook-próba — 2026-10-15

Elfogadott kérés: „Folytasd a #6-ot a Cursor natív Linux modellpróbájával, a tényleges
MCP-hívások és hookok ellenőrzésével. Őrizd meg a Windows-működést és az adatokat;
ne legyen Ubuntu-kötés.” Elfogadási checkpoint: c121fd68-ffce-4cf1-a2df-b4c842d66445.
A futó natív Cursor 3.24.18 izolált Linux profilját és a korábban npx-ből telepített
9.9.9-cursor-test.1 jelöltet használtuk; nem Windows Cursort vagy Cursor CLI-t.

### Modell és MCP: szolgáltatói keretre vár

Az IDE-gombbal megnyílt a natív Linux IDE, abban a meglévő `project with spaces`
tesztprojekt. Új chat készült, a korábbi be nem küldött szöveg külön tabon maradt.
Az egyetlen tesztprompt csak a tényleges bfs-cursor/bfs_status hívást kérte üres
argumentumokkal, shell, fájlmódosítás és kitalált _bfsCall nélkül.

A kezdeti név szerinti modellre a Cursor „Named models unavailable” és „Free plans
can only use Auto” hibát adott. A felkínált Switch to Auto után a második kísérlet
„You've hit your usage limit” hibával megállt. Modellválasz és modell által indított
MCP-eszközhívás nem történt. A tényleges MCP-hívás, natív preToolUse átírás/kötés,
postToolUse és postToolUseFailure ezért **BLOCKED: szolgáltatói keret**, nem PASS.
A GUI öt engedélyezett MCP-eszköze és a stdio server connect napló nem eszközhívás.
A bindinget nem generáltuk vagy injektáltuk kézzel a natív modellpróba helyett.

A szolgáltató elutasításainak megfigyelése nem igazolja a keret fogyásának okát vagy
annak elszámolását. A felhasználó jelezte, hogy nem fizet; nincs további modellkérés,
csomagváltás/vásárlás, hitelesítőadat-átvitel vagy újabb belépési kérés.

### Ténylegesen lefutott hookok

A natív Cursor saját hooks naplójából, kizárólag a tesztbeszélgetéshez:

| Esemény | Megfigyelt eredmény |
|---|---|
| sessionStart | 1 futás, exit 0, érvényes JSON, additional_context visszatért |
| beforeSubmitPrompt | 2 futás, exit 0, érvényes JSON |
| stop | 2 futás, status=error a szolgáltatói elutasítás után, exit 0, érvényes JSON |
| sessionEnd | A saját tesztchat tabjának bezárása után reason=user_close, exit 0, érvényes JSON |
| preToolUse / postToolUse / postToolUseFailure | A tesztbeszélgetésben nem futott; modell/eszközhívás hiányában nem igazolt |

A táblázat a host által ténylegesen indított, telepített BFS POSIX Node-hookokra
vonatkozik. Nem mesterséges stdin-es hook-esemény és nem teljes hét-hookos elfogadás.
A tárolt natív session rekord sessionId-ja és egyetlen workspace-e egyezett a valódi
beszélgetéssel és a tesztprojekt Linux-útvonalával. A guard végrehajtása és a workflow
megszakítási adatmentése nem igazolt attól, hogy az adott lifecycle hook exit 0-t adott.
A [Cursor hook dokumentációja](https://prod.cursor.com/docs/hooks) leírja az eseményeket;
a fenti eredmények saját futási bizonyítékok, nem a dokumentációból következtetett PASS-ok.

### Adatmegőrzés és bizonyíték

`wsl -d Ubuntu -- python3 .tmp/os16-verify.py`: exit 0. A négy korábban rögzített
state/MCP/plugin manifest/install-state fájl SHA-256 értéke változatlan; a hat ellenőrzött
telepített adapter/hook/MCP fájl is byte-azonos a próba előtti állapottal. Ez a kijelölt
fájlok összevetése, nem a teljes profil byte-azonossága: saját tesztchat/session és
naplók természetesen keletkeztek. A fiktív idegen bfs MCP és a korábbi draft megőrizve.
Windows-profil, Windows hitelesítés és termékkód nem változott. Új Ubuntu-függőség nincs;
a WSL disztró az aktuális tesztkörnyezet, nem a támogatási szerződés.

Bizonyítékok a checkout `.tmp` könyvtárában: `os16-native-before.json`,
`os16-native-result.json`, `os16-native-hook-events.json`, `os16-verify.py`,
`os16-model-first-ui.log`, `os16-auto-ui.log`, `os16-close-own-chat.log`.
A hook-összesítő csak a szükséges technikai mezőket tartja meg, felhasználói e-mailt nem.
A hook- és stdout-vizsgálat nem modellelvárást teljesítő mesterséges tesztként szerepel.

Nincs új Windows-regressziófuttatás: termékkód nem módosult. A korábbi Windows-eredmények
a korábban rögzített hatókörükben maradnak. A Cursor modell/MCP kör és a teljes #6 nincs
lezárva; Mac/ARM64 és a külön natív Wayland kör továbbra is az eredeti mátrix nyitott része.
Nincs commit/push, GitHub-komment vagy publikálás.

## Modellkerettől független csomag/CI/core kör — 2026-10-15

Elfogadott aktuális kérés: „Folytasd a #6-ot a modellkerettől független, fennmaradó
feladatokkal. A Cursor modell/MCP-próbája maradjon keretre váróként; ne küldj több
modellkérést. Őrizd meg a Windows-működést és az adatokat, ne legyen Ubuntu-kötés.”
Kiindulási checkpoint: `.tmp/os17-basis.json`. Forrás: a `codex/linux-macos` clone,
HEAD `c9057d67c662a9d740eaec70403bf68044a97648` és az eddigi megőrzött helyi diff.
A mostani szelet sikerfeltétele: POSIX-on is valódi pack-ellenőrzés, a közös
ellenőrzésekből használható több-OS CI-előkészítés, pontos támogatási dokumentáció,
és modell nélküli további natív Linux core/engine eredmény. Ez nem a teljes #6 lezárása.

### Megvalósult felhasználói eredmény

- A korábban Windows-only npm-csomagteszt POSIX-on is ténylegesen felépíti és
  `npm pack`-olja mind a hat adaptert. Megőrzi az összes csomagtartalom-, verzió-,
  34-skill-, engine-archive- és adat-kizárási assertiont. A POSIX npm-prefix jelölt
  ugyanazt az elrendezést követi, amelyet a natív lifecycle tesztek már használnak.
- A meglévő Windows CI-job byte szerinti prefixe és release-proof kizárása megmaradt.
  A POSIX matrix Node 24-gyel Linux x64/ARM64 és Mac ARM64/Intel célokat kér, a
  tényleges runtime OS/arch értékét ellenőrzi. Külön Linux candidate-job épít egy
  tarballt, így a distro-jobok nem függenek a Mac matrix eredményétől.
- Debian 13, Fedora 44, Arch és Alpine CI-ág készült. Az utóbbi natív musl Node 24
  Docker-képben futtatja a core/package határt. A base image-ek registryből visszaolvasott
  digesthez kötöttek; a distro-jobok ugyanazt a SHA-256-tal ellenőrzött tarballt
  bontják ki. Ez CI-előkészítés, nem lefutott GitHub CI, és nem teljes distro-engine kapu.
- Az új [OS útmutató és bizonyítékmátrix](OS-SUPPORT.md), README/TELEPITES/platformoldal,
  npm README és közös HOST Node-parancspéldái elkülönítik a publikált Windows 1.2.0-t
  a nem publikált POSIX-jelölttől. A Mac/ARM64/handoff és modellkorlátok láthatók.
  A korábbi registry-verziót nem nevezzük új, elfogadott POSIX-kiadásnak.

### Reprodukált fixture-hibák és legkisebb javítás

1. A POSIX pack-teszt engedélyezése után a valódi Linux Node telepítésén a régi
   npm-kereső nem találta a rendelkezésre álló `../lib/node_modules/npm/bin/npm-cli.js`
   fájlt. A teszt exit 1. Az egyetlen új POSIX jelölt után ugyanaz a teszt Linuxon
   és Windowson 1/1 PASS. Ez a teszthordozó korábbi Windows-feltételezésének javítása,
   nem újonnan bizonyított termékhiba vagy megváltoztatott csomagelvárás.
2. Egy saját Linux `TMPDIR` symlink-fixture mellett a meglévő essential-context teszt
   `State path contains a link` hibával ténylegesen elbukott. A core biztonsági
   elutasítása helyes volt: a fixture a nyers alias-útvonalra tett explicit state-rootot.
   Tizenöt közös tesztfájl temp-root létrehozása most előbb a valódi temp-szülőt oldja
   fel, a már működő hosttesztek mintájával. Cleanup- és viselkedési assertion nem
   változott; a termék symlink-védelme nem lazult. Az eredeti célzott próba utána
   PASS, majd a teljes közös Linux-kör is PASS ugyanezzel a symlinkes TMPDIR-rel.
   A célzott eset a POSIX CI-be is bekerült. Ez kontrollált Linux-alias bizonyíték,
   nem natív Mac `/var` vagy case-sensitive/insensitive kötet elfogadása.

A fixture-javítás előtti és utáni naplók megmaradtak: `os17-package-red-linux.log`,
`os17-package-green-{linux,windows}.log`, `os17-temp-red-linux.log`,
`os17-temp-green-linux.log`, `os17-ci-alias.log`.

### Tényleges ellenőrzések és határok

| Ellenőrzés | Eredmény | Határ |
| --- | --- | --- |
| Végső `node scripts/check.mjs`, Windows Node 26.8.1 | 174 teszt: 171 PASS, 3 SKIP, 0 FAIL, exit 0 | A közös/test-fixture kód utolsó verziója; nem új natív Windows-modellút |
| Végső `node scripts/check.mjs`, Linux Node 24.21.0, symlinkes TMPDIR | 173 teszt: 166 PASS, 7 Windows-specifikus SKIP, 0 FAIL, exit 0 | Natív WSL/Linux fájlrendszer és közös folyamat/pack szerződés; nem Mac |
| CI `Check temp-directory aliases` parancsblokkja Linuxon | 1/1 PASS | A tényleges YAML-ból vett blokk, saját RUNNER_TEMP |
| CI build/pack/hash/extract/setup-help/packed-doctor blokk Linuxon | exit 0; `core.ready=true`, 34 skill, engines unavailable, hooks unverified | Tényleges végső tarball; nem telepített engine vagy host session |
| actionlint 1.7.12 | exit 0 | Hivatalos checksum ellenőrzött eszköz, workflow séma/kifejezés; ShellCheck/Pyflakes nem futott |
| YAML parser és POSIX shell-szintaxis | 12 parancsblokk `bash -n`, Alpine belső blokk `sh -n` PASS | Nem a container/GitHub jobok tényleges végrehajtása |
| Módosított dokumentáció relatív linkjei, `git diff --check` | PASS | Formátum/linkek; a korábbi PowerShell-fájl CRLF/LF figyelmeztetése megmaradt |

A teljes regressziók után csak a CI-függőségek/alias-lépés és az npm README
platformszövege finomodott. Ezeket külön végső workflow-validálás, tényleges alias-blokk
és új pack/core-smoke ellenőrizte; emiatt nem futott indokolatlanul harmadszor a teljes
suite. A futások közben a teszt/runtime kód nem módosult. Nincs új modellpróba.

### Ugyanaz a végső tarball három nem Ubuntu userlandben

Tarball: `artifacts/npm-check/bontaflowstack-1.2.0.tgz`, SHA-256:
`83e77f5d8399d2d7e28ac8128232e3e3987c3fce85024d19206b7b3d842217fc`.
Ez helyi, nem publikált candidate, nem a registry azonos verziószámú bájtjainak állítása.

A checksum-egyezés után biztonságos data-filterrel kibontott csomag readonly bindot
kapott a korábban rögzített Fedora/Arch/Alpine rootfs-ekben, rootless bwrap alatt.
Mindegyik saját /tmp HOME/state mellett futott; rendszer- vagy személyes hostprofil
nem változott. A közös kernel továbbra is WSL, a CPU x64.

| Userland | Tényleges Node | Setup `--help` és packed `doctor` | További megfigyelés |
| --- | --- | --- | --- |
| Fedora 44 | 24.21.0 glibc | exit 0, core ready, 34 skill | libcDiagnostic=glibc |
| Arch bootstrap 2026.10.01 | 24.21.0 glibc | exit 0, core ready, 34 skill | libcDiagnostic=glibc |
| Alpine 3.24.2 | Saját 24.18.1 musl Node | exit 0, core ready, 34 skill | A jelenlegi doctor libc=unknown értéket ad; nem állítunk sikeres musl-felderítést |

Mindhárom fresh packed core engine nélkül és hook-unverified állapotot jelzett,
nem hamis teljes ready browser/host eredményt. Ez core/package bizonyíték; a Fedora/Arch
korábbi 12/12 engine-eredménye a saját korábbi artifact/input határában marad.
Az Alpine teljes Chromium-útjának korábbi glibc-loader akadálya változatlan.
Egy első Alpine runner-kísérlet mountpoint-setup hibán állt meg (`Can't mkdir /node`);
a saját helperből az ott felesleges glibc Node-bind eltávolítása és a saját mountpoint
előkészítése után a végső azonos helperrel mindhárom kontroll exit 0. Ez nem termék-RED.

### Kijelző nélküli folyamatkörnyezet

A valódi Linux engine Display/Wayland/runtime-dir változók nélkül teljesítette a
core doctor, headless goto/click/readback/screenshot és 640×480 render feladatot.
A visible connect ténylegesen elbukott a `Missing X server or $DISPLAY` okkal;
a következő headless művelet újra működött. A browser/render megtartotta a meglévő
`chromiumSandbox:true` launchbeállítást. Ez nem új kernel-sandbox audit.
A saját böngészők/HTTP-fixture lezárultak. A WSL grafikus hostján eltávolított
folyamatváltozókkal futó próba nem önálló grafikus session nélküli szervergép,
nem Wayland és nem emberi handoff/resume. Nincs belőle natív Cursor MCP-állítás.

### Felülvizsgálat, adatmegőrzés és nyitott részek

Standards PASS a kiválasztott constructor/npm-kereső/CI/dokumentáció változások
hatókörében: a megőrzési guardok és assertionök megmaradtak; nincs új termékfüggőség,
distro-allowlist, kötelező POSIX PowerShell vagy felhasználói rendszertelepítő.
Spec a végrehajtott helyi részesetekre PASS; a teljes OS07/OS08/OS10 és #6 megfelelés
BLOCKED a nem futott natív/CI/GUI ágakra. Két analitikus passz ugyanattól az agenttől;
nincs független reviewer, teljes korábbi diff-újraelfogadás vagy natív Mac-eredmény.
Fagyasztott célfájlok: `.tmp/os17-review-scope.json`; ellenőrzési összesítő:
`.tmp/os17-summary.json`. A teljes scope és evidence hash-ei a checkpointban szerepelnek.

A négy korábban rögzített Cursor state/MCP/plugin/install-state fájl változatlan:
`.tmp/os17-preserved-native-data.json`. Ez kijelölt fájl-összevetés, nem teljes
profilazonosság. A Windows adapterkódhoz és default útvonalakhoz nem nyúltunk,
személyes hostprofilt nem módosítottunk. A 15 fixture-módosítás tesztkód, nem adatmigráció.

A Cursor modell/MCP/pre-post-tool-hook ág **keretre váró**; nem indult új modellkérés,
csomagváltás vagy fizetés. Mac/ARM64, a tényleges új GitHub CI, külön Wayland és
emberi browser handoff/resume, további natív distro-host utak és a teljes specmátrix
nyitott. Ezeket nem rejti el a közös tesztek sikere. Nincs commit/push, GitHub-írás
vagy publikálás. A közös Linux-kód Ubuntuhoz kötése nem került be.

Fő naplók: `os17-final-windows.log`, `os17-final-alias-linux.log`,
`os17-ci-pack-smoke-final.log`, `os17-packed-{fedora,arch,alpine}-final.log`,
`os17-distro-result.json`, `os17-no-display-result.json`, `os17-ci-validation.log`.
A helyi CI-helper első CRLF-es futtatásának hibás kimenete és stagingje külön megmaradt;
LF-normalizálás után a tényleges parancsblokkok végső futása sikeres. Ez helper-hiba,
nem GitHub CI-RED. A forrás `.gitattributes` fájlja továbbra is LF-et ír elő.
