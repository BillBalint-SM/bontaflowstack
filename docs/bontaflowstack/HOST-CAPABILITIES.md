# A négy új host képességprofilja

Állapot: 2026-10-13; fejlesztési jelöltek, nem elfogadott vagy publikált portok.
A módleltár forrása a [skillkatalógus](../../plugins/bontaflowstack/catalog.json).
A táblázat minden módot név szerint felsorol; egy sor azonos feltételű módokat
csoportosít. A katalógus és e lista egyezését a `host-capabilities` ellenőrzés vizsgálja.
Ez tartalmi leltár, nem az összes mód gyakorlati működésének bizonyítéka.

## Hostonkénti közös feltételek

Mind a négy cél Windows x64 és Node 24+. A natív modellnek elérhetőnek kell lennie,
a hostnak be kell töltenie a megfelelő csomagot, és saját szabályai szerint engednie
kell a szükséges eszközöket. Az npm-setup nem ad tool-engedélyt. Minden BFS-híváshoz
a tényleges session/workspace kötése kell; a hiányzó kötést nem helyettesíti shellhívás.

| Oszlop | Vizsgált host | Natív feltétel és jelenlegi korlát | Forrás és megfigyelés |
| --- | --- | --- | --- |
| G | Gemini CLI 0.63.0 | Extension, engedélyezett BeforeTool argumentummódosítás és MCP; az npm-ből indított skill/model próbát a napi ingyenes kvóta blokkolta. | [Gemini-port](ports/gemini-cli.md), E19–E20 |
| P | GitHub Copilot CLI 1.0.96 | Agent Plugins csomag, preToolUse módosítás, engedélyezett MCP és a feladat natív eszközei; a host timeoutja önmagában nem bizonyít tiltást. | [Copilot-port](ports/copilot-cli.md), E27–E28, E40, E42, E48, E50 |
| C | Cursor IDE 3.24.12 | Helyi plugin, aktív preToolUse és argumentummódosítás, engedélyezett MCP; az importkapcsoló kikapcsolása a plugin-hookokat is kikapcsolta. E61/E64: natív státusz és memória-skillút importált BFS mellett. E65: browser/render/Impeccable lefutott, négy üres hookválasz miatti megtagadás után; ok nyitott. E66: emberi kattintás igazolt, natív folytatás keretkimerülés miatt nem indult. | [Cursor-port](ports/cursor-ide.md), E29–E31, E51, E61, E64–E66 |
| O | OpenCode CLI 1.19.0, V1 API | Config callback, tool.execute.before, engedélyezett MCP és feladateszközök. Health és context sikeres; a szabad modell context-próbájában bash:ask kellett, shell nem futott. A teljes tiltás melletti upstream elutasítást a setup nem írhatja felül. | [OpenCode-port](ports/opencode-cli.md), E33–E37, E55 |

A verziók a vizsgált verziók; ez a lista nem állítja, hogy minden későbbi verzió
megfelel. A Cursor CLI, felhős agentek, OpenCode Desktop, macOS és Linux nem e profil részei.

## A jelölések jelentése

- **Alap:** az elfogadott port kötelező soros működéséhez tartozik. A jelenlegi
  részpróbák nem jelentik a port elfogadását.
- **Extra:** kérhető kiegészítés; hiánya név szerint jelentendő, és nem teszi
  elérhetetlenné a többi alapműveletet.
- **U:** az instrukció és csomagolás jelen van, de a mód teljes natív feladatútja
  nincs igazolva. Nem jelenti sem a támogatás elfogadását, sem az elérhetetlenséget.
- **B:** megfigyelt hívási akadály. A Cursor korábbi közös kötési akadályát
  E61/E64 feloldotta; a még nem vizsgált módok ezért U jelölésűek.
- **N:** az adott mód egy konkrét natív npm-feladatútja sikeres, a hivatkozott
  bizonyíték szűk határán. Más projektre, modellre és összes bemenetre nem garancia.
- **X:** az extra műveletet a port nem biztosítja. `U + X`/`B + X` esetén az
  alapút és a kizárt extra külön értendő.

E-számok: a [megvalósítási napló](HOST-EXPANSION-IMPLEMENTATION.md)
azonos számú bizonyítékpontjai. E-BUILD a négy host csomagtesztje és E29/E33
natív felfedezési eredménye; ez csak csomagolási/felfedezési bizonyíték.
E-BOUNDARY a négy host hook/MCP folyamatpróbája; ez nem skill/model elfogadás.
E-NONE azt jelenti, hogy az adott módra nincs tényleges natív feladatút-bizonyíték.

## Teljes módleltár

