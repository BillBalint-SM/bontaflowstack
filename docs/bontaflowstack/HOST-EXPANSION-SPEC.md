## Problem Statement

A BontaFlowStack felhasználója jelenleg Codex vagy Claude Code alatt tudja használni az 1.1.0 csomagot.
A Gemini CLI, GitHub Copilot CLI, Cursor IDE és OpenCode CLI felhasználói számára nincs elkészült,
ellenőrzött BFS port. A skillek egyszerű átmásolása nem biztosítja a projektmemória,
a checkpointok, a munkafolyamat-tulajdon, az MCP-eszközök és az eseménykezelés megfelelő együttműködését.

A csomag gazdája egyetlen, npm-alapú telepítési utat kíván fenntartani, amely automatikusan elvégzi
a támogatott hostok BFS-telepítését és konfigurálását. A támogatás tartalmának hostonként pontosnak
kell lennie: a dokumentált lehetőség, az adapterteszt és a tényleges natív működés eltérő bizonyíték.

## Solution

A meglévő BFS-mag köré négy önálló BFS port készül: **Gemini CLI, GitHub Copilot CLI, Cursor IDE,
OpenCode CLI**, első körben **natív Windows x64** környezetre.

A felhasználói belépő továbbra is `npx bontaflowstack@<pontos-verzió> setup`.
A setup felismeri a támogatott, telepített hostokat, tartós helyre telepíti a hozzájuk tartozó
BFS-összetevőket, beállítja a szükséges kapcsolatokat, előkészíti a közös motorokat és visszaellenőrzi
az eredményt. A felhasználónak nem kell BFS-fájlokat másolnia vagy konfigurációt szerkesztenie.
A már futó alkalmazás felhasználói újratöltése megengedett; a setup nem zárhatja be erővel.

Minden port kötelező alapja a skill- és módlefedettség, feladatirányítás, projektmemória,
soros munkafolyamat, checkpoint és folytatás, projekt-/munkamenet-elkülönítés,
böngésző, renderelés, Impeccable, valamint az engedélyezés és a guard tényleges határainak helyes kezelése.
A párhuzamos alagentmunka, a natív raszteres képgenerálás/-szerkesztés és a host saját kérdésfelülete
külön képességként szerepel. A Capability profile minden érintett skillmód elérhetőségét és bizonyítékát megnevezi.
Hiányzó alapfunkció mellett a port nem minősül támogatottnak.

A megvalósítás a négy host kritikus mechanikáinak rövid próbájával kezdődik, majd a teljes portok sorrendje:
**Gemini CLI → GitHub Copilot CLI → Cursor IDE → OpenCode CLI**. Platformonként külön elfogadás és kiadás-előkészítés történik.

## User Stories

