# Cursor IDE port — Windows x64

Státusz: implementált fejlesztési jelölt; csomag/setup, natív státuszhívás és az
importált BFS melletti együttélés ellenőrizve (E61); teljes skillfeladatút még nyitott.
Hivatalos dokumentáció ellenőrizve: 2026-10-13.
Közös keretek és A01–A10: [hostbővítési terv](../HOST-EXPANSION-PLAN.md).
Mind a 75 mód aktuális besorolása: [képességprofil](../HOST-CAPABILITIES.md).
A Cursor CLI és Cloud Agents nem része ennek a portnak.

## Hivatalos források

- [C-P: pluginbetöltés és helyi telepítés](https://prod.cursor.com/docs/plugins)
- [C-R: natív pluginformátum](https://prod.cursor.com/docs/reference/plugins)
- [C-H: hookok](https://prod.cursor.com/docs/hooks)
- [C-M: MCP](https://prod.cursor.com/docs/mcp)
- [C-S: skillek](https://prod.cursor.com/docs/skills)
- [C-A: alagentek](https://prod.cursor.com/docs/subagents)

## C01 — Helyi telepítés és aktív betöltés próbája

Forrás: C-P, C-R. Függőség: K01.

A hivatalos helyi út: valódi pluginfájlok a `~/.cursor/plugins/local/<név>` könyvtárban,
majd ablak-újratöltés. Külső könyvtárra mutató symlinket Cursor kihagy; szervezeti szabály tilthatja a helyi importot.
Először egy minimális, npm által automatikusan elhelyezett csomag betöltését és a komponensek ellenőrizhetőségét kell bizonyítani.

Kész: a felhasználó csak újratölt, nem másol/szerkeszt; a megfelelő skill/MCP/hook betöltése megfigyelt.
Tiltott import és meglévő marketplace-változat esetén pontos hiba/ütközésjelzés születik.
A dokumentált út helyi fejlesztési betöltés: ennek terjesztésre való alkalmassága vizsgálati pont, nem kész garancia.
Ha nem ad megbízható beazonosítást, a Cursor-port státusza nyitott marad; nincs kitalált plugin-CLI.

A setup kimenete és HOST-ja név szerint jelzi a `bontaflowstack-cursor` plugint,
a `bfs-cursor` MCP-t, a helyi import policyját és az azonos nevű marketplace-
plugin elsőbbségét. Ez a [hivatalos helyi betöltési leírás](https://cursor.com/docs/plugins#test-plugins-locally)
szerinti hibakeresési útmutató, nem a felhasználó tényleges adminpolicyjának
automatikus kiolvasása. A dokumentum újratöltést és Customize-ellenőrzést ír le.
A pontos tiltó feltétel hostoldali igazolása a 41/42. történet nyitott része;
ismeretlen állapotot nem nevezünk sem engedélyezettnek, sem tiltottként igazoltnak.

## C02 — Natív Cursor-csomag és instrukciók

Forrás: C-R, C-S. Függőség: C01, K02.

A hookokat tartalmazó BFS-hez `.cursor-plugin/plugin.json` szerinti natív csomag készül.
Az Agent Plugins közös formátuma önmagában a skill/MCP részt fedi le.
A Cursor által elfogadott frontmattert, mappanevet, hostutasításokat és hookfájlt külön ellenőrizzük.

Tervezett hely: `adapters/cursor-ide/`, Cursor-build és közös npm-build.
Kész: 34 skill és módlefedettség; felhasználói/projekt-szintű ütközések és precedencia kipróbálva;
a kiadott komponensek között nincs felesleges IDE-rule vagy másik host parancsa.

A fejlesztési jelölt natív azonosítója `bontaflowstack-cursor`, MCP-szerverneve
`bfs-cursor`; az npm-csomag neve továbbra is `bontaflowstack`, az eszközök
`bfs_core`, `bfs_status` stb. neve változatlan. Az elkülönítés az azonos nevű
importált csomaggal megfigyelt ütközés javítási jelöltje. A hivatalos C-P leírja
az azonos nevű telepített plugin elsőbbségét, C-R pedig a manifest `name`
mezőjét azonosítóként határozza meg. Ez forrásalap, nem natív együttélési bizonyíték.
Az npm megtartja a már kezelt `plugins/local/bontaflowstack` könyvtárat, és csak
a változatlan, saját verziópéldányból frissít; a korábbi azonosítót így át tudja
venni. A másik `bfs` MCP-beállítást megőrzi, `bfs-cursor` ütközéskor megáll.
A globális importkapcsoló és a hostengedélyek módosítása nem része a setupnak.

## C03 — MCP és hívásonkénti workspace

Forrás: C-R, C-M, C-H. Függőség: C01, K03.

A csomaghoz tartozó MCP-útvonalaknál `${CURSOR_PLUGIN_ROOT}` használható;
a szabványos `${PLUGIN_ROOT}`/`${PLUGIN_DATA}` kifejtését Cursor nem támogatja azonos módon.
A `preToolUse` valódi session-/workspace-adatait és `updated_input` eredményét kell a BFS-művelethez kötni.

Kész: a betöltött MCP a tartós runtime-ot indítja, szóközös Windows-útvonallal is;
két IDE-ablak/két chat nem cserél tulajdont; módosított vagy hiányzó kötés nem okoz BFS-állapotírást.
A plugin elhelyezése és a közös BFS-adattár külön felelősség marad.

## C04 — Cursor-események és guard

Forrás: C-H. Függőség: C03, K06.

A `preToolUse`, `postToolUse`, `postToolUseFailure`, `stop`, session- és alagent-eseményeket
egyenként rendeljük a BFS-műveletekhez. A sessionindító/-lezáró hook nem szinkron mentési kapu;
a `preCompact` megfigyelésre szolgál. A post-hook eredményátírása MCP-re korlátozott.

Kész: hookhiba, invalid JSON, timeout, félbeszakítás és ablakbezárás mért viselkedést kap;
a kiválasztott `failClosed`/tiltási beállítás megfelel az esemény dokumentált szerződésének.
Az `ask` mező jelenléte nem számít igazolt felhasználói jóváhagyásnak; csak a ténylegesen működő engedélyezési út használható.

## C05 — Motorok és natív extra képességek

Forrás: C-M, C-A, C-H. Függőség: C03–C04, K02.

A browser/render/Impeccable eszközöket az IDE chatből kell végigpróbálni,
látható emberi böngészős átadással és ugyanazon munkamenet folytatásával.
Az alagentekhez külön azonosítási próba kell; IDE/CLI/felhő együttes említése a dokumentációban nem jelent közös BFS-bizonyítékot.

Kész: a kötelező motoros út igazolt, külön profil jelzi a párhuzamos módot,
a natív képkezelést és a felhasználói kérdésfelületet.

## C06 — npm által kezelt helyi plugin

Forrás: C-P, C-R. Függőség: C01–C05, K05.

A setup a bizonyított C01 út szerint helyezi el/ellenőrzi a BFS saját fájljait.
Frissítéshez leltár és megszakításból helyreállítható csere kell; idegen konfiguráció érintetlen marad.
Aktív IDE-ablak esetén a setup külön jelzi az újratöltési igényt, és nem állítja, hogy a futó session már az új kódot használja.

Kész: tiszta telepítés, ismétlés, frissítés, importtilalom, ütköző marketplace-csomag és megszakadt másolás kipróbálva.
Az aktív betöltés ellenőrzése a támogatott felületen történik; a fájlmásolat ellenőrzése önmagában csak az elhelyezést igazolja.
Szervezeti szabály és projektbizalom változatlan marad. Nincs a futó alkalmazást erővel bezáró telepítés.

## C07 — IDE-elfogadás

Forrás: C-P–C-A; közös A01–A10. Függőség: C06, K07.

A natív próbák valódi Cursor IDE-ablakban és betöltött npm-csomaggal történnek.
Kiemelt eset az újratöltés előtti/utáni verzió, több chat/ablak, manuálisan tiltott plugin és elveszett sessionEnd.
Kész: a kötelező alap igazolt, a helyi betöltési feltételek és a kézzel végzendő újratöltés egyértelműen szerepelnek.