Minden sorra érvényesek a fenti hostfeltételek. A további feltétel az adott
módhoz szükséges hozzáférést jelöli; a telepítés ezt sem biztosítja automatikusan.

| Skill | Mód | Besorolás | További feltétel | G | P | C | O | Bizonyíték |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bfs-router` | `route`, `guide` | Alap | Aktuális projekt és elérhető célskill; soros útválasztás | U | U | U | U | E-BUILD; E-NONE |
| `bfs-router` | `setup` | Alap | Helyes npm-verzió, telepítő-hozzáférés, natív trust és szükség esetén újratöltés | U | U | U | U | E19/E27/E29/E35: npm-setup; a skill útja E-NONE |
| `bfs-implement` | `implement` | Alap + extra | Elfogadott alap, engedélyezett szerkesztés és tesztparancs; párhuzamos végrehajtás kizárva | U + X | N + X | U + X | U + X | E48: Copilot elfogadási checkpoint, tényleges RED/GREEN, mentett output és külön elfogadási próba |
| `bfs-business-builder` | `explore`, `diagnose` | Alap | Felhasználói cél és döntések; szükség szerint olvasható források | U | U | U | U | E-BUILD; E-NONE |
| `bfs-spec` | `draft`, `revise` | Alap | Projektolvasás, specifikáció írása a kért helyre | U | U | U | U | E-BUILD; E-NONE |
| `bfs-autoplan` | `review` | Alap + extra | Olvasható terv, soros review; párhuzamos BFS-review nincs engedélyezve | U + X | U + X | U + X | U + X | E-BUILD; E-NONE |
| `bfs-plan-ceo-review` | `review` | Alap | Olvasható terv és üzleti cél | U | U | U | U | E-BUILD; E-NONE |
| `bfs-plan-eng-review` | `review` | Alap | Olvasható terv, kód és projektutasítások | U | N | U | U | E48: Copilot forrásolvasás, mentett engineering review és soros workflow |
| `bfs-plan-design-review` | `review` | Alap | Olvasható tervezett képernyők és folyamatok; nem helyettesít böngészős mérést | U | U | U | U | E-BUILD; E-NONE |
| `bfs-plan-devex-review` | `review` | Alap | Olvasható interfész- és onboardingterv | U | U | U | U | E-BUILD; E-NONE |
| `bfs-plan-tune` | `inspect` | Extra | Preferenciák olvasása | U | U | U | U | E28/E36: preferences effective; a skill módja E-NONE |
| `bfs-plan-tune` | `configure`, `proposals` | Extra | Tényleges felhasználói választás és állapotírás; panel helyett chat megengedett | U | U | U | U | E-BUILD; E-NONE |
| `bfs-design-consultation` | `consult`, `refine` | Alap | Designbrief, olvasás/írás és valós felhasználói választás | U | U | U | U | E-BUILD; E-NONE |
| `bfs-design-consultation` | `variants` | Alap | Render MCP, sandboxolt Chromium, írható projekt és képeredmény megtekintése | U | U | U | U | E-BUILD; E-NONE |
| `bfs-design-consultation` | `images` | Alap + extra | Megadott asset vagy készített HTML/SVG; raszteres generálás/szerkesztés kizárva, képértés modellfüggő | U + X | U + X | U + X | U + X | Generált skillutasítás; E-NONE |
| `bfs-design-html` | `implement`, `refine` | Alap + extra | Elfogadott design, fájlszerkesztés, render és screenshot-megtekintés; külső rasztergenerálás nincs bekötve | U + X | U + X | U + X | U + X | E-BUILD; E-NONE |
| `bfs-design-review` | `inspect` | Alap | Browser MCP, elérhető céloldal és képeredmény megtekintése | U | U | U | U | E-BUILD; E-NONE |
| `bfs-design-review` | `fix` | Alap | Browser MCP, engedélyezett forrásjavítás és ismételt ellenőrzés | U | U | U | U | E-BUILD; E-NONE |
| `bfs-browse` | `browse` | Alap | Browser MCP és elérhető URL; csak engedélyezett interakciók | U | N | U | N | E42/E56: natív Copilot/OpenCode, helyi oldal, kattintás, visszaolvasás és saját cleanup; E56 teljes engine-próbája az Impeccable-híváson hibázott. E65 Cursor motorútja lefutott, de az időszakos hookhiba miatt U marad |
| `bfs-browse` | `open`, `login` | Alap | Látható saját böngésző és emberi átadás, ugyanazon session folytatása | U | U | B | U | E65/E66: Cursor látható átadás és emberi kattintás igazolt; a natív resume eszközhívás előtt keretkorlátba ütközött. Valódi fiókbelépést ez a fixture nem vizsgált |
| `bfs-scrape` | `extract`, `answer` | Alap | Browser MCP, ténylegesen hozzáférhető oldal és szükség esetén emberi belépés | U | U | U | U | E-BUILD; E-NONE |
| `bfs-benchmark` | `quick`, `baseline`, `compare` | Alap | Browser MCP és összehasonlítható mérési környezet; compare esetén létező baseline | U | U | U | U | E-BUILD; E-NONE |
| `bfs-benchmark` | `trend` | Alap | Olvasható, összevethető korábbi mérési adatok | U | U | U | U | E-BUILD; E-NONE |
| `bfs-bug-issue-investigate` | `diagnose` | Alap | Hibaadatok, kód és engedélyezett reprodukció | U | U | U | U | E-BUILD; E-NONE |
| `bfs-bug-issue-investigate` | `fix` | Alap | Igazolt reprodukció, engedélyezett szerkesztés és regressziópróba | U | U | U | U | E-BUILD; E-NONE |
| `bfs-review` | `inspect`, `fix` | Alap | Azonosított diff, követelmények; fix esetén módosítás és ellenőrzés | U | U | U | U | E-BUILD; E-NONE |
| `bfs-cso-audit` | `audit` | Alap | Olvasható, engedélyezett kódbázis és ellenőrzési határ | U | U | U | U | E-BUILD; E-NONE |
| `bfs-health` | `check` | Alap | A projekt meglévő ellenőrző parancsának engedélyezett futtatása | U | N | U | N | E28/E36: natív skill, HOST, preferencia, status és fixture-teszt; E48: Copilot workflow utolsó lépése |
| `bfs-qa` | `inspect` | Alap | Browser MCP, célfolyamat és engedélyezett tesztadatok; coverage-feltételek lent | U | U | U | U | E-BUILD; E-NONE |
| `bfs-qa` | `fix` | Alap | A QA feltételei és engedélyezett forrásjavítás/újrapróba | U | U | U | U | E-BUILD; E-NONE |
| `bfs-documentation` | `create`, `update`, `coverage` | Alap | Olvasható forrás; create/update esetén engedélyezett dokumentumírás | U | U | U | U | E-BUILD; E-NONE |
| `bfs-finisher` | `prepare` | Alap | Git-állapot és friss ellenőrzési eredmények | U | U | U | U | E-BUILD; E-NONE |
| `bfs-finisher` | `publish` | Alap | Kért konkrét külső művelet, Git/hosting-hozzáférés és ellenőrzött tartalom | U | U | U | U | E-BUILD; E-NONE |
| `bfs-prod-deploy` | `inspect`, `verify` | Alap | A kijelölt integráció/telepítés állapotának olvasása, szükséges hitelesítés | U | U | U | U | E-BUILD; E-NONE |
| `bfs-prod-deploy` | `integrate`, `deploy` | Alap | Kért konkrét külső művelet, friss bizonyíték és célszolgáltatás hozzáférése | U | U | U | U | E-BUILD; E-NONE |
| `bfs-landing-report` | `report` | Alap | Meglévő feladat-/integrációs adatok olvasása; nem indít workert | U | U | U | U | E-BUILD; E-NONE |
| `bfs-bontaflow-memory` | `read` | Alap | A tényleges projekthez kötött állapot olvasása | U | N | U | N | E40/E55: Copilot/OpenCode új session és másik projekt; E52: közös memória két Git-worktree-ben |
| `bfs-bontaflow-memory` | `write` | Alap | Kért állapotmódosítás és tényleges forrás | U | N | N | N | E40/E55: Copilot/OpenCode forráshoz kötött döntés és visszaolvasás; E64: Cursor telepített skill, natív memóriaírás és history-visszaolvasás |
| `bfs-bontaflow-memory` | `prune`, `export`, `import` | Alap | Kért állapotmódosítás vagy kijelölt export/import; prune csak konkrét rekordokon | U | U | U | U | E-BOUNDARY; E-NONE |
| `bfs-save-context` | `pause`, `list` | Alap | Saját workflow/checkpoint, pause esetén írható állapot | U | N | U | N | E40/E55: Copilot/OpenCode teljes pause-snapshot és másik projekt üres listája |
| `bfs-save-context` | `save`, `export` | Alap | Saját workflow/checkpoint és írható állapot; exportnál kijelölt cél | U | U | U | U | E-BOUNDARY; E-NONE |
| `bfs-load-context` | `resume` | Alap | Meglévő snapshot, driftellenőrzés és kért tulajdonátvétel | U | N | U | N | E40/E55: Copilot/OpenCode új session, drift és megőrzött snapshot; E50: Copilot leállított folyamat után azonos session, saját lépés újraellenőrzése |
| `bfs-load-context` | `load`, `import` | Alap | Meglévő snapshot; importnál kijelölt fájl és kérés | U | U | U | U | E-BOUNDARY; E-NONE |
| `bfs-guard` | `status`, `warnings`, `boundary`, `combined`, `release`, `off` | Extra | Kifejezett kérés, tényleges hookmegfigyelés; az editkorlát nem shell-sandbox | U | U | U | U | E-BOUNDARY; E28/E36 guardjelzés, teljes skillút E-NONE |
| `bfs-retro` | `report` | Alap | Tényleges munka- és ellenőrzési nyomok olvasása | U | U | U | U | E-BUILD; E-NONE |
| `bfs-prototype` | `explore` | Alap | Elkülönített írható kísérleti könyvtár és engedélyezett próbaeszközök | U | U | U | U | E-BUILD; E-NONE |
| `bfs-triage` | `report` | Alap | Hibaadatok és projektforrások olvasása | U | U | U | U | E-BUILD; E-NONE |
| `bfs-wayfinder` | `guide` | Alap | Aktuális projekt- és munkafolyamat-adatok olvasása | U | U | U | U | E-BUILD; E-NONE |
| `bfs-learn` | `practice`, `review` | Alap | Kijelölt gyakorlókönyvtár; practice esetén írás/futtatás, review esetén valós bizonyíték | U | U | U | U | E-BUILD; E-NONE |

A QA `quick`, `full`, `regression`, `diff` értékei lefedettségek, nem külön
módok. A `regression` megnevezett baseline-t, a `diff` konkrét diffBase-t
igényel; mindkettőre és mindkét QA-módra a fenti U/B státusz vonatkozik.

## A módokon belüli közös műveletek és extrák

| Művelet | Besorolás | G / P / C / O állapota és bizonyítéka |
| --- | --- | --- |
| Soros BFS-hívás, natív session és workspace | Alap | Mind a négy host natív status hívása igazolt, Cursor teljes csomagjában E61/E64. Ez önmagában nem igazolja az összes skillutasítás végrehajtását. |
| Browser és render | Alap | P/O: natív helyi kattintás és render igazolt, E42/E56. C: E65-ben lefutott időszakos hookhibák utáni ismétlésekkel, oka nyitott. G: U. Sandbox kikapcsolása nem elfogadott kerülőút. |
| Impeccable design-detect | Alap | Mind a négy npm-setup próbában tényleges motorfutás történt. P/C: natív MCP-ből a CSS-fixture várt találata igazolt, E42/E65; a Cursor teljes motorútja hookhibákat is tartalmazott. G/O: modellút U. A CSS-próba nem állít HTML-beágyazott CSS-lefedést. |
| Látható böngésző és emberi átadás | Alap | C: E65/E66 látható handoff, emberi kattintás és cookie igazolt; a natív resume keretkorlát miatt B. G/P/O: U. Egy közös teljes átadás elegendő, a hostonkénti ismétlés nem követelmény. |
| Projekten kívüli könyvtár kiválasztása | Extra | MCP elicitation és tényleges emberi igen kell. Mind a négy hoston U/B; nem támogatott elicitation esetén a kijelölés hibával megáll. |
| Párhuzamos BFS-alagentek | Extra | Mind a négy adapterben X: a child-session tulajdonkötés nincs elfogadva. A host natív alagentjeinek léte nem oldja ezt fel; soros munka megengedett. |
| Raszteres képgenerálás/szerkesztés | Extra | Mind a négy adapterben X, felhasználó által elfogadott kihagyás. A HTML/SVG és megadott asset nem rasztergenerálás. |
| Kép megtekintése/értelmezése | Extra bemenet, vizuális ellenőrzésnél szükséges | P/O/C: a vizsgált modelleken a PNG-k natív átadása/megnyitása igazolt, E42/E56/E65; ez nem általános vizuális pontosságmérés. G: U. A render önmagában nem bizonyít képátadást. |
| Pretext mért szövegelrendezés; Google DESIGN.md integráció | Extra | A forrásutasítások megőrzik a feltételes használatot; natív feladatút U. Nem előfeltétele az egyszerű CSS-es feladatnak. |
| Kérdéspanel | Extra | Natív kérdezőeszköz esetén használható; mind a négy porton a panelút U. Chatben feltett kérdés és valós válasz a megengedett alapút. |

Kiadás előtt a [specifikáció A01–A10 feltételei](HOST-EXPANSION-SPEC.md#kötelező-esetek)
szerint kell frissíteni e profil bizonyítékait. A U vagy B nem nevezhető működő,
elfogadott portnak; az N sem terjed ki a sorban meg nem nevezett műveletekre.
