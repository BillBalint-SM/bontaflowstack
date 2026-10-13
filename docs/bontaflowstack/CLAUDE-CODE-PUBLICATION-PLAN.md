# BontaFlowStack – egységes npm-terjesztési terv

Frissítve: 2026-10-13. A fájl neve a Claude-portból indult tervet őrzi;
az elfogadott terjesztési döntés már a teljes csomagra vonatkozik.

A felhasználó a **bontaflowstack** nevet választotta. A legutóbbi pontosítása:
„Nem csak a Claude Code esetében kell, ez az új teljesen standard, egyetlen
»telepítési« útja a repoban található csomagomnak. npm hívás és automatikus
setup/config/telepítés kezdődik... nem kell zip vagy bármi más formátum.”

## Elfogadott működés

```powershell
npx bontaflowstack@1.1.0-rc.2 setup
```

A verzió publikált kiadásjelölt; a registry-parancs mindkét host CLI-jével sikeres próbán ment át.
A `setup` elhagyása ugyanazt a folyamatot indítja. A telepítő felismeri a
telepített Codexet és Claude Code-ot, és mindegyik elérhető hosthoz regisztrálja
a megfelelő adaptert. A `--host codex|claude|all` az explicit választás.

A GitHub a forrás és a kiadási dokumentáció helye. Nincs külön felhasználói ZIP,
kézi skillmásolás vagy második, chatből indítandó motortelepítés. Az npm belső
tarballja és a csomagba ágyazott, ellenőrzőösszeggel rögzített motorarchívum
megvalósítási részlet; a felhasználó az npm-parancsot futtatja.

## Feladatok és elfogadási feltételek

1. **Közös csomagoló és telepítő.** Egy npm-csomag tartalmazza mindkét host
   34 skilljét, közös magját és natív adapterét. A tartós, verziózott fájlok az
   npm cache-en kívül maradnak. A telepítő előkészíti a rögzített motort,
   konfigurálja a hostokat, és visszaolvassa a regisztrált verziót/engedélyezést.
   Az első hook-bizalom a host emberi jóváhagyási pontja marad.

2. **Állapot és frissítés.** A két adapter ugyanazt a rögzített BFS-adattárat
   használja, eltérő Windows `LOCALAPPDATA` esetén is. A régi adattárakat nem
   egyesíti vagy törli. Az egyértelmű meglévő tárat felismeri; több meglévő tár
   esetén explicit választást kér. Az ismétlés, frissítés, hiba utáni újrafutás,
   előző fájlok és más pluginek megőrzése tesztelendő.

3. **Valódi telepítési ellenőrzés.** A becsomagolt belépő valódi npx-szel fusson
   üres, elkülönített Codex/Claude-konfigurációval és motortárral. Ellenőrizendő
   a két CLI, ismétlés, verzióváltás, cache nélkül megmaradó működés és a közös
   adattár. A szintetikus verzióváltást külön jelölni kell: nem második kiadás.

4. **npm-kiadás.** A `scripts/npm-release.mjs` készítse el és ellenőrizze a
   pontos tarballt, majd ugyanazokat a bájtokat publikálja explicit `rc` címkével.
   A registryből visszaellenőrzendő a név, verzió, integritás és címke; az éles
   registryből letöltött parancs külön telepítési próbát igényel. A GitHub Actions
   ugyanazt az útvonalat használja, a kiadói hitelesítés külön beállításával.

5. **Natív host-elfogadás és stabil kiadás.** A CLI regisztrációja, helyi
   hookesemények és valódi Chromium futtatása nem igazolja a bejelentkezett
   modellmunkamenet teljes skill-, hook-, MCP-, főagent/subagent-, megszakítási
   és folytatási működését. A stabil kiadáshoz a pontos npm-tartalomhoz kötött,
   mindkét hostra kiterjedő natív bizonyíték kell. Addig RC-ként kezelendő.

## Határok és állapot

Windows x64, Node.js 24+, npm, Git és legalább egy támogatott host szükséges.
A telepítő nem telepít hostalkalmazást és nem jelentkezteti be a felhasználót.
A Claude-port raszteres képgenerálásának/képszerkesztésének kihagyását a
felhasználó elfogadta. Képértelmezés, írt HTML/SVG és helyi renderelés megmarad.

A korábbi Claude-only `1.0.0-alpha.1` jelölt és ZIP eredményei történeti
ellenőrzések; nem bizonyítják a mostani két-hostos npm-csomagot. A futtatási
eredményeket és hiányokat a [validációs jelentés](CLAUDE-CODE-VALIDATION.md)
rögzíti. A kiadás lépései a [release-folyamatban](RELEASE-PROCESS.md) találhatók.

Nyilvános cél: [BillBalint-SM/bontaflowstack](https://github.com/BillBalint-SM/bontaflowstack).
A munkapéldány `origin` remote-ja a `bontaflowstack-workbook` repóra mutat;
publikáláskor a célrepo külön ellenőrizendő. Az `1.1.0-rc.1` npm-publikáció,
a registry-integritás és a registryből végzett telepítés igazolt; a forrás és
a `v1.1.0-rc.1` tag a nyilvános repo része. A tag forrása `cd2e21ef8f947e0196e600f679e5cb54c1ee4dc6`.
Az npm a kért `rc` mellett `latest` címkét is adott, törlésére E400-at adott;
ez nem stabil minősítés. Nyitott: a pontos npm-csomaggal végzett teljes natív
hostelfogadás és az npm Trusted Publisher beállítása/valódi OIDC-kiadási próba.
Lásd a [kiadási jelentést](RELEASE-1.1.0-rc.1.md).

Az rc.2 közzétételét a felhasználó külön jóváhagyta; az npm `rc` címke már
a `1.1.0-rc.2` verzióra mutat. Ez automatikusan telepíti és konfigurálja az
Impeccable CLI-t mindkét hosthoz. Forrása `32e71122fce18b847a675efbd4efc6370fbb166b`,
tagje `v1.1.0-rc.2`. A `latest` az rc.1-en maradt. Lásd az
[rc.2 kiadási jelentést](RELEASE-1.1.0-rc.2.md); a natív és OIDC nyitott pontok megmaradnak.

Források: [npm npx](https://docs.npmjs.com/cli/v11/commands/npx/),
[npm bin](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#bin),
[Claude marketplace](https://code.claude.com/docs/en/plugin-marketplaces),
[Codex plugins](https://developers.openai.com/plugins/build/plugins).
