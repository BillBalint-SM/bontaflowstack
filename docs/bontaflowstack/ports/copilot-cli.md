# GitHub Copilot CLI port — Windows x64

Státusz: megvalósítás folyamatban; a csomag natív skillfelfedezése és BFS status hívása igazolt,
a teljes port még nincs elfogadva. Hivatalos dokumentáció ellenőrizve: 2026-10-13.
Részletes bizonyíték: [megvalósítási napló](../HOST-EXPANSION-IMPLEMENTATION.md).
A telepített npm-jelöltben a memória/pause/új-session/adopt és másik projekt
elkülönítési útja, továbbá a natív browser/render/Impeccable és PNG-átadás sikeres.
A natív tervezés/megvalósítás/ellenőrzés próba is sikeres (E48), valamint az
azonos session folyamatleállítás utáni folytatása (E50). Két egyidejű session
böngészőjének külön lapállapota, session-cookie-ja és saját leállítása is igazolt
(E54). Az emberi böngészős átadás és a teljes A01–A10 elfogadás még nyitott.
Közös keretek és A01–A10: [hostbővítési terv](../HOST-EXPANSION-PLAN.md).
Mind a 75 mód aktuális besorolása: [képességprofil](../HOST-CAPABILITIES.md).
A VS Code Copilot és a felhős coding agent nem része ennek a portnak.

## Hivatalos források

- [P-P: pluginformátum és CLI-kezelés](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
- [P-C: plugin készítése](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)
- [P-H: hookok](https://docs.github.com/en/copilot/reference/hooks-reference)
- [P-S: skillek](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)
- [P-M: MCP-szerverek](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- [P-A: CLI-agentek](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli)
- [P-I: CLI telepítése](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)

## P01 — Hook és kontextus rövid próbája

Forrás: P-H, P-P. Függőség: K01.

Ártalmatlan MCP-eszközzel mérjük meg a natív sessionadatokat és a `preToolUse` által adott
`modifiedArgs` érvényesülését. Külön eset a tiltás, hibás kilépés és időtúllépés.
A hivatalos hookleírás szerint a parancshook hibája tilt, időtúllépése viszont az alap engedélyezési folyamatnak adja át a hívást.

Kész: eseményminta és döntés arról, hol ellenőrzi maga a BFS az állapotmódosító MCP-művelet híváskötését.
A natív shell teljes körű timeout alatti blokkolása nem állítható pusztán a hook meglétéből.

A `toolArgs` nem mindig JSON-objektum: a hivatalos hookreferencia `unknown`
típust ad meg. A CLI 1.0.96 tényleges `apply_patch` hívása nyers patchszöveget
adott át. A hook ezt kizárólag a guard útvonal-ellenőrzéséhez burkolja;
nem írja át a natív patch argumentumát, és nem ad helyette eszközengedélyt.
A JSON-objektumos változat továbbra is támogatott. A megadott könyvtáron kívüli
írás/átmozgatás tiltását határteszt ellenőrzi; lásd E47 a megvalósítási naplóban.

## P02 — Copilot-plugin és skillek

Forrás: P-P, P-C, P-S. Függőség: P01, K02.

A kiválasztott stabil CLI által támogatott Agent Plugins sémát kell rögzíteni.
A hordozható rész gyökérbeli `plugin.json`, `mcp.json` és `skills/<név>/SKILL.md`;
a Copilot-specifikus hook a `com.github.copilot/hooks/hooks.json` helyre kerül.
Az agent/parancs/rule komponensekből csak a BFS-működéshez szükséges készül.

Tervezett hely: `adapters/copilot-cli/`, Copilot-build és közös npm-build.
Kész: manifestellenőrzés, mind a 34 skill betöltése, helyes `name`/`description`, eszköznevek és fájlhivatkozások.
A Claude-formátum elfogadása önmagában nem szolgál kompatibilitási bizonyítékként.

## P03 — MCP és hívásazonosság

Forrás: P-P, P-M, P-H. Függőség: P01, K03.

A stdio MCP indítása a dokumentált pluginútvonalakból történik; `PLUGIN_ROOT` és `PLUGIN_DATA`
kezelését és a tartós közös BFS-állapot helyét külön kell rögzíteni.
A Copilot hook valódi session-/tool-adatait a hívás argumentumaihoz kötjük; egy JSON-burokformátumot választunk és tesztelünk.

A hook/MCP folyamatpróbák igazolják a hamis, lejárt és idegen munkamenethez kötött
kérések elutasítását. Natív npm-próba igazolja a két session/Git-worktree közös
memóriáját, külön tulajdonát és a shell-cwd utáni projektmegtartást (E52).
A teljes A04, különösen a hostok közötti izoláció még nincs elfogadva.
A PascalCase aliasok eltérő eszközneveit nem mossuk össze.

## P04 — Lezárás, folytatás, guardhatárok

Forrás: P-H. Függőség: P03, K06.

A `postToolUse`, `postToolUseFailure`, `agentStop`, session-események és megszakítás külön adapterágat kapnak.
Az `agentStop` folytatást kérő működését és ciklushatárát nem tekintjük korlátlan BFS-munkafolyamat-futtatónak.
A hibás hook és a timeout eltérő következménye szerepel a profilban és a próbákban.

Kész: sikertelen/tiltott eszköz nem eredményez sikeres BFS-lépést; megszakítás utáni folytatás nem vesz át idegen munkát;
az újrainduló host a tartós bizonyítékból állítja helyre a munka státuszát.

## P05 — Motorok és alagentképesség

Forrás: P-M, P-A, P-H. Függőség: P03–P04, K02.

Bekötjük a browser/render/Impeccable műveleteket és a felhasználói böngészős átadást.
A párhuzamos módhoz megvizsgáljuk az egyedi agentek kontextusát és instrukcióöröklését.
A dokumentáció szerint a beépített `general-purpose` agenthez nem jár minden alagent-életciklus-esemény;
ezért a natív delegálás meglétéből nem következik igazolt BFS-feladattulajdon.

Kész: a kötelező motoros út végigfut; párhuzamos támogatás csak a konkrét kipróbált agenttípusra kerül a profilba.
A többi mód elérhetősége név szerint szerepel.

## P06 — npm setup és verzióellenőrzés

Forrás: P-P, P-I. Függőség: P02–P05, K05.

A setup a Copilot CLI saját helyi plugintelepítését és listázását használja; a JSON-lista alakját
a kiválasztott verzióhoz kötjük. Regisztráció előtt a tartós csomagkönyvtár készül el.
Az 1.0.96 közvetlen útvonalas telepítése elavultsági figyelmeztetést ad, ezért a megvalósítandó
regisztráció helyi marketplace-en keresztül, `plugin@marketplace` formában történik.
Meglévő kikapcsolás, szervezeti szabály és azonos nevű idegen plugin nem írható felül hallgatólagosan.

Kész: új telepítés és frissítés után a host pontos pluginverziót mutat; a skillek/MCP ténylegesen betöltődnek;
ismételt setup és hiba utáni helyreállítás megőrzi az idegen beállításokat.
A PowerShell-előfeltételt a BFS saját Node 24+ követelményétől külön ellenőrizzük.

## P07 — Port elfogadása

Forrás: P-P–P-I; közös A01–A10. Függőség: P06, K07.

Az adaptertesztek mellett a telepített csomaggal futnak a natív Windows-próbák,
beleértve a lassú hookot, párhuzamos fősessionöket, megszakítást és browser-átadást.
Kész: a kötelező alap igazolt, a guard timeout-határa és az alagenttípusok támogatása pontosan dokumentált.
