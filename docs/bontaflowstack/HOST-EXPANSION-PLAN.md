# BFS: további működési közegek terve

Állapot: specifikációként elfogadva és közzétéve. Dátum: 2026-10-13.
Közzétett specifikáció: [GitHub issue #4](https://github.com/BillBalint-SM/bontaflowstack/issues/4),
`enhancement` és `ready-for-agent` címkékkel. Helyi példány: [HOST-EXPANSION-SPEC.md](HOST-EXPANSION-SPEC.md).
A dokumentum tervezett munkát ír le; egyik új port sincs megvalósítva vagy futtatással igazolva.

## Elfogadott keretek

Az egyeztetésben elfogadott célok: **Gemini CLI, GitHub Copilot CLI, Cursor IDE, OpenCode CLI**, első körben **Windows x64**.
A Cursor CLI, OpenCode Desktop, felhős agentek, macOS és Linux külön későbbi hatókör.

A teljes BFS-csomag egyetlen terjesztési belépője marad `npx bontaflowstack@<pontos-verzió> setup`.
A setup végzi a BFS-fájlok telepítését, konfigurálását és ellenőrzését a felismert, támogatott hostokhoz.
A gazdaalkalmazás telepítése, bejelentkezése, előfizetése és bizalmi döntése saját előfeltétel marad.
A már futó alkalmazás felhasználói újratöltése elfogadott; kézi BFS-fájlmásolás vagy konfigurációszerkesztés nem.

Kötelező alap: a 34 skill és módjaik teljes besorolása; feladatirányítás; projektmemória;
soros munkafolyamat; checkpoint és folytatás; munkamenet-/projekt-elkülönítés;
böngésző, renderelés és Impeccable; az engedélyek és a tényleges guard-határok helyes kezelése.
Egy skill megjelenése nem bizonyítja az összes módjának működését.

A párhuzamos, natív alagentekkel végzett BFS-munka külön képesség. Csak igazolt
alagent-azonosság és feladattulajdon mellett kapcsolható be. További külön képesség
a natív raszteres képgenerálás/-szerkesztés és a host saját kérdés-/választófelülete.
A profil az egyes módok tényleges elérhetőségét nevezi meg; nem ad csendben gyengébb működést.
Alapfunkció hiányában a port még nem támogatott. Külső képszolgáltatás integrációja nem része ennek a tervnek.

Elfogadott ütem: a négy host rövid megvalósíthatósági próbája után **Gemini CLI → Copilot CLI → Cursor IDE → OpenCode CLI**.
Minden port külön ellenőrizhető és kiadható lépés; a sorrend nem publikálási engedély.

## Forrásalap és bizonyíték

A kódfeltárás alapja az 1.1.0 kiadás után rögzített
[2c565fb forrásállapot](https://github.com/BillBalint-SM/bontaflowstack/tree/2c565fb2bb27816ff4aac8f4e0f400dc3edac876).
A kiadási tag `v1.1.0`, a kiadási commit `a4025648c5c962a7b113a06b001c2ce14d81c308`.
Az aktív tervezési checkout régebbi (`1ec7d3e`); az új kódot az 1.1.0 utáni forrásból kell kezdeni,
az itt meglévő helyi dokumentumok és egyéb felhasználói módosítások megőrzésével.
A már elfogadott Codex/Claude Code 1.1.0 kiadás lezárt kiindulópont.

Minden munkatételhez három külön bizonyíték tartozik:

1. **Dokumentált:** hivatalos URL, ellenőrzés dátuma, kiválasztott hostverzió és releváns szerződés.
2. **Szerződéspróbával ellenőrzött:** a konkrét adapter/build/telepítő tesztje és eredménye.
3. **Natív futással ellenőrzött:** tényleges host + Windows-verzió + csomagverzió + megfigyelt feladatút.

A dokumentáció vagy egy tesztimitáció nem helyettesíti a harmadik szintet.
A jelen tervhez forrás- és dokumentációvizsgálat történt; az új hostokon futási próba nem.

## Döntési fa

| Döntés | Válasz | Következmény |
| --- | --- | --- |
| Q1: platformok | mind a négy | négy önálló portlap |
| Q2: operációs rendszer | Windows x64 | nincs WSL/macOS/Linux kompatibilitási állítás |
| Q3: alkalmazásváltozatok | Gemini CLI, Copilot CLI, Cursor IDE, OpenCode CLI | más felületek nem öröklik a támogatást |
| Q4: kompatibilitás | kötelező alap + képességprofil | a hiányzó extra név szerint látszik |
| Q5: aktiválás | felhasználói újratöltés megengedett | nincs kényszerített alkalmazásbezárás |
| Q6: sorrend | platformonként, a fenti sorrendben | külön elfogadás és kiadási döntés |
| Q7: párhuzamos munka | külön képesség | igazolásig nem érhető el |
| Specifikáció és teszthatárok visszaigazolása | elfogadva, #4-ként közzétéve | megvalósításra előkészítve; kód még nem készült |

## Portlapok és hivatalos alapok

| Portterv | Elsődleges hivatalos szerződés | Első tisztázandó mechanika |
| --- | --- | --- |
| [Gemini CLI](ports/gemini-cli.md) | [Extension](https://geminicli.com/docs/extensions/reference/), [hookok](https://geminicli.com/docs/hooks/reference/) | eszközhívás kontextusa és nem megvárt lezáró hook |
| [Copilot CLI](ports/copilot-cli.md) | [Plugin](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference), [hookok](https://docs.github.com/en/copilot/reference/hooks-reference) | argumentummódosítás és hook-időtúllépés |
| [Cursor IDE](ports/cursor-ide.md) | [Helyi pluginek](https://prod.cursor.com/docs/plugins), [hookok](https://prod.cursor.com/docs/hooks) | npm által elhelyezett plugin betöltése és ellenőrzése |
| [OpenCode CLI](ports/opencode-cli.md) | [Pluginek](https://docs.opencode.ai/docs/plugins/), [MCP](https://docs.opencode.ai/docs/mcp-servers/) | stabil plugin-API és MCP-hívások callbackjei |

## Közös munkatételek

### K01 — Kiindulópont és hostverziók rögzítése

- Forrás: a fenti BFS-commit és a portlapok telepítési/formátumhivatkozásai.
- Munka: az 1.1.0 utáni forrás kiválasztása; minden hosthoz pontos stabil alkalmazásverzió,
  hivatalos dokumentációs dátum, telepítési mód, PowerShell-/Windows-előfeltétel rögzítése.
- Érintett helyek: `installers/npm/package.json`, a setup host-felismerése és a portok tesztadatai.
- Kész: nincs kitalált minimumverzió; a kiválasztott verzióhoz ellenőrizhető helyi help/séma tartozik.
  A BFS meglévő Node 24+ és Windows x64 követelménye külön szerepel a host követelményeitől.

### K02 — Teljes skill- és képességmátrix

- Forrás: `plugins/bontaflowstack/catalog.json`, `HOST.md`, a portlapok skill-/eszközdokumentációja.
- Munka: minden skill, mód, hivatkozott natív eszköz, engine és alagentfüggés felvétele;
  besorolás kötelező alapként vagy név szerinti külön képességként.
- Kész: mind a 34 skill összes katalógusbeli módja rendelkezik hostonkénti sorral, elérhetőséggel,
  hivatalos indokkal és tesztazonosítóval. A nem elérhető mód a meghíváskor is világos eredményt ad.
- Függőség: K01 és az adott host első próbája. A módlista a katalógusból készül, nem külön kézi másolatból.

### K03 — Hostkontextus és hívási szerződés

- Forrás: `core/claude-context.mjs`, `core/claude-host.mjs`, `core/claude-hook.mjs`,
  `core/context.mjs`, `core/state.mjs`; az egyes portlapok konkrét hook-/plugin-szerződései.
- Munka: a valódi projekt, workspace, munkamenet, agent és hívás összerendelése;
  a csak valóban azonos ellenőrzések megosztása a meglévő kódból.
- Kész: az MCP-szerver induláskori környezete nem helyettesíti az aktuális hívásazonosságot;
  hiányzó, hamisított, lejárt, ismételt vagy más munkához tartozó kötés elutasított.
  Natív shellre nem állítunk olyan blokkolási garanciát, amelyet a host nem biztosít.
- Függőség: az adott host G01/P01/C01/O01 próbája. Nincs általános adapterkeretrendszer előre megírva.

### K04 — Build és platformutasítások

- Forrás: `scripts/build-npm-package.mjs`, `scripts/build-claude-package.mjs`,
  `adapters/claude-code/`, a portok formátumhivatkozásai.
- Munka: hostonkénti csomagkimenet és natív manifest; közös skilltartalom és célzott hosteltérések;
  verzióazonosság és fájlleltár ellenőrzése. Csak az új port által szükségessé tett közös részt kell kiemelni.
- Kész: nincs idegen host eszköznevére, változójára vagy nem csomagolt fájlra mutató aktív utasítás;
  a Codex/Claude kimenet nem romlik; minden csomag- és MCP-manifest a választott host sémájának megfelelő.
- Ellenőrzés: `tests/npm-package.test.mjs`, `tests/claude-package.test.mjs` és az új host csomagtesztje.

### K05 — Egyparancsos setup és helyreállítás

- Forrás: `installers/npm/bin/setup.mjs` és a portlapok telepítési szerződései.
- Munka: új hostok felderítése, verzióellenőrzése, saját regisztrációja és visszaolvasása;
  a `layout`, `candidates`, selector/help, manifestleltár és verziózott tartós másolat bővítése.
  A közös motorok/Impeccable egyszer készülnek elő. Meglévő felhasználói beállítások megőrzendők.
- Kész: tiszta telepítés, ismétlés, frissítés, megszakadt telepítés helyreállítása és ütköző BFS-regisztráció kezelése bizonyított.
  Egy host hibája nem jelent hamis összesített sikert vagy más host adatainak törlését.
  Az eredmény hostonként megkülönbözteti az elhelyezett, regisztrált, újratöltésre váró és ellenőrzött állapotot.
- Ellenőrzés: `tests/npm-setup.test.mjs`, `tests/npm-setup.integration.mjs` izolált konfigurációkkal.
  A natív eltávolítás/tesztkörnyezet-takarítás csak BFS-tulajdonú elemet érint; külön új terjesztési út nem készül.

### K06 — Megosztott memória, elkülönített munka, megszakítás

- Forrás: `core/workflow.mjs`, `core/memory.mjs`, `core/guard.mjs`, `core/tasks.mjs`,
  valamint a portlapok session- és tool-eseményei.
- Munka: ugyanazon projekt memóriájának megosztása; hostonként és munkamenetenként külön tulajdon;
  már mentett lépésekből folytatás akkor is, ha a lezáró esemény kimarad.
- Kész: két host ugyanazt a memóriát eléri, de nem zárja le egymás workflow-ját/böngészőjét/guardját;
  cwd-váltás, Git-worktree és nem Git projekt megkülönböztetett; megszakítás után nincs kitalált sikeres lezárás.
- Függőség: K03. Más gépek közötti memóriaszinkron nem része a tervnek.

### K07 — Elfogadási bizonyíték

- Forrás: `tests/host-context.test.mjs`, `tests/claude-host.test.mjs`, `tests/claude-guard.test.mjs`,
  `tests/claude-engine.integration.mjs`, az új host portlapjának próbái.
- Munka: az alábbi A01–A10 esetek végrehajtása az adott új hoston; csomagteszt és natív eredmény külön rögzítve.
- Kész: a kötelező alap minden sora megfigyelt eredménnyel rendelkezik; eltérés esetén javítás és célzott újrapróba.
  Új kódváltozás után a kapcsolódó Codex/Claude regressziós ellenőrzések is lefutnak.

### K08 — Dokumentáció és kiadás-előkészítés

- Forrás: `scripts/check.mjs`, `tests/npm-release.test.mjs`, `docs/bontaflowstack/RELEASE-PROCESS.md`, hostprofilok.
- Munka: egyetlen npm-parancsos README/telepítési útmutató, támogatott hostverziók,
  pontos képességprofil, hiba-/újratöltési üzenetek, csomagleltár és kiadási bizonyíték frissítése.
- Kész: a tarballból indított izolált npm-setup a tényleges csomagtartalmat telepíti;
  új port csak igazolt állapotának megfelelően van feltüntetve. Publikálás előtt külön felhasználói engedély kell.

## Közös elfogadási esetek

| ID | Megfigyelendő eredmény |
| --- | --- |
| A01 | Tiszta Windows x64 profilon az npm-parancs telepít; a host a megfelelő verziót és összetevőket betölti. |
| A02 | Mind a 34 skill felfedezhető; összes módja besorolt; legalább egy tényleges tervezés → megvalósítás → ellenőrzés út végigfut. |
| A03 | Projektmemória írás/olvasás, checkpoint, munkamenet bezárás és új munkamenetből ellenőrzött folytatás. |
| A04 | Két munkamenet és két projekt között nincs jogosulatlan állapot-/böngészőkeveredés; cwd-váltás és worktree kezelése. |
| A05 | Hiányzó/hibás híváskontextus, hookhiba, timeout és megszakítás nem ad hamis BFS-műveleti sikert; a natív guard korlátja kimért. |
| A06 | Tényleges böngészőmegnyitás, olvasás/interakció, renderelés és Impeccable-művelet; a doctor eredménye önmagában nem elég. |
| A07 | Emberi böngészős átadás és ugyanazon session folytatása; más hosthoz tartozó tab/folyamat érintetlen. |
| A08 | Ismételt setup és frissítés megőrzi az adatokat és idegen beállításokat; hiba után helyreállítható. |
| A09 | Hiányzó extra képesség konkrétan jelzett; párhuzamos mód csak külön alagent-azonossági próba után használható. |
| A10 | Telepített csomagból végzett próba és meglévő Codex/Claude regresszió eredménye a vizsgált tartalomhoz kötve. |

## Függőségek és végrehajtás

1. K01 után G01, P01, C01 és O01 rövid próbái következnek. Ezek a költséges teljes portok előtt a bizonytalan mechanikát döntik el.
2. K02/K03 az adott próba eredményére épül. A hiányzó hivatalos garancia vizsgálati feladat, nem feltételezett képesség.
3. Platformonként a portlap 02–06 tételei és K04–K06 kapcsolódó részei készülnek el.
4. A port 07 tétele + K07 adja az elfogadást; K08 készíti elő a külön kiadási döntést.
5. Egy új host sem változtatja meg hallgatólagosan a már telepített hostok viselkedését vagy a közös állapot formátumát.

Az első megvalósítási feladat K01, utána a négy 01-es próba. A specifikáció közzététele dokumentációs lépés;
megvalósítás, hosttelepítés és npm-kiadás ebben a munkafázisban nem történt.