1. Windows x64 fejlesztőként egyetlen npm-paranccsal szeretném telepíteni a BFS-t, hogy kézi csomagkezelés nélkül használhassam.
2. Több agentet használó fejlesztőként szeretném, ha a setup felismerné a telepített, támogatott hostjaimat, hogy mindenütt ugyanazt a BFS-verziót kapjam.
3. Meglévő Codex- vagy Claude Code-felhasználóként szeretném megőrizni a működő telepítésemet, hogy az új portok ne okozzanak regressziót.
4. Felhasználóként szeretném előre látni a Windows-, Node-, shell- és hostverzió-követelményeket, hogy a telepítési hiba oka egyértelmű legyen.
5. Felhasználóként szeretném, ha a setup megőrizné más pluginek és MCP-szerverek beállításait, hogy a meglévő környezetem használható maradjon.
6. Felhasználóként ugyanazzal az npm-alapú úttal szeretném frissíteni a BFS-t, hogy ne kelljen új telepítési módszert megtanulnom.
7. Felhasználóként szeretném biztonságosan újrafuttatni a setupot, hogy egy ismétlés ne duplikálja a regisztrációkat.
8. Felhasználóként szeretném helyreállítani a megszakadt telepítést, hogy megmaradjanak az adataim és az előzőleg működő elemek.
9. Felhasználóként hostonként pontos telepítési eredményt szeretnék látni, hogy az elhelyezett fájlt ne tévesszem össze az aktívan betöltött pluginnel.
10. Cursor-felhasználóként magam szeretném újratölteni az ablakot, hogy a setup ne veszélyeztesse a mentetlen munkámat.
11. Felhasználóként konkrét jelzést szeretnék kapni hiányzó vagy nem támogatott host esetén, hogy ne kapjak félrevezető sikerüzenetet.
12. BFS-felhasználóként szeretném elérni a 34 skill belépőjét, hogy a csomag megszokott feladatait az új hostban is megtaláljam.
13. BFS-felhasználóként minden skillmódhoz pontos képességbesorolást szeretnék, hogy az elérhető működés egyértelmű legyen.
14. BFS-felhasználóként a nem elérhető extra meghívásakor világos választ szeretnék, hogy a rendszer ne helyettesítse csendben más művelettel.
15. BFS-felhasználóként a saját hostom eszközeit és parancsait szeretném látni az instrukciókban, hogy idegen platformhivatkozások ne akadályozzák a munkát.
16. Több hostot használó fejlesztőként közös projektmemóriát szeretnék ugyanazon projekthez, hogy a rögzített döntéseket minden host elérje.
17. Több projekten dolgozó fejlesztőként elkülönített projektállapotot szeretnék, hogy egyik projekt adatai ne kerüljenek a másik munkájába.
18. Több munkamenetet használó fejlesztőként külön workflow-tulajdont szeretnék, hogy az agentek ne zárják le egymás feladatait.
19. BFS-felhasználóként a ténylegesen elvégzett lépésekről checkpointot szeretnék, hogy megszakítás után legyen ellenőrizhető folytatási alapom.
20. BFS-felhasználóként új munkamenetben is szeretném folytatni a mentett munkát, hogy egy bezárt agentablak ne veszítse el az előrehaladást.
21. Fejlesztőként cwd-váltás közben is a helyes projekthez szeretnék tartozni, hogy egy shellművelet ne változtassa meg véletlenül a feladat tulajdonát.
22. Git-worktree-ket használó fejlesztőként szeretném a projekt és a külön munkapéldány megkülönböztetését, hogy megosztott memória mellett elkülönített munka maradjon.
23. Nem Git projektben dolgozó felhasználóként is megbízható workspace-azonosítást szeretnék, hogy a BFS ne csak repókban működjön.
24. Felhasználóként szeretném az idegen, lejárt vagy megismételt híváskötések elutasítását, hogy azok ne módosíthassák a BFS-állapotot.
25. Felhasználóként szeretném ismerni a guard tényleges hostoldali határait, hogy ne feltételezzek nem létező blokkolási garanciát.
26. Felhasználóként szeretném megtartani a host engedélyezési és bizalmi döntéseit, hogy a BFS-setup ne hagyjon jóvá műveleteket helyettem.
27. BFS-felhasználóként ténylegesen működő böngészős olvasást és interakciót szeretnék, hogy webes feladatokat végezhessek az új hostból.
28. BFS-felhasználóként renderelési képességet szeretnék, hogy a vizuális eredményt ellenőrizhessem.
29. BFS-felhasználóként automatikusan beállított Impeccable-t szeretnék, hogy a szükséges tervezési műveletekhez ne kelljen kézi konfiguráció.
30. BFS-felhasználóként látható böngészőben szeretném elvégezni az emberi bejelentkezést, majd ugyanabban a sessionben folytatni, hogy az átadás ne törje meg a munkát.
31. Több hostot használó felhasználóként szeretném, ha egy művelet csak a saját böngészőjét és folyamatait kezelné, hogy a másik munkám érintetlen maradjon.
32. Párhuzamos munkát kérő felhasználóként csak igazolt alagent-azonosság mellett szeretném használni ezt a módot, hogy minden feladatnak egyértelmű tulajdonosa legyen.
33. Felhasználóként külön jelzést szeretnék a még nem igazolt párhuzamos képességről, hogy a soros működést ne tévesszem össze teljes alagenttámogatással.
34. Vizuális feladatot végző felhasználóként pontosan szeretném látni a natív képképességeket, hogy a BFS ne ígérjen nem elérhető raszteres generálást vagy szerkesztést.
35. Felhasználóként a hostban valóban működő kérdés- és válaszadási módot szeretném használni, hogy az engedélykérés és a választás ténylegesen eljusson hozzám.
36. Gemini CLI-felhasználóként natív extensionként szeretném használni a BFS-t, hogy a skillek, MCP-eszközök és hookok a Gemini saját szabályai szerint töltődjenek be.
37. Gemini CLI-felhasználóként lezáró hook nélkül is helyreállítható mentett munkát szeretnék, hogy a kilépéskor félbemaradó callback ne legyen az egyetlen mentési pont.
38. Copilot CLI-felhasználóként a natív pluginregisztrációban szeretném látni a BFS-t és verzióját, hogy a telepítés állapotát ellenőrizhessem.
39. Copilot CLI-felhasználóként szeretném megkülönböztetni a hookhibát és a timeoutot, hogy egyikből se keletkezzen hamis BFS-műveleti siker.
40. Copilot CLI-felhasználóként agenttípusonként pontos alagenttámogatást szeretnék, hogy a hiányzó lifecycle-esemény ne legyen elrejtve.
41. Cursor IDE-felhasználóként világos jelzést szeretnék tiltott helyi pluginimport esetén, hogy tudjam, mely hostszabály akadályozza a betöltést.
42. Cursor IDE-felhasználóként szeretném az azonos nevű marketplace-plugin és helyi BFS-példány ütközésének felismerését, hogy ne rossz verzió fusson észrevétlenül.
43. OpenCode CLI-felhasználóként a telepített stabil verziómnak megfelelő plugin-API-t szeretnék, hogy az eltérő API-generációk ne keveredjenek.
44. OpenCode CLI-felhasználóként az MCP-hívásokon is igazolt callbackkezelést szeretnék, hogy a kontextus és a tiltás valóban az eszközvégrehajtásra hasson.
45. OpenCode CLI-felhasználóként szeretném megőrizni a meglévő konfigurációs szintjeimet és megjegyzéseimet, hogy a BFS telepítése ne írja át a környezetem jelentését.
46. Windows-felhasználóként natív Windows-próbával igazolt támogatást szeretnék, hogy egy WSL alatti siker ne helyettesítse az általam használt környezet ellenőrzését.
47. Karbantartóként minden platformfeladathoz hivatalos forrást és verziót szeretnék, hogy a port saját szerződése alapján készülhessen el.
48. Karbantartóként külön szeretném látni a dokumentált, szerződéspróbával és natív futással ellenőrzött eredményeket, hogy a támogatási állítás visszakövethető legyen.
49. Karbantartóként a nyilvános működésen keresztül szeretném tesztelni a csomagot, hogy egy belső refaktor ne tegye értelmetlenné a próbákat.
50. Karbantartóként a tényleges npm-csomagból szeretném végrehajtani az elfogadási próbát, hogy a buildből kimaradt fájlok is kiderüljenek.
51. Karbantartóként meg szeretném őrizni a Codex/Claude Code működését, hogy a közös mag bővítése ne rontsa a korábbi támogatást.
52. Csomaggazdaként platformonként szeretném elfogadni a portokat, hogy egy bizonytalan host ne kényszerítsen hamis összesített készültséget.
53. Csomaggazdaként külön szeretnék dönteni a publikálásról, hogy a specifikáció elkészítése ne indítson automatikus npm-kiadást.
54. Felhasználóként szeretném, ha a diagnosztikai bizonyítékok nem tartalmaznának titkot vagy szükségtelen személyes adatot, hogy a hibakeresés megosztható maradjon.

