# Hostbővítés — megvalósítási és bizonyítéki napló

Az elfogadott [specifikáció](HOST-EXPANSION-SPEC.md) és a [GitHub #4](https://github.com/BillBalint-SM/bontaflowstack/issues/4)
mind az 54 felhasználói története és 36 munkatétele a hatókör része. **Egyetlen új port sem elfogadott még.**
A forrásvizsgálat, a szintetikus hook/MCP-próba és a valódi hostfutás külön bizonyíték.
Ezek a részpróbák nem helyettesítik a telepített npm-csomag teljes feladatútját.
A [képességprofil](HOST-CAPABILITIES.md) a katalógus mind a 34 skilljét és 75 módját
besorolja, a hostfeltételeket és a még nem igazolt utakat külön jelölve.

A további ellenőrzés a felhasználó 2026-10-13-i kérésére a
[specifikáció pontosított tesztelési elvét](HOST-EXPANSION-SPEC.md#kötelező-esetek)
követi: közös működés egyszer, hosteltérések célzottan, ismétlés csak konkrét
indokkal. Az alábbi korábbi nyitott tételek önmagukban nem jelentenek újabb
teljes natív tesztsorozatra szóló kötelezettséget; meglévő közös bizonyítékuk
felhasználható, a host saját hiányzó működését külön kell kezelni.

## Kiindulás és helyi környezet

- Alap: `2c565fb2bb27816ff4aac8f4e0f400dc3edac876`, külön `codex/host-expansion` ágon.
- Natív Windows x64; Node `v26.8.1`. A támogatási minimum továbbra is Node 24+.
- A felhasználó külön engedélyezte az ingyenesen használható teszthostok letöltését és telepítését.
  A BFS npm-setup ettől még nem telepít gazdaalkalmazást a felhasználó helyett.
- Gemini CLI `0.63.0`: a Google OAuth bejelentkezés mentése sikeres, de a tényleges CLI-hívást
  a szolgáltatás `IneligibleTierError` / `UNSUPPORTED_CLIENT` hibával elutasította.
  Az API-kulcs a CLI saját biztonságos tárolójába került; `gemini-api-key` és `gemini-3.6-flash` mellett
  valódi modellválasz és adapterpróba sikeres. A későbbi csomagolt skillaktiválási próba a napi ingyenes
  kvóta elfogyása miatt 429-es hibával megállt; ezt nem tekintjük elfogadási sikernek.
- Copilot CLI `1.0.96`: telepítve, valódi modellválasz és plugin/MCP-próba megfigyelve.
- OpenCode CLI `1.19.0`, V1 plugin-API: telepítve, ingyenes modellválasz és callback/MCP-próba megfigyelve.
- Cursor IDE: a WinGet `3.19.7` telepítője után az alkalmazás automatikusan `3.24.12` verzióra frissült.
  A helyi próba-plugin skill/hook/MCP betöltése és natív híváskötése igazolt; a teljes BFS-feladatút még nem.

## Megfigyelt részeredmények — 2026-10-13

1. `node --test tests/cursor-host.test.mjs tests/claude-host.test.mjs tests/gemini-host.test.mjs tests/copilot-host.test.mjs tests/claude-package.test.mjs`: 24/24 sikeres.
   A Gemini teszt szintetikus natív eseményt ad a tényleges hook-folyamatnak, és JSON-RPC-n hívja a tényleges MCP-folyamatot.
2. További Gemini-tesztek: megosztott memória, másik session workflow-jának megtagadása,
   megszakított lépés visszaolvasása és sessionvég utáni kötésvisszavonás sikeres.
3. A Gemini `write_file`, `replace`, `run_shell_command` eszközeinek guardleképezése,
   cwd-váltás alatti projektmegtartás és hibás sessionadat elutasítása a folyamatok nyilvános határán sikeres.
4. `BFS_RUN_COPILOT_PROBE=1 node --test tests/copilot-probe.integration.mjs`: sikeres, valódi Copilot CLI.
   A natív Agent Plugins 1.0 próba-plugin betöltődött. A hookban megfigyelt eszköznév `bfsprobe-ping`;
   a `modifiedArgs` által hozzáadott egyszer használható érték eljutott az MCP-hez.
   SessionStart, pre/post tool, agentStop és sessionEnd esemény megfigyelve.
5. `BFS_RUN_OPENCODE_PROBE=1 node --test tests/opencode-probe.integration.mjs`: sikeres, valódi OpenCode CLI.
   A `.opencode/plugins/` V1 plugin betöltődött; a `tool.execute.before` valódi `sessionID` és `callID` mezőt kapott.
   A `bfsprobe_ping` MCP argumentumai módosíthatók, és az after callback is lefutott.
   A `longcat-2.5-preview-free` kezdeti egyszerű modellpróbája `cost: 0` eredményt adott.
   A minden más eszközt elrejtő `deny` tesztkonfigurációt a szolgáltatás 403-mal visszautasította;
   a natív eszközkészletet megőrző `ask` konfiguráció és a kizárólag próbaeszközre adott engedély mellett a próba sikeres.
6. `BFS_RUN_GEMINI_PROBE=1 node --test tests/gemini-probe.integration.mjs`: sikeres, valódi Gemini CLI 0.63.0.
   A felhasználó által másolt kulcs a CLI saját tárolójába került, az alapértelmezett modell `gemini-3.6-flash`.
   Az egyszerű modellpróba `BFS_OK` választ adott. A 3.8 Flash előző hívása 503 túlterhelési hibát adott.
   A próba csak a saját olvasási MCP-eszközének engedélyezését adja át egy ideiglenes `--policy` fájlban;
   enélkül a headless host elrejtette az eszközt. Más felhasználói jogosultság nem változott.
   A `mcp_bfsprobe_ping` BeforeTool argumentumkötése azonos session/cwd mellett eljutott az MCP-hez;
   BeforeTool, AfterTool, AfterAgent és SessionEnd események megfigyelve (`bfs-gemini-probe-t9U8Ah`).
7. Copilot natív negatív próbák: a kifejezett tiltás és a hibás kilépés megállította az MCP-hívást.
   Az 5 másodperces hook-timeout után a host továbbengedte a hívást, de a hiányzó kötés miatt a próba-MCP elutasította.
   Ez a natív shell timeout alatti blokkolását nem igazolja.
8. Cursor IDE `3.24.12`: a helyi plugin egy skillt, egy MCP-szervert és öt hookot töltött be.
   A hook stdin UTF-8 BOM-mal és `/C:/...` alakú workspace-útvonallal érkezett; ezeket a próbában kezeljük.
   Új natív chatben a `MCP:ping` `updated_input` mezője eljutott az MCP-hez, azonos session/workspace mellett;
   a post-hook ugyanazt a tool-use azonosítót kapta. A válasz `BFS_NATIVE_BINDING_OK` volt.
   A mentett `result.json` a `bfs-cursor-probe-6r3iHQ` helyi próbakönyvtárban található.
9. OpenCode natív negatív próba: `BFS_PROBE_BEHAVIOR=deny` mellett a V1 before-callback hibája
   `BFS_PROBE_DENIED` eredményt adott; az MCP nem futott le, a session idle esemény megérkezett.
10. Copilot BFS-adapter: négy folyamatpróba igazolja az egyszer használható és argumentumhoz kötött MCP-hívást,
    a közös memóriát, a munkamenet-tulajdont, a cwd- és worktree-kezelést, valamint az edit/PowerShell guardot.
    A worktree lezárási teszt először hibát jelzett; a sessionhöz tartozó worktree-k lezárása után sikeres.
11. Cursor BFS-adapter: négy folyamatpróba igazolja a BOM-/Windows-útvonal-kezelést, a híváskötést,
    a memória és a chat-tulajdon elválasztását, a guardot és a több worktree-t érintő helyreállítást.
    A generikus `preToolUse` megfigyelt neve nem tartalmazza az MCP szerverének nevét, ezért a kiadandó
    Cursor-eszközök `bfs_` előtagot kapnak. A másik szerver általános `status` eszköze nem kap BFS-kötést.
    Egy híváshoz jelenleg egy natív workspace root kell; üres vagy többértelmű root esetén a hook megtagad.
    A `sessionStart` csak kontextust ad; a helyreállítást a `beforeSubmitPrompt` végzi, mert a sessionindító esemény aszinkron.
    A prefixelés utáni súgójavítást a Cursor-kötési és a meglévő Claude-súgóteszt külön is ellenőrizte (2/2).
12. `node --test tests/opencode-host.test.mjs`: 6/6 sikeres nyilvános callback–MCP próba.
    Ellenőrzi a híváskötést, közös memóriát, session-tulajdont, új forduló és idle/error/deleted események
    helyreállítását, több worktree lezárását, korlátozott kontextust és a natív guardot.
    Az OpenCode 1.19.0 `bash` eszközneve Windows alatt PowerShellt is jelenthet; a config hookban
    olvasott shell alapján választunk parsert. A cmd.exe guardfigyelmeztetés jelenleg nem támogatott.
13. `BFS_RUN_OPENCODE_NATIVE=1 node --test tests/opencode-native.integration.mjs`: sikeres valódi BFS-adapterpróba.
    A native callback az eredeti argumentumobjektum módosítását továbbítja; az objektum lecserélése
    elvesztette a kötést. Ezt a futás feltárta, a javítás helyben módosít, a határteszt is ezt használja.
    A natív MCP after-callback a dokumentált általános tool-output helyett nyers MCP `content` tömböt kap;
    a guardjelzés ebbe kerül, az eredeti eredmény megőrzésével. Mindkét kimenetformátum tesztelt.
    A `bfs_status` eredménye igazolja a tényleges sessiont/workspace-t és a guardjelzést
    (`bfs-opencode-native-ROZeYK/result.json`). Ez nem a teljes npm-csomag elfogadása.
14. Gemini natív negatív próbák: `BFS_PROBE_BEHAVIOR=deny,crash,timeout` mellett 3/3 sikeres.
    A tiltás és a 2-es hibakód megakadályozta az MCP-hívást (`bfs-gemini-probe-9wjHrZ`, `bfs-gemini-probe-qkZ8ro`).
    Az 5 másodperces timeout után a host továbbengedte a hívást, a próba-MCP viszont hiányzó kötés miatt elutasította
    (`bfs-gemini-probe-GSn0Kn`). Ez a natív shell timeout alatti blokkolását nem igazolja.
15. `BFS_RUN_GEMINI_NATIVE=1 node --test tests/gemini-native.integration.mjs`: sikeres valódi BFS-adapterpróba.
    A CLI `stream-json` eszközeredménye az aktuális natív sessiont és a szóközös projektútvonalat tartalmazta;
    a saját hookok kötése a tényleges BFS MCP `status` hívásig eljutott (`bfs-gemini-native-2awv5z/result.json`).
    Ez a futás nem a modell szöveges állítására támaszkodik, hanem a host eszközeredményére.
16. Gemini extension build: `node --test tests/gemini-package.test.mjs` sikeres.
    A hivatalos manifest, hat lifecycle/tool hook, GEMINI.md és mind a 34 skill elkészül;
    a közös utasítások és hivatkozások megmaradnak, a hostutasítások nem hivatkoznak másik host eszközeire.
    A csomag nem tartalmaz automatikus toolengedélyt adó policyt vagy MCP trustot.
17. `BFS_RUN_GEMINI_EXTENSION=1 node --test tests/gemini-extension.integration.mjs`: sikeres.
    A valódi CLI telepítette az extensiont, mind a 34 skillt felfedezte, a csomagolt hook–MCP hívás
    szóközös, aposztrófos és dollárjeles útvonalon is sikeres (`bfs-gemini-extension-DE5rd2/result.json`).
    A natív telepítés külön forrásmappa-jóváhagyást kér. A teszt kizárólag a saját izolált profiljában
    válaszolt erre; a kiadandó setup átadja a natív promptot a felhasználónak.
18. `node --test tests/npm-setup.test.mjs tests/npm-package.test.mjs`: 21/21 sikeres az első
    Gemini setup bekötése után, az érintett Codex/Claude esetekkel együtt. Az ezt követő külön
    Gemini konfliktusteszt is sikeres: idegen MCP, más forrású extension, tiltott hostállapot és
    felhasználó által módosított telepített fájl megmarad, a setup megtagadja a felülírást.
19. `BFS_RUN_GEMINI_SETUP=1 node --test tests/gemini-setup.integration.mjs`: sikeres valódi npm pack/npx próba.
    Első setup, ismétlés és szintetikus `9.9.9-gemini-test.1` frissítés a natív Gemini 0.63.0-val;
    verzió, 34 skill és csatlakozott MCP visszaolvasva. A korábbi csomag és a mentett adat megmarad.
    Az npm-cache és a buildforrás félretétele után is olvasható a regisztráció, a rögzített motorok
    elérhetők, az Impeccable valódi `overused-font` találatot adott
    (`bfs-gemini-setup-S1NKcw/result.json`). Ez helyi tesztcsomag, nem új npm-publikáció.
20. A telepített csomag natív skillaktiválási próbája (`tests/gemini-installed.integration.mjs`)
    a modellválasz előtt 503, majd 429 hibát kapott: `generate_content_free_tier_requests`,
    napi limit 20 a `gemini-3.6-flash` modellen. A futás nem igazolta a csomagolt skillaktiválást
    vagy teljes feladatutat. A teszt készen áll az újrafuttatásra a kvóta visszaállása után.
21. Copilot Agent Plugins 1.0 build és Gemini build együtt: 2/2 sikeres csomagteszt.
    A Copilot `plugin.json`, `mcp.json` és `com.github.copilot/hooks/hooks.json` fájlokat kap,
    mind a hét saját esemény közvetlen `exec`/`args` indítású. Az érintett Claude-csomag,
    Copilot határtesztek és a két új csomag összesített szűk regressziója 7/7 sikeres.
22. `BFS_RUN_COPILOT_NATIVE=1 node --test tests/copilot-native.integration.mjs`: sikeres natív
    Copilot 1.0.96 próba (`bfs-copilot-native-YPkQC9/result.json`). A CLI felfedezte a 34 skillt;
    a valódi `bfs-status` tool eredményében a helyes workspace/session és a guardjelzés szerepelt.
    A natív végeredmény sessionId-je külön visszaolvasással is egyezett az MCP sessionId-jével.
    Az első futás tesztje hibásan keresett a beágyazott JSON-szövegben; az adapter akkor is sikeres
    választ adott. A teszt javítva, a teljes natív próba újrafuttatva sikeres.
23. Copilot saját izolált profilban végzett közvetlen helyi plugintelepítése és listázása sikeres,
    de a CLI ezt a telepítési formát elavultnak jelzi. Az npm-integráció ezért a dokumentált
    helyi marketplace + `plugin@marketplace` utat használja.
24. A natív helyi Copilot marketplace próba igazolta a `source:"live"` betöltést:
    ugyanazon forráskönyvtár új verzióját a következő CLI-folyamat felismeri. Egy már regisztrált
    marketplace nevéhez másik útvonal hozzáadása hibát ad. Az npm-telepítő ezért saját tartós
    forrást tart fenn; a változatlan korábbi verziókat külön megőrzi.
25. `BFS_RUN_COPILOT_SETUP=1 node --test tests/copilot-setup.integration.mjs` első teljes
    telepítési próbája sikeres (`bfs-copilot-setup-Mgu91s/result.json`, Copilot 1.0.96).
    Valódi npm pack/npx setup, ismétlés, szintetikus verzióváltás, 34 skill, MCP-regisztráció,
    npm-cache nélkül működő tartós forrás, megőrzött állapot és tényleges Impeccable-futás igazolt.
    A letiltott pluginon ismételt setup hibával megállt, és a letiltást megőrizte.
    A szűk npm-csomag/telepítő regresszió 22/22 sikeres volt.
26. A kiterjesztett natív próba kimutatta, hogy a Copilot összevont `mcp list --json` eredménye
    elrejtheti az azonos nevű felhasználói szervert. A setup most külön is ellenőrzi a dokumentált
    felhasználói és workspace MCP-konfigurációkat, módosítás nélkül.
    Az első telepített skill/model próba aktiválta a `bfs-health` skillt és sikeres BFS status
    hívást végzett, de kihagyta a core HOST-olvasását. Emiatt minden új hostra generált skill
    közvetlen MCP-belépőt és konkrét `read` argumentumot kapott; a skill feladatlépései megmaradtak.
    A próba gyermekfolyamatából eltávolítottuk a Node tesztfuttató saját `NODE_TEST_CONTEXT`
    változóját is, mert az a megfigyelt natív shelltesztet kihagyatta. Az első futás nem elfogadás;
    a javított utak újrafuttatása szükséges.
27. A javított Copilot npm-telepítési próba sikeres
    (`bfs-copilot-setup-6PjOtW/result.json`, 124,8 s): az előző telepítési ellenőrzések mellett
    a felhasználói `bfs` MCP-ütközés és a projektbeli `bfs-health` skillütközés is hibával állítja
    meg a setupot, a másik fájl és a BFS-memória változatlan marad. A Copilot hook/MCP-határtesztek
    és npm-csomagteszt együtt 5/5, a két új host csomagtesztje 2/2 sikeres.
28. `BFS_RUN_COPILOT_INSTALLED=1` és a 27. pont telepítési bizonyítékával futtatott
    `tests/copilot-installed.integration.mjs` sikeres, valódi Copilot-modellhívással (96,3 s).
    Bizonyíték: `bfs-copilot-setup-6PjOtW/health-project-a9wueO/result.json`.
    Natív `skill` aktiválás → `bfs-core read bfs-health` teljes HOST-tal → effektív preferenciák
    → BFS status a tényleges host-sessionnel → a README valódi `node --test check.test.mjs`
    parancsa, 1 sikeres teszttel. Guardjelzés és a pinelt motorok elérése megfigyelve.
    Az előző újrafuttatást a teszt hibás, pluginelőtaggal megadott engedélymintája blokkolta;
    a dokumentált szervernév szerinti `bfs(core)` csak a tesztfolyamatban ad engedélyt.
    A setup továbbra sem ír tool-engedélyt. Ez a health út bizonyítéka, nem a teljes port elfogadása.

29. Cursor-csomag és tényleges npm setup/ismétlés/frissítés sikeres a fájlelhelyezés,
    állapotmegőrzés, cache nélküli motorindítás, Impeccable és idegen MCP/skill
    ütközések megőrzésének határán. Bizonyíték:
    `%TEMP%/bfs-cursor-setup-AlEIBK/result.json`. Ez önmagában nem natív IDE-elfogadás.
    A natív Customize felület a helyi csomag 34 skilljét, 5 MCP-eszközét és 7 hookját
    mutatta. Az ugyanilyen nevű, Claude-ból importált 1.1.0 plugin is jelen volt;
    az első modellpróbában a helyi `bfs_status` helyett az importált `status` volt elérhető.
30. A felhasználó a third-party importkapcsoló kikapcsolása és újratöltés után
    tényleges `bfs_status` hívással ezt kapta: `Native BFS call binding is missing`.
    A Cursor 3.24.12 hooknaplója nem indított plugin-hookot ennél a próbánál.
    A telepített alkalmazás `loadPluginHooks()` függvénye az összes plugin-hookot
    az `isClaudeCodeHooksEnabled()` kapcsolóhoz köti. Ez magyarázza, miért nem volt
    híváskötés; a kapcsoló kikapcsolásának korábbi javaslata nem megfelelő végleges
    megoldás. Nem lazítottuk a BFS kötésellenőrzését.
31. Az elkülönített `%TEMP%/bfs-cursor-setup-AlEIBK/project with spaces` projekt
    `.cursor/hooks.json` fájlja a [dokumentált natív projekt-hook útvonalon](https://cursor.com/docs/hooks)
    hívja a telepített csomag hét hookját. Meglévő fájlt nem írt felül.
    A tényleges parancs → MCP folyamatpróba helyes `cursor-ide` hostot és tesztsessiont
    adott; bizonyíték: `project-hooks-preflight.json` a fenti ideiglenes könyvtárban.
    A natív IDE-újrapróba még szükséges. Ez diagnosztikai beállítás, nem általános
    telepítőjavítás; az importált Claude-csomaggal való automatikus együttélés nyitott.

32. OpenCode 1.19.0 natív konfigurációs próba: a V1 `config` callbackben felvett
    skillútvonalat a `debug skill` megtalálta, az MCP-t az `mcp list` csatlakoztatottnak
    jelezte. Bizonyíték: `%TEMP%/bfs-opencode-config-2za1jE/`. Erre épül az OpenCode
    csomag: egy tartós `plugin.mjs` export és a natív automatikus pluginfelfedezés;
    nincs külön JSONC-szerkesztő vagy további npm-függőség.
33. A teljes generált OpenCode-csomag tényleges natív próbája sikeres:
    `%TEMP%/bfs-opencode-native-FcspyZ/result.json`. A `debug skill` mind a 34 skillt
    a generált csomagból olvasta, a `bfs_status` modellhívás a valódi `sessionID`-t,
    projektet és guardjelzést adta. A megjegyzést és záró vesszőt tartalmazó projekt-
    JSONC bájtról bájtra változatlan maradt. Ez a betöltés és státuszhívás bizonyítéka,
    nem teljes skill-/motoros feladatút vagy portelfogadás.
34. Az npm-build hat hostot tartalmaz; a csomagolási teszt sikeres. Az OpenCode setup
    a CLI `debug paths` eredménye szerinti globális `plugins/bontaflowstack.js`
    betöltőt kezeli, meglévő JSON/JSONC-fájlok írása nélkül. A nyilvános setup-határon
    az ismétlés és ütközésmegőrzés próbája sikeres. A natív `--pure debug skill`
    ellenőrzés azért szükséges, mert a betöltött plugin elfedhet azonos nevű projekt-
    skilleket; ezt a célzott regressziós teszt igazolja.
35. Valódi `npx --package <helyi npm-tarball> bontaflowstack setup --host opencode`
    integráció sikeres: `%TEMP%/bfs-opencode-setup-rLVWso/result.json`.
    Telepítés, ismétlés, 1.1.0 → 9.9.9-opencode-test.1 tesztfrissítés, npm-cache
    eltávolítása utáni natív skill/MCP-betöltés, tényleges Impeccable-futás és
    állapotmegőrzés ellenőrizve. A JSONC megjegyzései, a külön plugin és a kifejezetten
    letiltott `bfs` MCP megmaradt. Az elfedett projekt-skill ütközésénél a setup
    elutasította a regisztrációt, a fájlt megőrizte. A 24 telepítő-/csomagteszt,
    a módosítás utáni két célzott OpenCode-teszt, a három másik host csomagtesztjei
    és az OpenCode határtesztjei sikeresek. Megszakadt telepítés és a teljes natív
    skill-/motoros út még szükséges.

36. Az npm-ből frissített `9.9.9-opencode-health.1` csomag health-feladatútja sikeres:
    `%TEMP%/bfs-opencode-setup-rLVWso/health-project-rzfuol/result.json`.
    Natív `skill` aktiválás, teljes HOST, `preferences effective`, munkamenethez
    kötött státusz, pinelt motorok és tényleges `node --test check.test.mjs` futás
    guardjelzéssel igazolt. A konfiguráció változatlan maradt. Az előző próbák
    megmutatták a tesztből hiányzó olvasási engedélyt, a globális permission-merge
    szabálysorrendjét és egy félreérthető preferences-utasítást. A teszt kizárólag a
    saját folyamatában ad szűk `build` agent-engedélyeket; a setup nem ír permissiont.
    Az OpenCode HOST most a pontos `{"args":["preferences","effective"]}` hívást
    adja meg. Az új utasítás tényleges npm-frissítésből futott; a korábbi bizonyítékok
    és verziók megmaradtak. Ez a health út igazolása, nem teljes portelfogadás.

37. `BFS_RUN_OPENCODE_CONTEXT=1` mellett az új `tests/opencode-context.integration.mjs`
    megkísérelte az npm-ből telepített csomag memória → pause → új sessionből resume
    és másik projekt elkülönítési útját. A natív CLI az első eszközhívás előtt 403
    `FreeTierError` választ kapott: `OpenCode's free tier can only be used from within OpenCode`.
    Bizonyíték: `%TEMP%/bfs-opencode-setup-rLVWso/context-ClB8u2/save.stdout.jsonl`.
    A tényleges OpenCode 1.19.0 CLI futott, az előző sikeres health-próba modelljével;
    a szolgáltatói elutasítás oka nincs igazolva. Nem kerültük meg, és nem minősítettük
    BFS-hibának vagy sikeres kontextuspróbának. A teszt további lépései nem futottak.
38. Elkészült a teljes [képességprofil](HOST-CAPABILITIES.md): 34 skill, 75 mód,
    négy host, alap/extra besorolás, elérhetőségi korlát, feltétel és bizonyíték.
    A `node --test tests/host-capabilities.test.mjs` ellenőrzés sikeres; kizárólag
    a katalóguslefedettséget, mezőket és helyi hivatkozásokat igazolja.
    A natív health-út két hoston bizonyított; a többi mód teljes útja továbbra is
    nem igazolt vagy a megfigyelt Cursor-együttélési hibával blokkolt. A profil
    nem nevez elérhetőnek egy hiányzó raszter- vagy párhuzamos BFS-képességet.
39. A kontextuspróba közös, natív OpenCode/Copilot belépőt kapott:
    `tests/native-context.integration.mjs`. Az első Copilot-futások megmutattak két
    teszthibát (taskId nem azonos a nyers sessionId-val; checkpointot listázással is
    vissza lehet olvasni), és egy instrukcióhiányt: a modell Markdown-hivatkozást
    skillnévként adott a core `read` parancsnak. A közös hostbuild most név szerint
    elválasztja a skill-, fájl- és preferenciaolvasást. A négy csomagteszt 4/4 sikeres;
    az izolált Copilot-profilt valódi npm-frissítés vitte `9.9.9-copilot-context.1`-re.
    A korábbi sikertelen futások bizonyítékai megmaradtak. Az elkülönítés listázási
    próbája a megfelelő save-context skillmódból indul; esetleges hibás eszközhívásokat
    külön rögzít, és a kötelező tényleges eredményeket továbbra is ellenőrzi.
40. `BFS_RUN_COPILOT_CONTEXT=1 node --test tests/native-context.integration.mjs`:
    sikeres, 257,1 s; OpenCode nem futott. Bizonyíték:
    `%TEMP%/bfs-copilot-setup-6PjOtW/context-RNJUpG/result.json`.
    Három új natív session, memória írás/visszaolvasás, workflow begin/pause,
    teljes checkpoint-visszaolvasás, új sessionben fájldrift és explicit tulajdonátvétel,
    másik nem Git projektből üres memória/workflow/checkpoint lista igazolt.
    A memória és checkpoint bájtjai, valamint a hostkonfiguráció változatlan maradtak;
    a sikeres teljes futásban nem volt hibás eszközhívás. A HOST-hash a ténylegesen
    telepített és beolvasott tartalomhoz kötött. Ez a nem Git Copilot-kontextusút
    bizonyítéka; nem igazol két külön hostot, minden worktree-esetet vagy megszakítást.
41. Az első `tests/copilot-engines.integration.mjs` modellpróbában a valódi helyi
    oldalon végzett kattintás, a 1280×800 és 375×800 render, valamint a PNG-k natív
    megnyitása sikerült. A `view` eredmény `binaryResultsForLlm` mezője tényleges
    PNG-adatot adott a modellnek. Bizonyíték: `engines-project-InGf40/native.stdout.jsonl`
    a 40. pont telepítési könyvtárában. A teszt tévesen várt fonttalálatot az Arial
    tesztoldalon; Impeccable helyesen nulla találattal végzett. A fixture most az
    előző motorpróbával igazolt Inter-szabályt váltja ki. Külön nyilvános hook/MCP-
    regresszió reprodukálta, hogy a sikeres, találatot jelző 2-es exitet az MCP hibának
    minősítette. A közös MCP-réteg most megőrzi az engine `completed` jelentését,
    a valódi scan failure továbbra is hiba. A Claude és négy új host érintett
    határtesztjei együtt 30/30 sikeresek. A natív folytatás eredménye a 42. pont.
42. `BFS_RUN_COPILOT_ENGINES=1 node --test tests/copilot-engines.integration.mjs`:
    sikeres, 131,2 s; bizonyíték:
    `%TEMP%/bfs-copilot-setup-6PjOtW/engines-project-1YiJPI/result.json`.
    A javítás valódi npm-frissítéssel telepített `9.9.9-copilot-engines.1` csomagból
    futott. Natív bfs-browse aktiválás, tényleges oldal/kattintás/eredmény, két
    ellenőrzött méretű PNG-render, a PNG-adatok modellnek átadása, és saját browser
    stop igazolt. A külön CSS-fájlban lévő Inter-szabályt előzetes Impeccable-futás
    igazolta, majd a natív MCP-n kapott 2-es findings exit sikeres `completed`
    eredmény maradt. A HTML-be ágyazott előző Inter-fixture nem váltotta ki ezt a
    találatot; ezért az a korábbi teszt nem kapott sikeres minősítést.
    Egy nem szükséges `bfs-select_project` hívást a natív policy elutasított; a modell
    ezt a végső jelentésében feltüntette. A könyvtárválasztás nem történt meg:
    a kért fájlok az eleve rendelkezésre álló aktuális workspace-ben voltak,
    és az engedélyezett browser/render műveletek ott futottak. Az oldal, CSS és
    hostkonfiguráció nem módosult. A próba a vizsgált `gpt-6-luna` modellen és
    helyi oldalon igazolja a motorutat; látható emberi átadás, két host együttes
    erőforrás-elkülönítése és teljes plan/implement/verify út még szükséges.
43. A közös setup részhibánál most hostonként őrzi az elhelyezett, regisztráció alatt
    álló, visszaolvasott, hibás és IDE-újratöltésre váró állapotot a saját
    `npm/setup-status.json` fájljában. A napló a preflight után kezdődik, atomikusan
    frissül, és nem tartalmaz parancskimenetet vagy fiókadatot. A Codex és Claude
    visszatérési eredménye is megkapja a tényleges regisztráció/ellenőrzés mezőit.
    A részhibateszt először hiányzó állapotfájllal elbukott; a javítás után sikeres:
    Codex kész, Claude hibás, Cursor csak tartósan elhelyezett; az újrafuttatás
    megőrzi a Codex-regisztrációt és a mentett adatot, a Cursorhoz továbbra is
    újratöltést jelez. A motor-előkészítési hiba nem kap hostregisztrációs sikert.
    `node --test tests/npm-setup.test.mjs tests/npm-package.test.mjs`: 25/25 sikeres.
    Ez a szimulált CLI-határ ellenőrzése; a valódi megszakítási próba a 44. pont.
44. `BFS_RUN_COPILOT_SETUP=1 node --test tests/copilot-setup.integration.mjs`:
    sikeres, 164,8 s; bizonyíték: `%TEMP%/bfs-copilot-setup-ZoXbBV/result.json`.
    A tényleges npm-csomagból indított `npx` folyamatot a motor-előkészítési fázisban
    a teszt leállította a saját folyamatfájával együtt. Az `interrupted-status.json`
    megőrzött `running`/`engines` állapotot és csak `placed` Copilot-fájlokat jelzett;
    a natív pluginlistában még nem volt BFS-regisztráció. Ugyanaz a setup utána
    sikeresen lefutott, majd az ismétlés, frissítés, cache nélküli 34-skill/MCP-
    felfedezés, Impeccable és a tiltott plugin/idegen MCP/skill megőrzése is sikeres.
    Ez a motorfázis megszakítását igazolja; a host saját regisztrációja vagy
    könyvtárcseréje közben történő megszakításra nem terjed ki.
45. A Cursor setup nyilvános belépőjén reprodukált megosztási hiba megmutatta:
    ha az új könyvtár átnevezése és a visszaállítás is meghiúsul, a korábbi
    `finally` ág törli a félretett előző példányt. A tartós verziókönyvtár
    megmaradt, de ez nem megfelelő visszaállítás. A Gemini/Copilot/Cursor közös
    `source-copy.mjs` művelete most hiba esetén megőrzi a másolatot, újrafuttatáskor
    a natív listázás előtt visszaállítja az egyértelmű, változatlan saját példányt,
    majd ellenőrzött állapotból folytat. Módosított másolatot nem aktivál/töröl,
    több lehetséges korábbi példányból nem választ találomra. A helyreállítási
    staging ellenőrzés után eltűnik, így korábbi sikeres cserék nem teszik
    kétértelművé a következő megszakítás helyreállítását.
    A hiba és a staging megmaradása külön piros tesztként megfigyelt; javítás után
    a három érintett célzott setup-teszt sikeres. A csomag/setup sorozat a staging-
    takarítás finomítása előtt 26/26 sikeres volt; utána az érintett három setup-
    teszt és a 46. pont natív próbája is sikeres.
46. A végső `BFS_RUN_COPILOT_SETUP=1 node --test tests/copilot-setup.integration.mjs`
    sikeres, 183,5 s. Bizonyíték: `%TEMP%/bfs-copilot-setup-b0DNuD/result.json`.
    Valódi npm-csomag és Copilot CLI 1.0.96 futott. A teszt egy csak erre a gyermek-
    folyamatra érvényes Node-előtöltéssel közvetlenül a tényleges régi könyvtár
    átnevezése után megállította a futást, majd leállította a saját folyamatfát.
    Ez kontrollált megszakítás, nem fizikai áramszünet. A forráshely hiányzott,
    a félretett korábbi HOST bájtjai megmaradtak, a setup állapota `registering`
    volt. Ugyanaz az npm-parancs helyreállította a forrást és befejezte a frissítést;
    az ellenőrzött staging eltűnt. Ismétlés, cache nélküli 34-skill/MCP-felfedezés,
    Impeccable és a tiltott/ütköző beállítások megőrzése is sikeres.
    Korábbi, staging-takarítás előtti natív eredmény: `bfs-copilot-setup-iTd69B`,
    171,3 s. A Gemini saját extension-telepítése, a Cursor IDE és a többi host
    regisztrációja közbeni megszakításokra ez nem ad automatikus bizonyítékot.

47. A tényleges npm-csomagból futó Copilot tervellenőrzés/implementálás/health
    próba (`bfs-copilot-setup-6PjOtW/workflow-project-6e0ZJI`) a natív
    `apply_patch` hívásnál megállt: a hook JSON-ként próbálta olvasni a nyers
    `*** Begin Patch` szöveget. A hivatalos [hookreferencia](https://docs.github.com/en/copilot/reference/hooks-reference)
    `toolArgs: unknown` típust dokumentál, a [CLI-referencia](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
    pedig külön felsorolja ezt a natív szerkesztőeszközt. A javítás csak ennek
    a megfigyelt argumentumalaknak a guardvizsgálatát normalizálja, natív
    engedélyt nem ad. Határtesztben előbb a parse-hiba volt megfigyelhető;
    utána mind a hat Copilot hook/MCP teszt és a csomagteszt sikeres lett.
    A nyers és JSON-ba burkolt patch, a könyvtárhatáron kívüli írás/átmozgatás
    tiltása és a BFS-eszközre küldött hibás argumentum elutasítása ellenőrzött.
    A javított helyi npm-jelölt `9.9.9-copilot-workflow.1`; nincs publikálva.
    Az első blokkolt futás lemezen tárolt munkafolyamata `interrupted`, a másik
    két lépés `pending` maradt; a sikertelen szerkesztést nem jelölte sikeresnek.
48. `BFS_RUN_COPILOT_WORKFLOW=1` és a `bfs-copilot-setup-6PjOtW` npm-telepítés
    mellett a `tests/copilot-workflow.integration.mjs` sikeres, 181,8 s.
    Bizonyíték: `workflow-project-pXQqTO/result.json`. A natív CLI aktiválta a
    `bfs-plan-eng-review`/review, `bfs-implement`/implement és `bfs-health`/check
    skilleket egy soros workflow-ban; tényleges elfogadási checkpoint előzte meg
    a kódmódosítást. A meglévő teszt megmaradt, az új viselkedés ellenőrzése
    előbb hibázott, majd a javítás után és a health lépésben is sikerült.
    A befejezett workflow MCP-visszaolvasása egyezett a tartós rekorddal és
    a kimeneti fájlok SHA-256 értékeivel. Külön Node-futtatás és közvetlen
    függvényhívások ellenőrizték a teljes fixture-követelményt; az elfogadott
    dokumentumok, idegen fájl és hostkonfiguráció változatlanok. Sikertelen
    eszközhívás nem volt. Az ezt megelőző `workflow-project-qXZqUz` natív futás
    szintén eljutott a befejezett workflow-ig, de az utóellenőrző teszt a status
    válaszból keresett ott nem létező projektazonosítókat; a javított teszt a
    visszaolvasott workflow saját azonosítóit használja. A sikeres ismétlés új
    projektben, új sessionben futott. Ez három mód konkrét natív feladatútja,
    nem a Copilot-port teljes elfogadása.
49. Az 54. történet naplóminimalizálásának első lépése: a modellpróbák több
    korábbi kimenete teljes natív átiratot őrzött, és még a szűkített workflow-
    bizonyíték is tartalmazott teljes eszközbemenetet/kimenetet. Az utóbbi
    tényleges fájlon ellenőrzött tiltó assert hibázott. A közös tesztoldali
    `writeNativeEvidence` most csak kilépési kódot, stderr-méretet, feldolgozatlan
    sorok és hibaesemények számát, ismert eszközneveket, siker/hiba/függő
    állapotot és képátadások számát írja. Nincs benne prompt, válasz, argumentum,
    tooleredmény, hibaüzenet, kötés, fiókadat vagy SDK-belső mező. Kilenc natív
    tesztfájl használja; a sikerellenőrzések az eredeti, memóriában lévő tényleges
    eredményeket vizsgálják. A Gemini/Copilot/OpenCode eseményalakot, ismeretlen
    eszköznevet és megszakadt sort tartalmazó canary-próba sikeres; az érintett
    tesztmodulok betöltése is ellenőrzött, tíz natív eset ennél szándékosan kimaradt.
    Külön valódi Copilot-próba: `BFS_RUN_COPILOT_NATIVE=1 node --test
    tests/copilot-native.integration.mjs`, sikeres, 23,0 s; bizonyíték:
    `%TEMP%/bfs-copilot-native-FN61Lv/result.json` és `native-evidence.json`.
    A csomag 34 skillje és kötött natív status hívása sikeres; az új diagnosztika
    egy sikeres status eszközhívást tartalmaz, szabad szöveg nélkül.
    A korábbi helyi bizonyítékokat nem írta át/törölte ez a változás. A setup-
    naplók, összefoglalók helyi útvonalai és korábbi átiratok teljes felülvizsgálata
    még kell az 54. történet elfogadásához; ezek nem minősülnek automatikusan
    megosztható diagnosztikai exportnak.

50. `BFS_RUN_COPILOT_RECOVERY=1` mellett a `tests/copilot-recovery.integration.mjs`
    sikeres, 163,6 s. Bizonyíték: `bfs-copilot-setup-6PjOtW/recovery-project-7v4GtT/result.json`.
    Két valódi Copilot-folyamat ugyanabban a nem Git tesztprojektben, külön
    natív sessionnel kezdett saját workflow-lépést. A teszt kizárólag az egyik
    saját folyamatfát állította le futó eszköz közben. Utána a mentett lépés
    nem volt sikeres, a másik folyamat élt és workflow-ja változatlan maradt.
    A [dokumentált](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
    `--resume=<session-id>` ugyanazt a sessiont és taskazonosságot folytatta.
    A natív visszaolvasás `interrupted` lépést mutatott; a teljes korábbi
    checkpoint egyezett, új health-futtatás és tényleges tesztsiker után lett
    a saját workflow befejezett. A másik session addig életben maradt, saját
    rekordja bájtra változatlan volt; külön elengedve csak a saját lépését
    állította `waiting` állapotba. A befejezett első rekordot nem változtatta.
    Projektfájlok és hostkonfiguráció megőrzöttek; sikertelen eszközhívás nem volt.
    Az első, `recovery-project-RwrNus` futás visszaállítása és health-ellenőrzése
    sikerült, de a teszt csak `workflow resume` útján fogadta el a checkpoint
    olvasását. A modell `workflow checkpoints` listáját most ugyanannak a teljes
    rekordnak az összevetésével kezeli. A sikeres ismétlés friss projektből futott.
    Ez kontrollált folyamatleállítás két Copilot-sessionnel; nem fizikai áramszünet,
    másik hosttal végzett izoláció vagy két IDE-ablak bizonyítéka.

51. A Cursor együttélési javítás jelöltje külön natív azonosítót használ:
    `bontaflowstack-cursor`, MCP: `bfs-cursor`. A npm-név és a `bfs_*` eszköznevek
    változatlanok. A [pluginreferencia](https://prod.cursor.com/docs/reference/plugins)
    azonosítóként írja le a manifest `name` mezőjét; a [helyi betöltés leírása](https://prod.cursor.com/docs/plugins)
    az azonos nevű telepített plugin elsőbbségét dokumentálja. A jelölt ezt a
    névütközést választja szét, nem kapcsolja ki az importokat vagy hostvédelmeket.
    A csomagteszt először a régi azonosítót találta; javítás után sikeres.
    A közös setup metadataellenőrzése is frissült: a Cursor korábbi saját neve
    kompatibilis marad, a többi host neve továbbra is a közös csomagnév.
    Négy célzott setup-teszt sikeres: korábbi saját azonosító frissítése, meglévő
    `bfs` megőrzése, idegen `bfs-cursor`/pluginütközés megőrzése, sikertelen
    könyvtárcsere és részleges többhostos regisztráció. A négy Cursor hook/MCP
    határteszt és az npm-csomagteszt is sikeres.
    A valódi `BFS_RUN_CURSOR_SETUP=1 node --test tests/cursor-setup.integration.mjs`
    sikeres, 95,0 s; `bfs-cursor-setup-jAas4o/result.json`. Tényleges npm-setup,
    ismétlés, frissítés, cache nélküli 34 skill, motor és Impeccable futott;
    az eredeti `bfs` MCP-konfiguráció változatlan maradt. Ez fájl-/motorhatári
    próba, nem az IDE modelljének együttélési bizonyítéka.
    A felhasználó korábbi Cursor-tesztpéldánya bájtra egyezett a saját kezelt
    verzióval; tényleges helyi npm-csomagból frissült `9.9.9-cursor-identity.1`-re.
    Bizonyíték: `bfs-cursor-setup-AlEIBK/identity-install.json`;
    tarball SHA-256: `58627b4b7dd14c8577193de981fbd9c3eb76385b520eb2ef7f2da84f5d7bab06`.
    A globális MCP-konfiguráció változatlan, a forrás egyezik a tartós verzióval.
    A külön `coexistence-project` nem tartalmaz projekt-hookot, így a kézi
    status-próba a plugin saját hookjára támaszkodik. Natív IDE-visszaolvasás
    még nincs; a korábbi globális importkikapcsolás nem tekinthető megoldásnak.

52. A natív `tests/copilot-worktrees.integration.mjs` két valódi Git-worktree-t
    használ az npm-ből telepített Copilot-jelölttel. Az első futásban
    (`bfs-copilot-setup-6PjOtW/worktrees-tV64rj`) a memória/pause/checkpoint,
    shell-cwd utáni projektmegtartás, idegen-worktree átvételének elutasítása
    és az eredeti session visszatérése lefutott. A végső tesztellenőrzés hibásan
    azonos sorvéget várt mindkét checkoutban: a Git már a második worktree
    létrehozásakor CRLF-re alakította a fájlt. A teszt most minden fájlt a saját
    induló bájtjaihoz hasonlít. A teljes újrafutás sikeres, 260,7 s:
    `bfs-copilot-setup-6PjOtW/worktrees-UfQj5q/result.json`,
    `9.9.9-copilot-workflow.1`, Copilot CLI 1.0.96.
    A két worktree projektazonossága közös, workspace-/session-/workflow-azonossága
    különböző. A fő worktree-ből írt, forráshoz kötött memória a másikból
    visszaolvasható; az idegen workflow `adopt` hívása pontosan a várt
    worktree-határral hibázik. Mindkét saját workflow és checkpoint megmarad.
    A natív PowerShell másik könyvtárba lépése után a BFS az eredeti workspace-ben
    marad; az eredeti session `--resume` folytatása saját, változatlan állapotot
    lát, átvételi igény és drift nélkül. Git mindkét checkoutot tisztának jelzi,
    az induló fájlbájtok és hostkonfiguráció változatlanok. Az egyetlen hibás
    tooleredmény a szándékos idegen-worktree átvételi próba.
    Ez két Copilot-session/worktree bizonyítéka, nem hostok közötti vagy
    két Cursor-ablakos izolációé. A közös magon nem kellett ehhez módosítani.

53. Az öt npm-setup integrációs teszt új parancsdiagnosztikája kizárólag a
    kilépési kódot és a stdout/stderr bájtméretét menti `*.command-evidence.json`
    fájlba. Nem ment teljes parancskimenetet; a Codex/Claude összesítő parancslistája
    sem tartalmaz többé argumentumot, cwd-t vagy szabad szöveges hibát.
    A titok-/e-mail-/személyesútvonal-canary először a hiányzó export miatt hibázott,
    a megvalósítás után mindkét diagnosztikai teszt sikeres. A négy új host
    setup-tesztjének betöltése sikeres, de opt-in nélkül kihagyott; ez nem natív próba.
    A tényleges `BFS_RUN_OPENCODE_SETUP=1 node --test tests/opencode-setup.integration.mjs`
    ezt követően sikeres, 133,5 s: `bfs-opencode-setup-J5xjh8/result.json`.
    OpenCode 1.19.0, valódi npm telepítés/ismétlés/frissítés, 34 skill,
    cache-független betöltés, Impeccable, JSONC és idegen/tiltott beállítások
    megőrzése igazolt. A 13 új parancsdiagnosztika mezőellenőrzése sikeres;
    a próbagyökérben nulla nyers stdout/stderr napló keletkezett.
    A többi host teljes setupja ezen a diagnosztikai változaton még nem futott újra.
    Korábbi naplók, saját hostnaplók és a helyi eredményfájlok útvonaladatai
    megmaradtak; egy teljes tesztkönyvtár továbbra sem megosztható diagnosztikai csomag.

54. A `BFS_RUN_COPILOT_BROWSER_ISOLATION=1 node --test tests/copilot-browser-isolation.integration.mjs`
    valódi, npm-ből telepített Copilot-próbája sikeres, 126,6 s:
    `bfs-copilot-setup-6PjOtW/browser-isolation-MtBpM2/result.json`.
    Két egyidejű natív session ugyanabban a projektben külön BFS-böngészőt
    nyitott. A helyi HTTP-fixture mindkettőnek külön session-cookie-t adott;
    egy tényleges kattintás csak a lap memóriájában hozott létre jelölést.
    Az első agent saját böngészője és CLI-folyamata leállt, miközben a másik
    CLI még futott. A második ezután navigáció vagy újraindítás nélkül
    visszaolvasta a megmaradt lapjelölést, majd a szerver a saját session-cookie-ját
    kapta meg. Végül az is csak saját böngészőjét állította le. Sandbox, külön
    session-/taskazonosság és változatlan fixture-/hostkonfiguráció igazolt;
    hibás eszközeredmény egyik sessionben sem volt.
    Az első futás (`browser-isolation-27V2LQ`) a teszt korai status-választásán
    hibázott: a böngésző megnyitása előtti `stopped` állapotot nézte. A javított
    teszt a várakozás előtti legutolsó tényleges status-választ ellenőrzi.
    Nem kellett hozzá mag- vagy adapterváltoztatás. Ez egy host két sessionje,
    nem két külön host böngészőizolációja vagy emberi bejelentkezési átadás.

55. Az OpenCode kontextuspróba korábbi elutasításához a nyilvános
    [#51241 hibajegy](https://github.com/anomalyco/opencode/issues/51241)
    engedélyfüggő reprodukciót ír le: a shell teljes eltávolítása a szabad modell
    kérését is elutasíthatja. Ez upstream beszámoló, nem a gateway saját mérése.
    A [hivatalos permissions-leírás](https://docs.opencode.ai/docs/permissions/)
    szerint az `ask` jóváhagyást kér; nem jelent automatikus engedélyt.
    Az aktuális npm-jelöltön `bash:deny` mellett a kontextuspróba ismét az első
    tool előtt hibázott (`bfs-opencode-setup-J5xjh8/context-PCCLQH`, 8,5 s,
    egy host error esemény, nulla tool). Csak a tesztfolyamat agentbeállításában
    `bash:ask` lett; a prompt és a teszt továbbra is tilt minden shell- és
    fájlmódosító hívást. Nem kapott `--auto` flaget, a felhasználói/fixture
    konfiguráció fájlja változatlan, a BFS-setup és a termékkód nem módosult.
    A teljes `BFS_RUN_OPENCODE_CONTEXT=1 node --test tests/native-context.integration.mjs`
    ezután sikeres, 333,4 s: `bfs-opencode-setup-J5xjh8/context-1aSsCd/result.json`.
    OpenCode 1.19.0, `opencode/longcat-2.5-preview-free`, npm-jelölt
    `9.9.9-opencode-test.1`, HOST SHA-256
    `ec827c2e48d98e8e461ed7280d3db3deaab39374ec99c72c7630678374d7ae3d`.
    Natív skill/HOST/preferences hívások, megfigyelt forráshoz kötött memória
    írás/visszaolvasás, pause és checkpoint, új sessionben drift és kifejezett
    adopt, valamint a másik nem Git projekt üres memória/workflow/checkpoint
    listája igazolt. A memória és checkpoint bájtjai változatlanok maradtak.
    A mentési szakaszban egy natív `read` hívás hibázott; a megkövetelt
    feladatút és visszaolvasások ettől függetlenül teljesültek. Resume és isolation
    hibás tool nélkül futott; shell- vagy fájlmódosító hívás egyik szakaszban sem volt.
    Ez a tesztfeltétel nem javítja meg az upstream deny/free-model összeférhetetlenséget,
    és a csomag nem állíthatja át a felhasználó engedélyeit ennek elfedésére.

56. A már futó `BFS_RUN_OPENCODE_ENGINES=1 node --test tests/opencode-engines.integration.mjs`
    155,8 s után hibával zárult: `bfs-opencode-setup-J5xjh8/engines-project-VWU0fY`.
    Az Impeccable-assertion előtt sikeresen ellenőrizte a natív bfs-browse aktiválást,
    HOST/preferences olvasást, kötött státuszt, tényleges böngészőkattintást és
    visszaolvasást, sandboxot, 1280×800 és 375×800 PNG-ket, valamint a tényleges
    PNG-bájtok átadását a natív read kép-mellékleteiben. A saját böngésző leállását
    utólag a natív session eszközeredményéből ellenőriztük.
    A modell `engine design-detect --detect --json style.css` hívást adott a
    dokumentált `engine design-detect -- detect --json --no-config style.css`
    helyett. Az Impeccable tényleges `overused-font` találatot és 2-es kilépést
    adott, de a hibás argumentumú BFS-hívás `status:failed` lett.
    A tesztprompt most megadja a dokumentált argumentumlistát; termékkód nem
    változott. Csak az Impeccable-hívást ismételtük, teljes engine-próbát nem:
    ez 90 s után időkorlátba futott, nulla tool eseménnyel
    (`impeccable-retry.native-evidence.json`). Nem tekintjük sikernek, nem
    ismételjük tovább általános lefedettségi céllal. A browse/render/képátadás
    részeredménye használható; a teljes OpenCode Impeccable MCP-út még nem igazolt.
    A prompt szintaxisellenőrzése és `git diff --check` sikeres.

57. A megosztott diagnosztika OpenCode esetén eddig nem számolta a natív
    `read` eredményének kép-mellékleteit, ezért E56 két átadott kép mellett is
    nulla képet jelzett. A canary ellenőrzés először ezt a hibát mutatta,
    majd az egy soros javítás után `node --test tests/native-evidence.test.mjs`
    2/2 sikeres. Csak a kép-mellékletek száma kerül a diagnosztikába; URL,
    képbájt, prompt és személyes tartalom továbbra sem. A PDF nem növeli a
    képszámot. A diagnosztikai teszt bekerült a közös `scripts/check.mjs` kapuba.
    Ez a naplózást javítja; nem volt új modellpróba, a történeti naplókat nem írtuk át.

58. `node --test --test-name-pattern 'different hosts' tests/opencode-host.test.mjs`:
    1/1 sikeres, 6,1 s. Egyetlen közös próba a tényleges Copilot hook- és MCP-
    folyamat, valamint az OpenCode nyilvános V1 callback és MCP-folyamat között.
    Azonos projektben és azonos nyers sessionnév mellett közös projekt-/workspace-
    azonosság, eltérő feladattulajdon, közös memória, kölcsönösen elutasított
    idegen híváskötés és workflow-módosítás igazolt. A rossz host nem fogyasztotta
    el a másik host érvényes kötését. Az OpenCode idle csak saját munkáját
    szakította meg; a Copilot munkája a saját sessionEnd eseményéig futott.
    Ez nyilvános adapterhatár-próba, nem két valódi modell párhuzamos futása.

59. A teljes előírt közös kapu, `node scripts/check.mjs`, sikeres:
    **153/153, 0 hiba, 0 kihagyás**, exit 0, 288,4 s.
    Tartalmazza a Codex/Claude regressziókat, a négy új adapter-/csomagtesztet,
    az npm-setupot, a közös adat-/workflow-/guard-határokat és az E57/E58
    ellenőrzéseit. Nem indított új natív modellfutást. A kódfájlok változatlanok
    maradtak e futás alatt; a dokumentációs állapottáblázat közben pontosult.
    Helyi eredmény: `.tmp/host-expansion-shared-gate-1791923604937.json`.
    Az `adapters/plugins/installers/scripts/tests` könyvtárak 236 verziózott vagy
    új, nem ignorált fájljának név+sorrend+bájttartalom SHA-256 lenyomata:
    `28b84f27b2297291b880f5160eacb4a60ba5fd6de7dc5c2228139a5986c2efa8`.
    A hash UTF-8 fájlnév, NUL, tartalom, NUL sorozatokból készült,
    lexikografikusan rendezett repo-relatív fájlnevekkel.
    Ez a helyi közös kapu bizonyítéka, nem a még hiányzó natív portutaké.

60. Az 54. történet megosztható eredményösszegzését a meglévő diagnosztikai
    segéd egészíti ki, új függőség nélkül. Mind a 23 új port-/közös setup-
    eredményíró az eredeti, privát folytatási rekord mellé
    `*.acceptance-evidence.json` fájlt ír. Csak előre meghatározott boolean
    eredménymezőket, engedélyezett hostnevet, skilldarabszámot és szabályos
    HOST-kódhash-t tart meg. Útvonalak, session-/workflow-azonosítók, események,
    argumentumok, hibaszövegek és ismeretlen mezők nem kerülnek bele.
    A `reportedStatus` az eredeti rekord állapota; hiányzó/ismeretlen állapot
    `unverified`, nem következtetünk sikerre a parancs 0-s kilépéséből.
    A rögzített `recorded-checks-only` scope kizárja a teljes portelfogadás látszatát.
    A canary teszt RED után GREEN, a diagnosztikai fájlkimeneti próbák 3/3
    sikeresek. A 23 hívó szintaxisellenőrzése sikeres. Nyolc meglevő tényleges
    setup/engine/workflow/context/worktree rekordból is elkészült az összegzés;
    az eredeti fájlok hash-e változatlan maradt. Új natív modell- vagy setupfutás
    nem indult, a teljes kaput nem ismételtük. E59 a korábbi teljes kapu;
    az azóta változott fájlok csak a diagnosztika, teszthívók és dokumentáció.
    A régi privát naplókat nem töröltük vagy írtuk át; kizárólag a három
    dokumentált `*.command-evidence.json`, `*.native-evidence.json`,
    `*.acceptance-evidence.json` formátum osztható meg.

61. A felhasználó átadta a korábban kézi Cursor-próba végrehajtását. Cursor IDE
    `3.24.12`, a tényleges npm-mel telepített `9.9.9-cursor-identity.1` jelölttel:
    a `coexistence-project` új ablakában visszakapcsoltuk a korábbi diagnózis
    során kikapcsolt third-party importot, majd újratöltöttük az ablakot.
    A Customize egyszerre mutatta a helyi Cursor-jelöltet és az importált BFS-t;
    a jelölt részleteiben 34 skill, hét hook és a `bfs-cursor` öt eszköze szerepelt.
    Az új chat egyetlen `bfs-cursor/bfs_status` hívása sikeres volt. A kibontott
    tényleges eszközeredmény `cursor-ide` hostot, a chat valós sessionazonosítóját,
    a helyes projektet és `chromiumSandbox:true` értéket adott. A projektben
    nincs `.cursor/hooks.json`; külön diagnosztikai hook nem segítette a próbát.
    Bizonyíték: `bfs-cursor-setup-AlEIBK/identity-native-status.json` és a
    személyes útvonalat/sessiont nem tartalmazó acceptance-companion.
    A korábbi hiányzó kötés hiba és az importált példánnyal való együttélés ezen
    az úton rendezett. Ez státusz- és betöltési próba, nem teljes skill/motoros
    feladatút vagy adminpolicy/azonos nevű marketplace-ütközés vizsgálata.

62. A [draft PR #5](https://github.com/BillBalint-SM/bontaflowstack/pull/5)
    első Windows Node 24 CI-futása 152/154 eredménnyel állt meg. Két új csomagteszt
    ugyanazon ideiglenes mappa rövid (`RUNNER~1`) és teljes Windows-nevét
    hasonlította össze szövegként. A Cursor/OpenCode fixture gyökerét most
    `fs.realpathSync.native` oldja fel; termékkód nem változott.
    `node --test tests/cursor-package.test.mjs tests/opencode-package.test.mjs`:
    **2/2 sikeres**, 0 kihagyás. A `fa0af7d` commit GitHub Windows Node 24
    push- és PR-ellenőrzése is **sikeres**: `38468120988` és `38468127207`.

63. A Cursor reprezentatív skillpróbájának előkészítése konkrét szöveges hibát
    talált: a generált skill és referencia még `bfs` szervert nevezett meg a
    tényleges `bfs-cursor` helyett. A közös generátor mind a 34 skill és az
    érintett referenciák szervernevét javítja. A Cursor csomagteszt új állítása
    először a várt hibával elbukott; a javítás után a négy host csomagtesztje
    **4/4 sikeres**, 0 kihagyás. Új helyi `9.9.9-cursor-skill.1` npm-jelölt
    készült, és a tényleges `npx --package <helyi-tgz> -- bontaflowstack setup
    --host cursor` frissítette a kezelt teszttelepítést. Az első kísérlet eltérő
    telepítési gyökérrel futott és megőrzési hibával megállt; a fixture eredeti
    `LOCALAPPDATA`-gyökerével a setup sikeres. Npm-publikálás nem történt.

64. A friss helyi npm-jelöltet újratöltött Cursor IDE 3.24.12-ben, új Agent
    chatben vizsgáltuk, Cursor Grok 4.6 Medium modellel. A telepített
    `bfs-bontaflow-memory` skill `write` útja **sikeres**, 58 másodperc:
    skillolvasás, HOST-betöltés, memóriaírás és natív MCP `memory history`
    visszaolvasás. Egy rossz preferenciahívást a modell a dokumentált alakkal
    önállóan javított. A kibontott MCP-eredmény és a külön, csak olvasó core
    ellenőrzés azonos rekordot és pontos szöveget adott. A tesztprojektben
    nincs projekt-hook; az importált BFS-példány bekapcsolva maradt.
    Terminálparancsot nem kértünk a Cursortól. Ez egy konkrét skillfeladatút
    bizonyítéka; nem böngésző/render- vagy adminpolicy-elfogadás.

65. Ugyanebben a telepített Cursor-jelöltben és Agent chatben a `bfs-browse`
    böngészős feladatút, a két render és az Impeccable-vizsgálat **lefutott**,
    de nem hibamentesen (3 perc 9 másodperc). A saját helyi oldalon friss
    snapshot után kattintás történt, az új snapshot tartalmazta a
    `BFS_BROWSER_CLICK_OK` jelet. A 1280×800 és 375×800 render `completed`,
    üres hibalistával és vízszintes túlcsordulás nélkül; a két PNG fejlécét
    külön is ellenőriztük, és a Cursor natív képolvasója mindkettőt megnyitotta.
    Az Impeccable a szándékosan megadott `Inter` betűtípusra `overused-font`
    figyelmeztetést adott, 2 kilépési kóddal. A natív státusz a tényleges
    sessiont/projektet és bekapcsolt Chromium sandboxot adta vissza, majd a
    saját böngésző leállt. A postToolUse-napló eredményei külön visszaolvasva
    egyeztek a felületen látottakkal; a rögzített mezőjű összegzés elkészült.

    Négy éles `preToolUse` hívás üres kimenettel, 0 kilépési kóddal tért
    vissza (1980–7548 ms), ezért a Cursor `failClosed` miatt megtagadta őket.
    Ezek egy Read, két skillbetöltés és egy browser text hívás voltak;
    a későbbi ismétlések/snapshot után a feladat befejeződött. A stderr csak
    PowerShell modul-előkészítési CLIXML-üzenetet tartalmazott. **Az ok nincs
    igazolva**, a hook változatlan; ezt nem nevezzük javított vagy tiszta E2E-
    futásnak. A [hivatalos hookleírás](https://cursor.com/docs/hooks) szerinti
    failClosed-megtagadás megfigyelt, a védelmet nem kapcsoltuk ki.

    Ezután a látható `connect` → `goto` → `snapshot` → `handoff` út sikeres,
    a böngésző nyitva várja az ember tesztgombos kattintását. A `resume` és
    ugyanazon sessionben történő visszaolvasás még nincs igazolva.
    A `b0d95e8` commit mindkét Windows Node 24 CI-futása sikeres:
    `38470164941` és `38470170746`. Közös tesztkaput nem ismételtünk.

66. Az E65-ben megnyitott látható böngészőben az ember megnyomta az átadási
    tesztgombot: a felhasználói megerősítés és képernyőkép mellett a saját
    fixture naplója egyetlen `POST /human-ack` kérést rögzített a megfelelő
    session-cookie-val. A képernyőn `BFS_HUMAN_HANDOFF_OK` jelent meg.
    A Cursor ezután a folytatási kérésre használati keretkimerülést jelzett.
    A natív hooknaplóban az új turn csak `beforeSubmitPrompt` és hibás `stop`
    eseményt tartalmaz: eszközhívás nem indult. Az emberi lépés igazolt,
    a natív `resume`, friss snapshot és saját böngészőleállítás még nem.
    A böngészőt és a saját helyi fixture-t megőriztük; újratöltés nélkül kell
    folytatni, ha a host ismét használható. Nem indult fizetős váltás vagy retry.

    A hook Windows-shellhatárának célzott UTF-8-próbája `cmd.exe` és
    `powershell.exe` alól is sikeres (`cursor-package`: 1/1); a külön
    folyamatpróba három négyes hullámban 12/12 helyes választ adott.
    Ezek közvetlen csomagfolyamatok, nem Cursor által indított hookok:
    az E65 időszakos hibáját nem reprodukálták, javítást nem igazolnak.
    A hook implementációját és a `failClosed` beállítást nem módosítottuk.
    Az `a0c750a` commit mindkét Windows Node 24 CI-futása sikeres:
    `38473262687` és `38473266910`.

67. A telepített Cursor 3.24.12 Windows hookindítójának csak olvasó vizsgálata
    az ideiglenes UTF-8 JSON-fájl `Get-Content -Raw` alapú továbbítását mutatta.
    Ezt saját adatokkal, külön folyamatban visszajátszottuk: Windows PowerShell
    5.1 alatt 6/6 ékezetes bemenet megváltozott, PowerShell 7 alatt 6/6 egyezett.
    A gépen már telepített Store PowerShell 7 külön ASCII-próbája 12/12 sikeres.
    Egyik sorozatban sem volt üres stdout vagy az exit után érkező kimenet.
    Ez **hostindító-reprodukció**, nem új natív Cursor-feladatút, és nem az E65
    üres kimenetének igazolt oka. A Windows PowerShell 5.1 továbbítási eltérése
    külön megfigyelt kompatibilitási korlát; a közvetlen E66-csomagteszt ezt a
    fájlos hosttovábbítást nem tartalmazta.

    A vizsgált Cursor-kód elérhető `pwsh`-t választ a `powershell` előtt;
    az E65 konkrét külső shellje ebből még nem bizonyított. Az alkalmazás
    a folyamat exit eseményén adja vissza az összegyűjtött kimenetet, de a
    kimenetvesztésre vonatkozó versenyhelyzet továbbra is csak hipotézis.
    Nem változtattunk a hookon, a védelmen, a shellbeállításon vagy a Cursoron.

    A [hivatalos pluginleírás](https://cursor.com/docs/plugins#test-plugins-locally)
    a helyi import adminszabályát és a marketplace elsőbbségét leírja, viszont
    a vizsgált dokumentációban nem találtunk ezekhez npm-ből használható,
    támogatott IDE-visszaolvasást. A talált belső, team/workspace-függő cache
    nem igazolja önmagában az aktuális betöltési döntést. A 41/42. történet
    ezért nyitott; feltételezésből nem építettünk automatikus felismerést.
    A `75b2dd6` commit mindkét Windows Node 24 CI-futása sikeres:
    `38474807054` és `38474813494`. Új natív modellpróba nem indult.

Az OpenCode-specifikus leképezések forrásai a [V1 plugin API](https://docs.opencode.ai/docs/plugins/),
a kiadott `@opencode-ai/plugin@1.19.0` típusok és az adott tag
[tool callback hívásai](https://github.com/anomalyco/opencode/blob/v1.19.0/packages/opencode/src/session/tools.ts),
[shellneve](https://github.com/anomalyco/opencode/blob/v1.19.0/packages/opencode/src/tool/shell/id.ts),
[shellkiválasztása](https://github.com/anomalyco/opencode/blob/v1.19.0/packages/core/src/shell.ts).
Gemini-források: [hookok](https://geminicli.com/docs/hooks/reference/),
[policy](https://geminicli.com/docs/reference/policy-engine/),
[API-modellek díjazása](https://ai.google.dev/gemini-api/docs/pricing).

A próbák saját ideiglenes könyvtárakban futnak. A megosztható diagnosztikai
formátumok E49/E53/E57/E60 szerint kizárják a nyers tartalmat és személyes
azonosítókat. Az eredeti folytatási rekordok és régi naplók privátak; teljes
tesztkönyvtár nem megosztható export. Hitelesítési fájlokat nem másolunk a
diagnosztikai összegzésekbe.

## Egyszeri záró review — 2026-10-13

A két független, csak olvasó vizsgálat a `2c565fb2bb27816ff4aac8f4e0f400dc3edac876`
alaphoz képest a teljes munkapéldányt és az új fájlokat is vizsgálta. Nem futtatott
újabb teljes tesztkaput vagy natív modellpróbát.

### Standards

Egy konkrét dokumentációs hiba: a képességprofil négy portlinkjének nagybetűs
fájlneve eltért a tényleges kisbetűs nevektől. A hivatkozások javítva; Windows
fájlelérése ezt korábban elfedte. Más igazolt kódhibát a review nem állapított meg.

### Spec

Egy részleges követelmény: a Cursor telepítője a helyi plugin- és MCP-ütközéseket
ellenőrzi, de az IDE adminpolicyját és marketplace-elsőbbségét nem olvassa vissza
(41/42. történet). A setup és HOST most pontos nevekkel ad hibakeresési útmutatót;
ez nem a tényleges tiltó feltétel automatikus felismerése.

Egy elfogadási hiánycsoport: Gemini csomagolt skill/model útja kvótába ütközött,
a Cursor új azonosítóinak normál IDE-együttélése E61-ben, memória-skillútja
E64-ben azóta sikeres; a motoros IDE-feladatút E65-ben lefutott, de az ott
megfigyelt időszakos üres hookválasz oka nyitott. E66-ban az emberi kattintás
igazolt, a Cursor keretkimerülése a natív folytatást eszközhívás előtt megállította.
Az OpenCode saját sikeres
Impeccable-modellhívásának hiánya külön rögzített bizonyítéki korlát; a közös,
helyes argumentumú út E42 és a setup E53 bizonyítéka felhasználható, ezért ez
önmagában nem indokol újabb teljes hosttesztet. A review nem igazolt további
hibás megvalósítást vagy hatókörön kívüli funkciót.

Összesen: Standards 1 javított hiba; Spec 1 részleges követelmény és 1 nyitott
elfogadási hiánycsoport. A teljes 54 történet / 36 tétel nincs késznek minősítve.

## A 36 munkatétel állapota

A „kész” itt az adott megvalósítási tételt jelenti a pontosított tesztelési
elv szerint, nem a teljes port elfogadását. A közös bizonyítékot nem futtatjuk
újra minden hoston. A portok külön 07-es tétele és K07/K08 marad a teljes
elfogadás, a végső közös review és az átadás nyilvántartása.

| Tétel | Állapot | Még szükséges bizonyíték / megvalósítás |
| --- | --- | --- |
| K01 | kész | négy port hivatalos forrásai, rögzített Windows-verziói és rövid natív próbái; E4–E9 |
| K02 | leltár kész | 34 skill / 75 mód, hostfeltételek és bizonyítékok; a nyitott natív működésvizsgálatok K07-ben maradnak |
| K03 | kész | négy adapter nyilvános hook/callback–MCP szerződése; natív minimumpróbák; E58 közös, hostok közötti védelem. A teljes Cursor-csomag külön C01/C07 |
| K04 | kész | mind a négy build és 34 skill felfedezése; teljes módleltár K02-ben. Cursor együttélés C01/C02 |
| K05 | folyamatban | npm-setup, részhiba és közös megszakítás/helyreállítás ellenőrizve; Cursor együttélés E61/E64 sikeres, 41/42. történet még nyitott |
| K06 | kész | közös mag + négy adapterhatár; E40/E50/E52/E54/E55 natív részeredmények, E58 hostok közötti memória/tulajdon. Nem állítunk natív két-hostos böngészőpróbát |
| K07 | vár | tényleges npm-csomagból teljes A01–A10 elfogadás |
| K08 | vár | igazolt végállapot dokumentálása és kiadás-előkészítés |
| G01 | kész | natív pozitív, tiltási, hibás kilépési és timeout próba; cwd/helyreállítás a Gemini adapterhatáron és közös magban |
| G02 | folyamatban | extension build és 34 skill natív felfedezése kész; modellbeli aktiválás kvótahiba miatt nem igazolt |
| G03 | kész | tényleges BFS status kötése, csomagolt extension MCP, szóközös/aposztrófos útvonal; E6/E17 és Gemini határtesztek |
| G04 | kész | eseményleképezés, mentett lépés és worktree-helyreállítás a nyilvános Gemini hook/MCP-határon; a közös mentés/folytatás natív bizonyítéka E40/E55 |
| G05 | vár | motorok és emberi átadás |
| G06 | kész | E19 tényleges npm setup/ismétlés/frissítés és cache-független futás; közös forráscsere helyreállítása E43–E46 |
| G07 | vár | teljes Gemini-elfogadás |
| P01 | kész | natív pozitív, tiltási, hibás kilépési és timeout próba; E50/E52 folyamatleállítás/folytatás és shell-cwd |
| P02 | kész | Agent Plugins 1.0 csomag, 34 skill, módprofil; E28/E40/E48 natív health/context/terv–implementálás–ellenőrzés |
| P03 | kész | natív MCP/session/cwd/worktree; E58 másik host kötésének és tulajdonának elutasítása a nyilvános határon |
| P04 | kész | E40/E50/E52 pause/új session/adopt, leállított folyamat folytatása és worktree-kezelés; meglévő toolhiba-határtesztek |
| P05 | folyamatban | natív browser/render/Impeccable, PNG-modellátadás és két élő session böngészőizolációja sikeres; egy közös emberi átadás még kell, újabb hostmátrix és extra funkció nem |
| P06 | kész | natív npm setup/ismétlés/frissítés/cache-függetlenség; tiltás/ütközés, motorfázis/forráscsere megszakítás és közös regisztrációs részhiba/helyreállítás |
| P07 | vár | teljes Copilot-elfogadás |
| C01 | folyamatban | E61/E64 teljes helyi csomag natív státusz- és memóriahívása importált BFS mellett sikeres; tiltó adminpolicy és pontos marketplace-névütközés még nyitott |
| C02 | kész | Cursor csomag, 34 skill, módprofil; E61 komponensbetöltés, E64 natív memória-skillút az importált BFS mellett |
| C03 | kész | prefixelés, BOM/Windows-útvonal, chat/workspace és idegen kötés a nyilvános hook/MCP-határon; E8 natív minimum. A teljes csomag C01/C07-ben nyitott |
| C04 | folyamatban | session/workspace helyreállítás és guard folyamatpróbája sikeres; E65 natív failClosed-megtagadás megfigyelt, az üres válasz oka nyitott |
| C05 | folyamatban | E65 natív browser/render/Impeccable és képolvasás lefutott, időszakos hookhibák után; E66 emberi kattintás igazolt, natív folytatás Cursor-keret miatt vár |
| C06 | folyamatban | tényleges npm setup/ismétlés/frissítés, közös rollback és motorok; E61 normál natív státuszhívás és import-együttélés. Adminpolicy/azonos nevű marketplace-felismerés még nyitott |
| C07 | vár | teljes Cursor-elfogadás |
| O01 | kész | rögzített V1 API; E5/E9 tényleges callback/MCP módosítás és tiltás; megszakításkezelés O04 |
| O02 | kész | V1 plugin, 34 skill natív felfedezése, módprofil, JSONC/idegen skill megőrzése; E36 health út |
| O03 | kész | natív státusz/health/context; E58 idegen hostkötés és workflow-módosítás elutasítása a nyilvános határon |
| O04 | kész | idle/error/deleted és új prompt szerződéspróbái, csak saját aktív lépés megszakítása; E55 natív mentés/folytatás, E58 hostok közötti lifecycle-elkülönítés |
| O05 | folyamatban | E56: natív browser/render/PNG-modellátadás és saját cleanup igazolt; Impeccable MCP-hívás és emberi átadás még nem |
| O06 | kész | E33/E53 tényleges npm setup/ismétlés/frissítés/cache-függetlenség; JSONC/tiltás/idegen skill megőrzése; közös setup-részhiba kapui |
| O07 | vár | teljes OpenCode-elfogadás |

## Felhasználói történetek elfogadása

A történetek számozása a specifikációé. **Igazolt rész**: a megnevezett működéshez
van ellenőrzött megvalósítás és a pontosított tesztelési elv szerinti bizonyíték;
ez nem négy külön natív E2E-futást és nem a teljes port elfogadását jelenti.
**Nyitott**: a megnevezett kötelező rész még hiányzik vagy nincs igazolva.
A feltételeket a kész megvalósítási tételekből és a nyitott részekből együtt kell
értékelni; az 54 történet teljes E2E-elfogadása még nincs lezárva.

| # | Megfigyelt megvalósítás / bizonyíték | Még nyitott rész |
| --- | --- | --- |
| 1 | Tényleges npm setup mind a négy hosthoz: E19/E25/E29/E33/E51/E53; E61 Cursor normál betöltés, E63/E64 frissítés és memória-skillút | A külön motoros út és teljes portelfogadás még nyitott |
| 2 | Közös hostfelismerés/verzióválasztás; `npm-setup` és `npm-package` szerződéspróbák, hostonkénti tényleges telepítés; E61 aktív Cursor | A tiltó Cursor-policy és marketplace-eset külön C01 |
| 3 | E59: Codex/Claude telepítési, csomag- és közös MCP-regressziók a sikeres közös kapuban | Nincs új előfizetéses natív próba szükség |
| 4 | CLI help, npm README, hostminimumok és Windows x64/Node 24+ előfeltételek | Nincs külön új modellpróba szükség |
| 5 | Idegen MCP/skill/plugin és megváltoztatott saját fájl megőrzése a setup-próbákban | Cursor import-/marketplace-elsőbbség: 41/42. történet |
| 6 | Ugyanazon npm setup út tényleges verzióváltása mind a négy hoston | Nincs új módszer vagy ismételt mátrix szükség |
| 7 | Ismételt tényleges setup; változatlan regisztráció és adat | Nincs külön nyitott megvalósítás |
| 8 | E43–E46 részhiba, előző változat megőrzése, közös forráscsere visszaállítása; Cursor rollback-próba | Nem állítunk minden natív regisztrációs fázisban külön folyamatölést |
| 9 | `setup-status.json`, hostonként placed/registered/failed/reload-required; részhiba nem összesített siker | Cursor aktív readback külön lépésként marad jelölve |
| 10 | Cursor setup csak elhelyez és újratöltést jelez; futó IDE-t nem zár be; E61 felhatalmazással végzett natív újratöltés/visszaolvasás | Nincs külön nyitott megvalósítás |
| 11 | Ismeretlen/hiányzó host és elégtelen verzió megtagadása a setupban | Nincs külön nyitott megvalósítás |
| 12 | 34 skill mind a négy csomagban és natív felfedezésben; build- és katalógusellenőrzés; E61 Cursor együttélés, E64 memória-skillút | Gemini teljes modellbeli aktiválás E20 |
| 13 | 34 skill / 75 mód teljes, ellenőrzött képességleltára, hostfeltételekkel | A natív bizonyítéki besorolás a nyitott próbák szerint marad U/B |
| 14 | HOST és képességprofil név szerint kizárja a hiányzó extrákat | Nem ígérünk natív párhuzamosságot vagy raszteres generálást |
| 15 | Hostonkénti HOST/skill/MCP/parancsformátum, hivatkozások és csomagtesztek; E63 javítja a generált Cursor-szervernevet | A hibás modellhívás nem írja át a dokumentált szerződést; E56/E64 |
| 16 | E58 tényleges hook/callback–MCP-határ két host között: közös projektmemória | Nem két párhuzamos valódi modellfutás |
| 17 | Négy adapterhatár és közös mag; E40/E55 natív másik projekt üres állapota | Nincs szükség ugyanezen közös állapotlogika újabb hostonkénti ismétlésére |
| 18 | Külön task/workflow-tulajdon; E50/E52/E58 idegen művelet és esemény nem zár másik munkát | Nincs külön nyitott közös megvalósítás |
| 19 | Mentett ellenőrizhető checkpoint; E40/E48/E50/E55 natív út és közös tartalmi hash-ellenőrzés | Nincs külön nyitott közös megvalósítás |
| 20 | E40/E55 új session/drift/adopt, E50 azonos session folytatása folyamatleállítás után | Gemini/Cursor reprezentatív portelfogadása külön nyitott |
| 21 | Négy adapter cwd-leképezése; E52 tényleges shell-cwd váltás változatlan tulajdonnal | Nincs új teljes hostmátrix szükség |
| 22 | Közös Git-projekt és külön worktree; adapterhatártesztek + E52 natív út | Nincs külön nyitott közös megvalósítás |
| 23 | Nem Git workspace-azonosság a határtesztekben és E40/E55 natív próbában | Nincs külön nyitott közös megvalósítás |
| 24 | Közös egyszer használható/argumentumhoz kötött, lejáró kötés; E58 idegen host megtagadva | Ez BFS-állapotvédelem, nem általános host- vagy OS-sandbox |
| 25 | Portleírások külön rögzítik a hook- és timeout-határokat; E7/E9 és adapterhatártesztek | Nem állítunk minden shellhívásra garantált hostoldali blokkolást |
| 26 | Setup nem ír trust/allow policyt; hook nem ad natív engedélyt; megőrzési tesztek | A host saját emberi jóváhagyása szükséges marad |
| 27 | E42/E56 valódi Copilot/OpenCode böngészőinterakció; E65 Cursor kattintás/snapshot/saját cleanup | Cursor időszakos hookhibája; Gemini skill/model út |
| 28 | E42/E56 valódi render és képmelléklet; E57 képszámlálás; E65 Cursor két render és natív képolvasás | Ugyanazok a hostbelépési hiányok, mint 27-nél |
| 29 | Mind a négy tényleges npm setup automatikus Impeccable; E42/E65 sikeres natív MCP; közös engine/MCP exitkód-szerződés | E56 OpenCode modell rossz argumentumot adott; helyes natív ismétlés tool előtt timeoutolt |
| 30 | Közös browser handoff/resume rendelkezésre áll; E65 aktuális Cursor-jelöltből látható böngésző és handoff sikeres; E66 emberi kattintás és cookie igazolt | Ugyanazon session natív folytatása a Cursor használati kerete miatt még nincs igazolva; nem négyszeres ismétlés |
| 31 | E54 két élő Copilot böngésző külön cookie/DOM/cleanup; E58 eltérő hosttask és izolált lifecycle | Az emberi átadás 30 szerint nyitott; natív két-hostos böngészőpróbát nem állítunk |
| 32 | Párhuzamos mód csak bizonyított gyermekazonossággal; új portoknál a profil X | Nincs kötelező új alagentfunkció a vállalt alapban |
| 33 | Soros működés és nem igazolt párhuzamos extra külön jelölve minden HOST-ban | Nincs külön nyitott megvalósítás |
| 34 | Raszteres generálás/szerkesztés nem ígért; képolvasás és szerkesztett HTML/SVG külön szerepel | Képértelmezés host-/modellfeltételeit nem általánosítjuk |
| 35 | HOST szerint tényleges chatkérdés, illetve támogatott MCP-form; a natív engedélyt nem helyettesíti kitalált válasz | Látható böngészős emberi folytatás 30 szerint |
| 36 | E17/E19 natív Gemini extension, hook/MCP és 34 skill | Teljes skill/model út E20 kvótakorlátja |
| 37 | Gemini mentés nem csak SessionEnd; AfterAgent és következő turn helyreállítása a határtesztben | Közös tartós mentési bizonyíték E40/E50/E55 felhasználva |
| 38 | E24/E25/E46 natív Copilot marketplace/plugin verzió és tartós forrás readback | Nincs külön nyitott megvalósítás |
| 39 | E7 külön deny/crash/timeout: hiányzó kötés nem hoz létre sikeres BFS-műveletet | A shell timeout-viselkedéséből nem következtetünk garantált tiltásra |
| 40 | Copilot alagenttípusok nem kapnak igazolatlan BFS párhuzamos támogatást | Dokumentált extra-korlát, nem kötelező fejlesztési hiány |
| 41 | Setup nem állít aktív betöltést; a helyi import feltétele dokumentált | Tiltott IDE-import/policy konkrét hostoldali azonosítása még nyitott |
| 42 | E51 külön Cursor plugin-/MCP-azonosító; idegen helyi név és MCP megőrzése/megtagadása; E61 importált BFS mellett natív hívás sikeres | Az új Cursor-ID-val pontosan azonos nevű marketplace-csomag felismerése még nem igazolt |
| 43 | OpenCode 1.19.0 V1 API, külön manifest/config callback; verziókapu és E5/E9 | V2-re nem terjesztjük át a kompatibilitást |
| 44 | E5/E9 tényleges MCP-before/after, argumentummódosítás és tiltás; E55/E56 valós BFS-hívások | Nincs külön nyitott callback-megvalósítás |
| 45 | E33/E53 eredeti JSONC-bájtok, idegen pluginlista/MCP/skill és tiltás megőrzése | Nincs külön nyitott megvalósítás |
| 46 | Minden hivatkozott új hostpróba natív Windows x64-en futott | A hiányzó portutakat nem tekintjük támogatottnak pusztán a Windows-futás miatt |
| 47 | Négy portleírás hivatalos forrásai és ténylegesen vizsgált verziói | Későbbi hostverziókra nincs automatikus garancia |
| 48 | A napló külön jelzi a forrásállítást, határtesztet, natív futást és hibát | A végállapotot K08-ban kell lezárni |
| 49 | Nyilvános setup CLI, hook/callback és JSON-RPC határok; valódi npm/host feladatutak | Új privát teszt-API nem készült |
| 50 | E19/E25/E29/E33/E46/E51/E53 valódi npm pack/npx, cache nélkül tartós csomag; E63/E64 frissített Cursor csomag és memória-skillút | Gemini csomagolt skill/model út; a teljes motoros elfogadás külön nyitott |
| 51 | E59: a megváltozott közös MCP/telepítő Codex/Claude ellenőrzése sikeres a közös kapuban | Az elfogadott 1.1.0 natív előfizetéses próbáját nem nyitjuk újra |
| 52 | Portonkénti 07-es elfogadás; egyetlen új port sincs hamisan támogatottnak minősítve | Végső, külön portelfogadások |
| 53 | A helyi fejlesztés nem indított npm-publikálást, tagelést vagy issue-lezárást | Új kiadás csak külön felhasználói döntéssel |
| 54 | E49/E53/E57/E60: három megosztható, rögzített mezőjű diagnosztikai formátum; 23 eredményíró bekötve, 3 canary próba és 8 tényleges korábbi rekord összegzése sikeres | Nincs további diagnosztikai fejlesztési hiány; csak a dokumentált összegzések oszthatók meg, a privát runtime-könyvtárak nem |

Az egyszeri közös bug/defekt/follow-up review eredménye fent olvasható. Újabb
teljes review helyett a konkrét nyitott követelmény és elfogadási hiányok következnek.
