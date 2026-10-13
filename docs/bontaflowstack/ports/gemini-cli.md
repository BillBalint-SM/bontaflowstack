# Gemini CLI port — Windows x64

Státusz: megvalósítás folyamatban; a teljes port még nincs elfogadva. Hivatalos dokumentáció ellenőrizve: 2026-10-13.
A natív hook–MCP és BFS-adapter részpróbák eredményei: [megvalósítási napló](../HOST-EXPANSION-IMPLEMENTATION.md).
Közös keretek, feladatok és A01–A10 elfogadási esetek: [hostbővítési terv](../HOST-EXPANSION-PLAN.md).
Mind a 75 mód aktuális besorolása: [képességprofil](../HOST-CAPABILITIES.md).

## Hivatalos források

- [G-E: extensionformátum és kezelés](https://geminicli.com/docs/extensions/reference/)
- [G-H: hookok szerződése](https://geminicli.com/docs/hooks/reference/)
- [G-S: skillek](https://geminicli.com/docs/cli/skills/)
- [G-M: MCP](https://geminicli.com/docs/tools/mcp-server/)
- [G-I: telepítés](https://geminicli.com/docs/get-started/installation/)
- [G-A: alagentek](https://geminicli.com/docs/core/subagents/)

## G01 — A kritikus mechanika rövid próbája

Forrás: G-E, G-H, G-M. Függőség: K01.

Az adott stabil CLI-ben helyi, minimális extension és ártalmatlan stdio MCP-eszköz segítségével
mérjük meg a `BeforeTool` eseményt, az argumentummódosítás továbbítását és a natív `session_id`/`cwd` értékeket.
Külön eset: új session, folytatás, cwd-váltás, hookhiba és félbeszakítás.

Kész: megőrzött, titkoktól tisztított eseményminta és konkrét döntés a hívásonkénti BFS-kontextuskötésről.
Ha a host nem ad elegendő azonosítást, a teljes adapter készítése előtt ez tisztázandó.

## G02 — Gemini-csomag és skillutasítások

Forrás: G-E, G-S. Függőség: G01, K02.

A Gemini saját `gemini-extension.json` manifestet, `skills/` könyvtárat és külön `hooks/hooks.json` fájlt használ.
A BFS build ezeknek megfelelő kimenetet állít elő; a hostutasítás szükség szerint `GEMINI.md`-be kerül.
A `${extensionPath}` útvonalkezelést kell alkalmazni. A TOML slash command külön Gemini-mechanika;
csak akkor kell külön parancs, ha a natív skillhívás nem fedi le a szükséges belépőt.

Tervezett hely: `adapters/gemini-cli/`, külön Gemini-build és a közös npm-build bekötése.
Kész: a 34 skill frontmattere és hivatkozása érvényes; tényleges felfedezés és aktiválás ellenőrzött;
a host skill-hozzáférési jóváhagyása megmarad. Nincs Claude-/Codex-eszköznévre támaszkodó utasítás.

## G03 — MCP és natív kontextus

Forrás: G-M, G-H. Függőség: G01, K03.

Külön Gemini-adapter indítja a közös BFS-műveleteket; a dokumentált MCP-eszköznév
`mcp_<server>_<tool>` alakját a kiválasztott verzióval is ellenőrizni kell.
A szerver környezetét az extension szabályai szerint kell átadni; az örökölt környezeti változók szűrését nem szabad teljes öröklésnek venni.

Kész: két párhuzamos főmunkamenet nem osztozik véletlenül tulajdonazonosságon;
hiányzó, ismételt vagy módosított híváskötés elutasított; szóközös Windows-útvonal működik.
A konfiguráció nem tartalmaz titkot; az állapot a meglévő közös BFS-adattárba kerül.

## G04 — Gemini-események és helyreállítás

Forrás: G-H. Függőség: G03, K06.

A `BeforeTool`/`AfterTool`, `BeforeAgent`/`AfterAgent`, `SessionStart` és `SessionEnd`
eseményekhez csak a dokumentált jelentésük szerinti műveletet rendeljük.
A hook JSON-t olvas stdinről és ad stdouton; a napló stderrre kerül.
A CLI a `SessionEnd` befejezését nem várja meg, ezért az utolsó mentés nem függhet kizárólag ettől.

Kész: szabályos lezárás, megszakítás, elveszett lezáró hook és újraindítás után a mentett munka helyesen helyreáll;
tiltott művelet nem válik elvégzett lépéssé; hiba/timeout esetére konkrét, mért eredmény szerepel.

## G05 — Motorok, emberi átadás és külön képességek

Forrás: G-M, G-S, G-A. Függőség: G03–G04, K02.

A közös browser/render/Impeccable motorokat Gemini-eszköznevekkel kell elérhetővé tenni.
A látható böngészős emberi lépés után ugyanazon BFS-session folytatódjon.
Az alagentek dokumentációja önmagában nem igazolja, hogy minden hook megadja a gyermekazonosságot;
a párhuzamos mód külön bizonyítást kap, addig a profil nem kínálja.

Kész: A06–A07 tényleges végrehajtása; skillmódonkénti külön képességlista, natív képeszköz meglétének ellenőrzése;
helyettesítő raszteres szolgáltatás nincs automatikusan hozzáadva.

## G06 — npm setup, frissítés és visszaolvasás

Forrás: G-E, G-I. Függőség: G02–G05, K05.

A setup felismeri a `gemini` hostot és a kipróbált verziót, tartós helyre teszi a csomagot,
majd a dokumentált helyi extensiontelepítést használja. Az extension telepítéskor másolódik;
a frissítési forrásnak a BFS pontos verzióját kell követnie.
Az aktiválódást új hostmunkamenetben kell ellenőrizni, nem pusztán a célkönyvtár létezéséből.

Kész: tiszta/ismételt/frissített telepítés, meglévő azonos nevű extension kezelése és adatmegőrzés;
a host az új extensionverziót, skilleket és MCP-eszközöket mutatja. A host által kért hozzájárulás nem kerül megkerülésre.

## G07 — Port elfogadása

Forrás: G-E–G-A; közös A01–A10. Függőség: G06, K07.

Ellenőrizzük a Gemini-sémákat és hookmintákat, majd a tényleges telepített npm-csomaggal
végigfuttatjuk a kötelező feladatútvonalakat. Rögzítjük a CLI-/Windows-/BFS-verziót és az eredményt.
Kész: a kötelező alap igazolt; az alagent-/képképesség önálló bizonyítéka vagy egyértelmű hiánya megjelenik a profilban.