## Implementation Decisions

### Közös döntések

1. A kiindulópont a lezárt Codex/Claude Code 1.1.0 kiadás utáni forrásállapot. A régebbi tervezési checkout nem válhat észrevétlenül implementációs alappá.
2. A BFS host egy konkrét alkalmazásfelület. A termék CLI-, IDE- és felhős változatai külön kompatibilitási célok; egy port eredménye nem terjed át automatikusan másik felületre.
3. A közös Node-mag, projektmemória, workflow, checkpoint, task- és engine-mechanika megmarad. Hostonként csak a szükséges csomagolás, instrukcióeltérés, natív kontextus, eseménykezelés és regisztráció készül el.
4. A ténylegesen azonos ellenőrzések újrahasználhatók. Általános adapterkeretrendszer előzetes kiépítése nem cél; közös szerződés csak a konkrét portigényből emelhető ki.
5. A skillkatalógus marad a skill- és módleltár forrása. A Capability profile minden módhoz rögzíti az alap/extra besorolást, elérhetőséget, hostfeltételt és bizonyítékot.
6. A host-kontextushoz valódi projekt-, workspace-, session- és szükség esetén agentazonosság kell. Egy hosszú életű MCP-folyamat induláskori környezete nem helyettesíti az aktuális hívás kontextusát.
7. Az állapotmódosító BFS-eszközök ellenőrzik a hívás és tulajdon összetartozását. A hiányzó, hamisított, lejárt, visszajátszott vagy idegen kötés elutasítandó. A natív shell blokkolásáról csak a host tényleges szerződése szerint tehető állítás.
8. Ugyanazon projekt memóriája megosztható a hostok között, a workflow, guard, böngésző és feladattulajdon viszont munkamenethez kötött. A helyreállítás tartósan mentett lépésekből indul; nem épülhet kizárólag lezáró callbackre.
9. A telepítő felismeri a támogatott hostverziókat, ellenőrzi a csomagazonosságot, tartós másolatot készít az npm-cache-en kívül, előkészíti a közös motorokat és hostonként regisztrál. A meglévő Node 24+ és Windows x64 alapkövetelmény megmarad.
10. A setup hostonként jelzi az elhelyezett, regisztrált, újratöltésre váró és ellenőrzött állapotot. Egy részhiba nem lehet összesített siker, és nem okozhat más host adatainak törlését.
11. Frissítésnél és helyreállításnál a BFS saját elemeit és a felhasználó meglévő konfigurációját megkülönböztetjük. Idegen plugin, szervezeti policy, bizalmi állapot és engedély nem írható felül hallgatólagosan.
12. Pontos hostminimumverziót az adott stabil verzió hivatalos dokumentációja és első próbája alapján rögzítünk. A még ismeretlen minimum verziózott vizsgálati eredmény lesz, nem találgatás.

