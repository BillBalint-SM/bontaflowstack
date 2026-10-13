# OpenCode CLI port — Windows x64

Státusz: megvalósítás folyamatban; a teljes port még nincs elfogadva. Hivatalos dokumentáció ellenőrizve: 2026-10-13.
A natív V1 callback–MCP és BFS-adapter részpróbák eredményei: [megvalósítási napló](../HOST-EXPANSION-IMPLEMENTATION.md).
A generált csomag mind a 34 skilljének felfedezése és a natív modell státuszhívása
igazolt. Az npm setup/ismétlés/frissítés és JSONC-megőrzés valódi CLI-próbája sikeres.
A telepített csomag natív health-skill és memória/pause/új session/drift/adopt/
projektelkülönítési útja is sikeres (E36, E55); a teljes mód- és motorlefedés
még nincs igazolva. A szabad modell kontextuspróbájához a tesztfolyamatban
`bash:ask` kellett a teljes tiltás helyett; shellhívás nem futott.
Az upstream [#51241](https://github.com/anomalyco/opencode/issues/51241)
bejelentése ilyen deny/free-model hibát ír le. A telepítő nem oldhatja ezt meg
a felhasználó engedélyeinek átírásával.
A natív böngészőinterakció, két renderelt PNG modellnek átadása és saját
böngészőleállítás E56-ban igazolt. Ugyanez a próba az Impeccable-hívás hibás
argumentumán megállt; az egyhívásos ismétlés időkorlátba futott az első tool előtt.
A teljes engine-próba nem sikeres. A további ellenőrzés a specifikáció
közös bizonyítékot felhasználó, platformeltérésekre korlátozott elvét követi.
Közös keretek és A01–A10: [hostbővítési terv](../HOST-EXPANSION-PLAN.md).
Mind a 75 mód aktuális besorolása: [képességprofil](../HOST-CAPABILITIES.md).
A Desktop és a WSL alatti Linux-futtatás nem helyettesíti a natív Windows CLI-próbát.

## Hivatalos források

- [O-P: plugin-API](https://docs.opencode.ai/docs/plugins/)
- [O-V: külön V2 plugin-API](https://dev.opencode.ai/v2/docs/build/plugins/)
- [O-M: MCP](https://docs.opencode.ai/docs/mcp-servers/)
- [O-S: skillek](https://docs.opencode.ai/docs/skills/)
- [O-C: konfiguráció](https://docs.opencode.ai/docs/config/)
- [O-A: agentek](https://docs.opencode.ai/docs/agents/)
- [O-T: saját eszközök és kontextus](https://docs.opencode.ai/docs/custom-tools/)
- [O-W: Windows](https://docs.opencode.ai/docs/windows-wsl/)

## O01 — API-generáció és MCP-callback próba

Forrás: O-P, O-V, O-M, O-W. Függőség: K01.

A választott stabil Windows CLI-verzióhoz egyetlen hivatalos plugin-API-t kell rögzíteni.
A jelenlegi és V2 dokumentáció külön szerződést ír le; a kettő callbackjei nem keverhetők.
Egy ártalmatlan MCP-eszközzel mérjük meg, hogy a választott tool-before/after callback
lefedi-e az MCP-hívást, továbbítja-e az argumentummódosítást, és mi történik hiba/tiltás esetén.

Kész: valós Windows-futásból származó eseményminta, sessionazonosság és API-döntés.
A plugin natív callbackjeinek léte önmagában nem bizonyítja az MCP-kérések megfelelő lefedését.

## O02 — OpenCode-plugin és skillek

Forrás: O-P, O-S, O-C. Függőség: O01, K02.

A port a kiválasztott API-hoz illeszkedő JS/TS plugint és OpenCode-skillcsomagot ad.
A hivatalos felfedezési helyek és config-precedencia szerint kell az egyszeri betöltést megoldani;
a meglévő `.agents`/Claude-skillekkel azonos nevek ne eredményezzenek rejtett duplikációt.
Az automatikus dependency-telepítés és npm-cache viselkedése nem helyettesíti a BFS verziózott tartós runtime-ját.

Megvalósított hely: `adapters/opencode-cli/`, OpenCode-build és közös npm-build.
A globális natív pluginbetöltő a tartós csomag `plugin.mjs` exportjára mutat.
A V1 `config` callback az MCP-kapcsolatot és a skillútvonalat a futó konfigurációhoz
adja; a felhasználó JSON/JSONC-fájljait nem szerkeszti. Meglévő vagy letiltott `bfs`
esetén megőrzi a konfigurációt, és nem ad ki BFS-híváskötést. A setup a pluginok
nélküli natív skilllistát is ellenőrzi, hogy a csomag ne fedjen el projektskillt.
Kész: 34 skill elérhető, frontmatter és referenciák érvényesek, a megfelelő plugin-export betöltődik;
új függőség csak a kiválasztott API tényleges követelménye esetén kerül be.

## O03 — Natív callback és BFS-MCP összekötése

Forrás: O-P, O-M, O-T. Függőség: O01, K03.

A callback által átadott project/directory/worktree/session-adatból képződik a hívási kontextus.
A helyi MCP `command`/`environment` beállításai és a host által képzett eszköznév
az adott API szerint kerülnek átadásra. Globális, éppen aktívnak gondolt sessionazonosító nem használható.

Kész: tényleges MCP-híváson érvényesül a kontextuskötés; hiányzó/módosított/ismételt kötés elutasított;
eltérő configszintek és két projekt nem keverik a BFS-állapotot.
Ha az MCP-before callback nem megfelelő, a port csak külön megtervezett és igazolt natív eszközúttal léphet tovább.

## O04 — Sessionállapot és engedélyezés

Forrás: O-P, O-C, O-A. Függőség: O03, K06.

A session idle, error és deleted események eltérő jelentését megőrizzük;
egy idle esemény nem bizonyítja az egész munkafolyamat vagy alagentfa lezárását.
Az ask/allow/deny beállítások hostoldali érvényét a BFS-adapter nem írja felül.

Kész: megszakítás és host-újraindítás után a tartós munka helyreáll;
permission denial és eszközhiba nem ment sikeres lépést; callback-sorrend és hibaút mérve van.

## O05 — Motorok és párhuzamos képesség

Forrás: O-M, O-A, O-T, O-P. Függőség: O03–O04, K02.

A browser/render/Impeccable műveletek és az emberi böngészős átadás OpenCode CLI-ből futnak.
Külön próba tisztázza az elsődleges és gyermek-session kapcsolatát, az agentazonosságot,
illetve hogy a gyermek lezárása melyik BFS-munka tulajdonjogát érinti.

Kész: A06–A07 igazolt; alagentmód csak megbízható azonosítás után elérhető.
Az OpenCode-ban választható modell nem számít új hostportnak, és nem igazol más alkalmazás támogatását.

## O06 — npm setup és konfigurációmegőrzés

Forrás: O-P, O-C, O-W. Függőség: O02–O05, K05.

A setup a kiválasztott stabil verzió által dokumentált helyi plugin-/MCP-regisztrációt használja.
Más API-generáció plugin add/list parancsait nem szabad automatikusan átvenni.
Meg kell őrizni a meglévő pluginlistát, MCP-kapcsolatokat, configszinteket és JSONC-tartalmat;
ha támogatott natív parancs nincs, a legszűkebb dokumentált konfigurációs helyre írunk.

Kész: telepítés/ismétlés/frissítés után a megfelelő verzió ténylegesen betölt;
szóközös elérési út és natív Windows-futtatás bizonyított, a régi konfiguráció és BFS-adat megmarad.
A WSL-ajánlás nem változtatja meg a vállalt Windows x64 működési közeget.

## O07 — CLI-elfogadás

Forrás: O-P–O-W; közös A01–A10. Függőség: O06, K07.

A kiválasztott stabil plugin-API adaptertesztjei mellett tényleges npm-csomaggal fut a natív CLI-próba.
Kiemelt eset az MCP-before/after, permission denial, session idle/error különbség és configprecedencia.
Kész: a kötelező alap igazolt, a támogatott API/verzió pontos, a párhuzamos és natív képképesség státusza külön szerepel.