### Platformonkénti feladatcsomagok

Az alábbi tételek megvalósítandó követelmények. A hivatkozott hivatalos képességek nem jelentenek már igazolt BFS-kompatibilitást.

**Gemini CLI** — hivatalos alap: [extensionök](https://geminicli.com/docs/extensions/reference/), [hookok](https://geminicli.com/docs/hooks/reference/), [skillek](https://geminicli.com/docs/cli/skills/), [MCP](https://geminicli.com/docs/tools/mcp-server/), [telepítés](https://geminicli.com/docs/get-started/installation/), [alagentek](https://geminicli.com/docs/core/subagents/).

- G01: stabil verzión ártalmatlan MCP-próbával igazolni a natív hívásazonosságot és az eszközargumentum módosítását. Eredmény: megtisztított eseményminta és megvalósítható kontextuskötés.
- G02: Gemini-native extensionkimenet, skillutasítások és külön hookkonfiguráció készítése. Eredmény: mind a 34 skill helyes felfedezése és a Gemini által elvárt aktiválási folyamat.
- G03: stdio MCP és a Gemini eszköznév-/környezeti szabályainak leképezése. Eredmény: szóközös Windows-útvonal, sessionenként helyes kontextus és idegen hívás elutasítása.
- G04: tool-, agent- és session-események leképezése, kilépéskori helyreállítással. Eredmény: a nem megvárt lezáró hook nélkül is helyesen folytatható, már mentett munka.
- G05: böngésző, render, Impeccable és emberi átadás bekötése; az alagent- és képképességek külön besorolása. Eredmény: tényleges motoros feladatút, csak bizonyított extra képességek.
- G06: helyi extensiontelepítés, frissítés és hostoldali visszaolvasás az npm-setupból. Eredmény: ismételhető telepítés, helyes verzió, megőrzött állapot.
- G07: natív Windows-elfogadás a tényleges npm-csomaggal. Eredmény: az összes kötelező közös eset és a Gemini saját hibaútjai dokumentált eredménnyel rendelkeznek.

**GitHub Copilot CLI** — hivatalos alap: [pluginok](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference), [hookok](https://docs.github.com/en/copilot/reference/hooks-reference), [skillek](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills), [MCP](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers), [agentek](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli), [telepítés](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli).

- P01: a natív híváskontextus, argumentummódosítás, tiltás, hookhiba és timeout külön próbája. Eredmény: a BFS saját állapotvédelmének és a host natív guard-határának pontos elkülönítése.
- P02: támogatott Agent Plugins séma és Copilot-specifikus komponensek szerinti csomagkimenet. Eredmény: 34 skill, MCP és hookok tényleges betöltése.
- P03: stdio MCP és Copilot-sessionhöz kötött hívások. Eredmény: több session, cwd-váltás, idegen és ismételt kötés helyes kezelése.
- P04: sikeres/hibás eszközeredmény, stop, megszakítás és sessionlezárás külön kezelése. Eredmény: timeout vagy hiba nem rögzít hamis sikeres BFS-lépést.
- P05: közös motorok és emberi böngészős átadás; az alagenttípusok életciklus-lefedettségének vizsgálata. Eredmény: külön bizonyíték a párhuzamos módra, különösen a hiányos eseményeket adó agenttípusoknál.
- P06: a natív plugintelepítési/listázási út bekötése a setupba. Eredmény: pontos verzió, idempotens regisztráció, megőrzött tiltások és idegen beállítások.
- P07: csomagból végzett Windows-elfogadás, lassú hookkal és megszakított munkamenettel is. Eredmény: a kötelező alap igazolt, a host timeout-korlátja látható.

**Cursor IDE** — hivatalos alap: [helyi pluginek](https://prod.cursor.com/docs/plugins), [pluginreferencia](https://prod.cursor.com/docs/reference/plugins), [hookok](https://prod.cursor.com/docs/hooks), [MCP](https://prod.cursor.com/docs/mcp), [skillek](https://prod.cursor.com/docs/skills), [alagentek](https://prod.cursor.com/docs/subagents).

- C01: npm által automatikusan elhelyezett minimális helyi plugin betöltésének és azonosíthatóságának próbája, felhasználói ablak-újratöltéssel. Eredmény: igazolt helyi út; importtilalom és marketplace-ütközés felismerése.
- C02: natív Cursor-plugin és a Cursor által támogatott skillutasítások készítése. Eredmény: 34 skill helyes betöltése és dokumentált precedencia.
- C03: Cursor szerinti MCP-útvonalkezelés és hívásonkénti session-/workspace-kötés. Eredmény: két ablak/chat nem keveri a tulajdont, idegen kötés nem ír állapotot.
- C04: az IDE hookjainak külön leképezése a BFS-műveletekre. Eredmény: invalid hookválasz, timeout, megszakítás és elveszett sessionlezárás ténylegesen kipróbálva; a nem szinkron eseményre nem épül kizárólagos mentés.
- C05: motorok és emberi átadás valódi IDE-chatből; natív extra képességek külön mérése. Eredmény: a CLI/felhő általános támogatása nem helyettesíti az IDE-próbát.
- C06: BFS-tulajdonú helyi csomagfrissítés és regisztrációellenőrzés. Eredmény: telepített és aktív verzió megkülönböztetése, csak felhasználói újratöltés, megőrzött szabályok és adatok.
- C07: telepített npm-csomaggal végzett IDE-elfogadás. Eredmény: a kötelező alap és a többablakos/újratöltési esetek igazoltak; a helyi betöltés feltételei pontosak.

**OpenCode CLI** — hivatalos alap: [plugin-API](https://docs.opencode.ai/docs/plugins/), [külön V2 API](https://dev.opencode.ai/v2/docs/build/plugins/), [MCP](https://docs.opencode.ai/docs/mcp-servers/), [skillek](https://docs.opencode.ai/docs/skills/), [konfiguráció](https://docs.opencode.ai/docs/config/), [agentek](https://docs.opencode.ai/docs/agents/), [natív eszközkontextus](https://docs.opencode.ai/docs/custom-tools/), [Windows](https://docs.opencode.ai/docs/windows-wsl/).

- O01: kiválasztott stabil Windows CLI és egyetlen plugin-API rögzítése; az MCP-before/after, módosítás, tiltás és hibaút próbája. Eredmény: bizonyított callbacklefedettség, API-generációk keverése nélkül.
- O02: a választott API szerinti plugin és natív skillcsomag készítése. Eredmény: egyszeri betöltés, 34 skill, helyes konfigurációs precedencia.
- O03: a natív callback kontextusának összekötése a BFS-MCP-vel. Eredmény: valós hívásazonosság és állapotvédelem; elégtelen callback esetén külön igazolt alternatíva nélkül nincs továbblépés.
- O04: idle, error, deleted és engedélyezési állapotok elkülönítése. Eredmény: egy idle esemény nem zár le bizonyíték nélkül teljes munkafolyamatot vagy agentfát.
- O05: motorok, emberi átadás és külön gyermek-session próba. Eredmény: a kötelező út igazolt, párhuzamos mód csak ismert tulajdonkapcsolattal elérhető.
- O06: a stabil API-hoz tartozó telepítési/configurációs út bekötése. Eredmény: megőrzött pluginlista, MCP-beállítások és JSONC-jelentés; natív Windows-futás, nem WSL-helyettesítés.
- O07: tényleges npm-csomaggal végzett CLI-elfogadás. Eredmény: a kötelező alap, MCP-callbackek és permission-hibaút igazolt a megnevezett API-verzión.

### Függőségi sorrend

A nyolc közös feladat: K01 forrás- és hostverziók; K02 teljes Capability profile;
K03 hívási/kontextusszerződés; K04 hostonkénti build; K05 npm-setup;
K06 állapot-elkülönítés és helyreállítás; K07 elfogadási bizonyíték; K08 dokumentáció és kiadás-előkészítés.

K01 után következik G01, P01, C01 és O01. A próba eredményére épül K02/K03 és az adott port 02–05 tétele.
A hostcsomag, működő adapter és közös K04–K06 után következik a port 06-os setupfeladata.
A port 07-es elfogadása a K07 része, nem külön, egymástól körkörösen függő kapu.
K08 csak igazolt állapotot dokumentál; az npm/GitHub-kiadás külön döntés.

## Testing Decisions

### Ellenőrzési határok

Az elsődleges, legmagasabb teszthatár a felhasználó teljes útja: npm-setup → natív hostban betöltött BFS →
skillből elindított feladat → megfigyelt eredmény. Ezt három meglévő határon ellenőrizzük:

1. **Telepítés és frissítés:** a tényleges csomagból indított setup bemenete és a host által visszaadott verzió,
   komponensek, állapotok, valamint a megőrzött konfiguráció. Előzmény a meglévő izolált npm pack/npx integrációs próba
   és a setup folyamat-/CLI-határát helyettesítő tesztek.
2. **Natív felhasználói feladatút:** valódi hostban meghívott skill, projektmemória, checkpoint/folytatás,
   browser/render/Impeccable és emberi átadás megfigyelhető eredménye. Előzmény a jelenlegi host- és engine-integrációs ellenőrzés.
3. **Nyilvános hostesemény és MCP-protokoll:** dokumentált hook/callback bemenettől a tényleges eszközeredményig,
   tiltásig vagy állapotváltozásig. Előzmény a meglévő Claude host-, guard- és workspace-azonossági szerződéspróbák.

Belső segédfüggvényhívások vagy privát adattárolási forma helyett a felhasználó/host által megfigyelhető viselkedést teszteljük.
Új, csak tesztelésre szolgáló produkciós API nem cél. A nehezen előidézhető hiba- és timeouthelyzeteket
a már meglévő folyamat-, esemény- és MCP-határon előállított kontrollált bemenetekkel vizsgáljuk.

### Kötelező esetek

Tesztelési pontosítás a felhasználó 2026-10-13-i kérésére: a közös, változatlan
működést egyszer ellenőrizzük, és ezt a bizonyítékot hivatkozzuk a többi portnál.
Hostonként a saját telepítési, betöltési, hook/callback-, jogosultság- és
munkamenet-eltérésekhez kell célzott ellenőrzés és egy reprezentatív natív feladatút.
Nem kell minden skillt, módot vagy közös helyreállítási esetet minden hoston
újra végigfuttatni. Újrafuttatás indoka változás, tényleges hiba vagy konkrét,
még nem igazolt hosteltérés legyen. A nehéz negatív esetek meglévő nyilvános
határtesztjeit felhasználjuk; új modellpróbát csak indokolt eltéréshez adunk.
Az alábbi A01–A10 feltételek bizonyítéka így összeállhat közös és hostspecifikus
ellenőrzésekből. Az örökölt bizonyítékot nem nevezzük az adott hoston végzett
natív próbának; ismert hibát vagy hiányzó működést nem minősítünk sikeresnek.

| ID | Elfogadási feltétel | Fő felhasználói történetek |
| --- | --- | --- |
| A01 | Tiszta Windows-profiltól a megfelelő hostverzió és BFS-komponensek aktív betöltéséig igazolt út. | 1–4, 9–11, 46, 50 |
| A02 | Mind a 34 skill felismerhető; minden mód besorolt; valódi tervezés → megvalósítás → ellenőrzés út végigfut. | 12–15 |
| A03 | Memória írás/olvasás, lépésmentés, lezárás és új sessionből ellenőrzött folytatás. | 16, 19–20 |
| A04 | Két host/session és két projekt között nincs jogosulatlan állapot- vagy böngészőkeveredés; cwd/worktree/nem Git eset kezelve. | 17–18, 21–23, 31 |
| A05 | Hiányzó/idegen/lejárt/ismételt hívás, hookhiba, timeout és megszakítás nem hoz létre hamis sikeres BFS-műveletet. | 24–26, 37, 39–40, 44 |
| A06 | Tényleges böngészőinterakció, renderelés és Impeccable-művelet; a doctor önmagában nem elegendő. | 27–29 |
| A07 | Látható emberi böngészős átadás után azonos session folytatódik; idegen tab/folyamat érintetlen. | 30–31, 35 |
| A08 | Ismételt setup, frissítés, konfliktus és megszakadt telepítés után megőrzött adatok és helyes hostállapot. | 5–10, 38, 41–43, 45 |
| A09 | Extra képesség hiánya név szerint jelzett; párhuzamos mód csak külön igazolt alagent-azonossággal elérhető. | 13–14, 32–35, 40 |
| A10 | A csomagból futó új port és az érintett Codex/Claude regresszió megfigyelt eredménye a vizsgált tartalomhoz kötött. | 3, 47–54 |

A platformfeladatok elfogadása együttes: a saját 01–07 tételek és A01–A10 kötelező részei is teljesülnek.
A teljes módleltár a skillkatalógusból származik; a reprezentatív végponttól végpontig próba nem mentesít
a többi mód elérhetőségének és szerződésének ellenőrzése alól.

A dokumentált szerződés, az adapter-/csomagteszt és a natív futási bizonyíték külön mezőként szerepel.
Egy sikeres imitált CLI vagy szintetikus esemény nem igazolja a valódi host működését.
A próbák izolált projektet, konfigurációt és BFS-állapotot használnak; meglévő felhasználói bejelentkezési adat nem kerül a jelentésbe.

## Out of Scope

- macOS, Linux, ARM és a WSL alatti Linux mint a natív Windows-próba helyettesítője.
- Cursor CLI, OpenCode Desktop, VS Code Copilot és felhős agentek.
- Új gazdaalkalmazások automatikus telepítése, előfizetés-vásárlás vagy bejelentkezési/bizalmi döntés végrehajtása a felhasználó helyett.
- ZIP vagy más alternatív felhasználói terjesztési út; kézi BFS-konfiguráció mint kész telepítési megoldás.
- Külső raszteres képszolgáltatás integrálása; nem igazolt natív képképesség ígérete.
- Kötelező natív párhuzamos agentmunka minden hoston, illetve nem igazolt alagent-azonosság melletti működtetés.
- Gépek közötti memóriaszinkron, új központi szolgáltatás vagy általános adapterkeretrendszer önálló kiépítése.
- A már elfogadott Codex/Claude Code 1.1.0 kiadás újranyitása.
- Automatikus npm-publikálás, Git-push, tagkészítés vagy további issue-k létrehozása ennek a specifikációnak a közzétételéből következően.

## Further Notes

- A felhasználó a hatókört, az operációs rendszert, a pontos hostfelületeket, az alap/extra képességmodellt,
  az alkalmazás újratöltésének elfogadását, a sorrendet és a párhuzamos munka külön képességként kezelését kifejezetten kiválasztotta.
- A hivatalos dokumentáció feltárásának dátuma: **2026-10-13**. A stabil verzió szerződését a megvalósítás kezdetén újra egyeztetni kell.
- Kiinduló forrás: [az 1.1.0 utáni rögzített állapot](https://github.com/BillBalint-SM/bontaflowstack/tree/2c565fb2bb27816ff4aac8f4e0f400dc3edac876).
- A specifikációhoz forrás- és dokumentációvizsgálat történt. Egyik új BFS port sincs megvalósítva vagy natív futással ellenőrizve.
- A rövid hostpróbák technikai bizonytalanságot rendeznek. Ha kötelező alapfunkció nem valósítható meg,
  az adott port nem kap támogatott státuszt; érdemi hatókörváltozáshoz új felhasználói döntés szükséges.
- A `ready-for-agent` címke a feladat specifikáltságát jelenti, nem kész implementációt vagy kiadási engedélyt.
