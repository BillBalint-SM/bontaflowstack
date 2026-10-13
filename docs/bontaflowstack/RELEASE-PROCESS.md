# npm terjesztés és kiadási kapu

## Egy npm-csomag hat platformhoz

Az egyetlen felhasználói telepítési út az `npx bontaflowstack@<verzió> setup`.
A forrásból készülő csomag automatikusan felismeri és beállítja a hat platformot,
a közös motort és az Impeccable CLI-t. Új felhasználói ZIP nem készül.
A csomag belső, ellenőrzőösszeggel rögzített motorarchívuma nem külön telepítő.

Az aktuális stabil kiadás az `1.2.0`; a kiadás részleteit
a [kiadási jelentés](RELEASE-1.2.0.md) rögzíti.
Stabil verzió csak `latest`, előzetes verzió csak `rc` npm dist-taggel
publikálható. A forráscsomag verziója az `installers/npm/package.json` fájlban
van; a builder ezt vezeti át mind a hat csomagolt host manifestjébe és katalógusába.
A forrás Codex, Claude Code, Gemini CLI, GitHub Copilot CLI, Cursor IDE és
OpenCode CLI adaptert készít. Az `1.1.0` kiadási rekordjai a publikált, kétplatformos
csomag történetét őrzik. Az `1.2.0` mind a hat adaptert csomagolja.

### Előkészítés

Windows x64-en, Node.js 24+-szal és npm 11.21.0+-szal futtasd a projektellenőrzést.
Commitold a kiadás forrását, hozd létre a pontos verziótaget, majd készíts új,
még nem létező kiadási könyvtárat:

```powershell
node scripts/check.mjs
node --test tests/npm-release.test.mjs
node scripts/npm-release.mjs prepare --output artifacts/npm/1.2.0 --tag latest --release-tag v1.2.0
```

A `prepare` elkészíti az adaptereket, valódi `npm pack`-ot futtat, megőrzi
a pontos `.tgz` bájtjait, és `release.json` fájlban rögzíti a nevet, verziót,
dist-taget, forrástagot, commitot, SHA256-ot, npm SHA512-integritást és fájllistát.
Létező könyvtárat nem ír felül. Ellenőrizd az exact csomagot és a megváltozott
telepítési vagy frissítési utat a publikálás előtt.

### Publikálás és visszaellenőrzés

A tulajdonosi npm-fiókkal interaktívan:

```powershell
node scripts/npm-release.mjs publish --artifact artifacts/npm/1.2.0 --tag latest
```

A parancs csak az előkészített `.tgz`-t publikálja. Ellenőrzi a tiszta checkoutot,
a forráscommit és a tag egyezését, a csomagazonosságot és az integritást. Az npm
böngészős hitelesítést kérhet. A verifier összeveti a registry nevét, verzióját
és SHA512-integritását a helyi csomagéval, majd ellenőrzi a kiválasztott dist-taget.

Feldolgozási késésnél ne publikáld újra ugyanazt a verziót. Őrizd meg a
kiadási könyvtárat, és futtasd újra a lekérdezést:

```powershell
node scripts/npm-release.mjs verify --artifact artifacts/npm/1.2.0 --tag latest
```

Az npm-verzió nem írható felül. A verifier kezeli az npm objektum- és egyetlen
értéket tartalmazó tömbválaszát is. Ha a registry egy előzetes verzióhoz is
`latest` címkét rendel, külön figyelmeztet; a stabil kiadás `latest` címkéje
az elvárt állapot. Lásd az npm [publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
és [dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/) dokumentációját.

A GitHub Actions `.github/workflows/npm-publish.yml` kézi workflow-ja a kiválasztott
pontos `v<verzió>` forrástagból dolgozik, és a verzió alapján választ `rc` vagy
`latest` címkét. Ugyanazt az ellenőrző és publikáló eszközt hívja. OIDC használatához
az npm csomagbeállításainál Trusted Publishert kell konfigurálni a
`BillBalint-SM/bontaflowstack` repóhoz és ehhez a workflow-hoz.
Az OIDC-ből végzett kiadás nincs gyakorlatban ellenőrizve; a jelenlegi kiadás
az interaktív npm-fiókos utat használja. [Trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Korábbi ZIP-alapú Codex kiadási kapu (történeti)

Az alábbi `scripts/release.mjs` folyamat a korábbi Codex ZIP-disztribúcióhoz,
Desktop-bizonyítékhoz és a már publikált 1.0.0-hoz tartozik. Megmarad a
történeti bizonyítékok, a kapuimplementáció és a tesztjei reprodukálására;
nem az új felhasználói terjesztési vagy npm-stabil kiadási út.

Korábban a kiadás egyetlen belépője a `node scripts/release.mjs` volt a forrásrepo gyökerében.
A `scripts/build-package.ps1 -Release` ugyanezt a kaput hívja. Nincs `force`,
`skip` vagy automatikus profilváltás. A folyamat Windows x64, Node.js 24 és
Windows PowerShell 5.1 mellett készült; külső npm-csomagot nem igényel.

**Érvényes kiadás:** az adott ZIP-re és a deklarált környezetre minden kötelező
bizonyíték megvan és naprakész. A kiadási jelentés tételesen azt igazolja,
hogy nincs hiányzó vagy elavult kötelező elem. Pipa csak az ellenőrzött
feltétel teljesülésére adható. A hiány vagy eltérés nyitott teendő marad,
amíg a javítás és a szükséges bizonyítékpótlás meg nem történik.

| Kötelező feltétel | Megvalósítás | Kiadáshoz szükséges eredmény |
| --- | --- | --- |
| 1. Verziókezelt, ismételhető folyamat | `scripts/release.mjs`, két PowerShell-segéd, `release/policy.json` | Egyetlen előkészítés–bizonyítékrögzítés–ellenőrzés–véglegesítés út; nincs `.tmp`-beli kiadási program. |
| 2. Változáshoz kötött bizonyíték | Fájlonkénti SHA256, verzió, host, profil, próbaeljárás | Nincs elavult kötelező bizonyíték; a változatlan, érvényes ellenőrzés újrahasznosul. |
| 3. Valódi Desktop-használat | [Natív próbaeljárás](../../release/desktop-acceptance.md), eredeti MCP-eredmények és két kép | ZIP-telepítés, projektkötés, látható böngésző, emberi Choose → Ready, vezérlés-visszavétel és leállítás a deklarált profilban. |
| 4. Pontos hibadiagnózis | Minden kapufutás JSON-jelentése | Hibakód, szakasz, ismert verzió/környezet, érintett profil/fájl; az eredeti hiba megmarad. |
| 5. Teljes és naprakész kiadási bizonyíték | `finalize` és a CI kiadási jobja | Nincs hiányzó vagy elavult kötelező elem; minden feltétel teljesülése után készülhet végleges kiadási kimenet. |

## Használat

A példák a jelenlegi **1.0.0-s jelöltet** és a megőrzött **0.7.5-ös natív
bizonyítékot** használják. Ezért a `check` és `finalize` parancsban az eredeti
0.7.5-ös ZIP a `--basis-candidate`. A korábbi eredményt nem írjuk át 1.0.0-ra;
a kapu az eredeti bizonyíték és a két csomag összevetésével dönt az érvényességről.

1. Nézd át a [kiadási mátrixot](../../release/policy.json). A jelenlegi kötelező
   natív Desktop-kombináció **Windows x64 / Full Access / approvalPolicy=never**,
   Codex Desktop `26.1007.2314.0`, CLI `0.162.0-alpha.17.2`.
   Más profilhoz külön, tényleges Desktop-bizonyíték kell. A korábbi külön
   app-serveres workspace-git próba nem pótolja ezt. A mátrix a támogatott,
   ellenőrzött környezetet rögzíti; a CI nem észleli más felhasználók appfrissítését.
2. Készíts jelöltet a kiadandó forrásból. Ez csomagolást, fájlintegritást,
   dokumentációs hivatkozásokat és a telepítési PowerShell-példák szintaxisát
   ellenőrzi; böngészőpróbát és telepítést nem indít.

```powershell
node scripts/release.mjs prepare --source . --output artifacts/candidate-100
```

3. **Először a meglévő bizonyítékot egyeztesd.** A példákban az `artifacts/desktop-proof`
   egy korábban rögzített vagy újonnan létrehozandó, privát bizonyítékcsomag.

```powershell
node scripts/release.mjs check --candidate artifacts/candidate-100/BontaFlowStack-1.0.0.zip --basis-candidate release/ci/BontaFlowStack-0.7.5.zip --evidence artifacts/desktop-proof
```

   `eligible` eredménynél lépj az 5. pontra. Hiányzó/elavult bizonyítéknál a
   jelentés alapján csak az érintett Desktop-használati utat végezd el a natív
   próbaeljárással. Új funkcionális tesztet ez a parancs nem indít.
4. Csak ha szükség volt új natív próbára, az adott jelölt ZIP-pel ténylegesen
   lezajlott próba eredeti eredményeit rögzítsd, új bizonyítékkönyvtárba.
   A nyers jelentés a próba elején feljegyzett `contractSha256` értéket is
   tartalmazza; a `record` nem tölti ki utólag az aktuális elvárásból.

```powershell
node scripts/release.mjs record --candidate artifacts/candidate-100/BontaFlowStack-1.0.0.zip --raw artifacts/native-result.json --profile full-access --evidence artifacts/desktop-proof-100
```

   A már létező profilbizonyítékot nem írja felül. Új próbához új bizonyíték-
   könyvtárat adj meg. A csomag eredeti tooleredményeket és helyi útvonalakat
   tartalmazhat: nyilvános Gitbe vagy kiadási ZIP-be ne másold ellenőrzés nélkül.
   Több kötelező profil esetén mindegyikhez kell saját rögzített eredmény.
   Az új, ténylegesen 1.0.0-val készült bizonyítéknál az 5. lépésben ezt az új
   könyvtárat add meg, és hagyd el a `--basis-candidate` kapcsolót. Meglévő,
   érvényes 0.7.5-ös bizonyíték újrahasználatakor a 4. lépés kimarad.
5. Véglegesítsd pontosan ugyanazt a jelöltet:

```powershell
node scripts/release.mjs finalize --candidate artifacts/candidate-100/BontaFlowStack-1.0.0.zip --basis-candidate release/ci/BontaFlowStack-0.7.5.zip --evidence artifacts/desktop-proof --output artifacts/final --report artifacts/final-result.json
```

   Siker: `outcome=released`, `artifacts/final/1.0.0/`, az ellenőrzött ZIP
   változatlan bájtjai, SHA256 és `RELEASE-RECEIPT.json`. A könyvtár csak a
   fájlok elkészülte után kapja meg a végleges nevét. A már létező kiadást és
   jelentést nem írja felül. Hiba: nem nulla kilépési kód, `outcome=blocked`;
   hiányzó vagy elavult Desktop-bizonyítékkal nem jön létre kiadási könyvtár.

A `prepare` kimenete önmagában csak jelölt. A hagyományos forráscsomagoló normál
futása is fejlesztői csomagot készít. Kiadásként a sikeres kapuhoz tartozó ZIP,
ellenőrzőösszeg és kiadási bizonylat együtt adható át.

## Csak verziójelölést módosító kiadás

Az 1.0.0 a 0.7.5 elfogadott implementációjának kiadási átnevezése. Az új,
opcionális `--basis-candidate` az eredeti ZIP-et kéri a bizonyíték mellé.
Először a régi ZIP-re ellenőrzi a teljes eredeti Desktop-bizonyítékot, azután
összeveti az új csomaggal. Kizárólag a plugin manifest és catalog felső szintű
`version` karakterlánca változhat; minden más plugin-, setup- és marketplace-bájt
azonos kell legyen. Hozzáadás, törlés, más JSON-mező vagy formázásváltozás sem
fér ebbe a kivételbe. A dokumentáció változhat, de a csomagellenőrzések arra is
lefutnak. A host/profil/próbaeljárás és a nyers bizonyíték változatlanul kötött.

```powershell
node scripts/release.mjs finalize --candidate artifacts/candidate-100/BontaFlowStack-1.0.0.zip --basis-candidate release/ci/BontaFlowStack-0.7.5.zip --evidence artifacts/desktop-proof --output artifacts/final --report artifacts/final-100.json
```

A `check` ugyanígy használható. A PowerShell-belépőben `-BasisCandidate`, a közös
GitHub actionben `basis-candidate`, a kézi workflowban `basis_candidate` a neve.
Nélküle a korábbi szigorú verzióegyezés marad. A bizonylat `versionPromotion`
mezője őrzi mindkét verziót és ZIP-hasht; a natív eredményt és eredeti verzióját
nem írja át. Ez egyezésen alapuló újrahasználat, nem új verzióval végzett Desktop-próba.
`PROMOTION_INPUTS_CHANGED` vagy `PROMOTION_METADATA_CHANGED` esetén tényleges
termékváltozás történt: annak érintett használati útját külön kell igazolni.

Az új ellenőrzések: `node --test tests/release-promotion.test.mjs`.
A korábbi GitHub-kapupróba eredménye megmarad saját eredeti scope-jában.

## Mikor érvényes a korábbi Desktop-bizonyíték?

Alapesetben egyeznie kell a plugin verziójának és **minden** `plugins/bontaflowstack/` fájlnak
(hozzáadás és törlés is változás), a gyökér `scripts/setup.ps1` fájlnak és a
`.agents/plugins/marketplace.json` fájlnak. A deklarált Desktop/CLI-verzió,
jóváhagyási szabály, jogosultsági profil, próbaeljárás és próbaoldal is kötött.
A bizonyítékban megőrzött nyers eredmények és képek sérülése külön hiba.

A kizárólag ezeken kívüli dokumentációt módosító ZIP elfogadható a korábbi
eredménnyel: a bizonylat megőrzi az eredetileg telepített és az új ZIP hashét.
Nincs önkényes napok szerinti lejárat. Az új hostverzió támogatásának vállalásakor
frissíteni kell a mátrixot, és a hozzá tartozó hiányzó natív utat igazolni kell.
Pusztán a policy átírása nem teszi az új környezetre érvényessé a régi eredményt.

| Hibakód | Teendő |
| --- | --- |
| `DESKTOP_EVIDENCE_MISSING` | Keresd meg a megfelelő meglévő csomagot; ha nincs, végezd el a hiányzó natív utat. |
| `DESKTOP_INPUTS_STALE` | A `changedPaths` alapján az érintett jelölt használatát igazold. |
| `DESKTOP_HOST_STALE`, `DESKTOP_PROFILE_STALE`, `DESKTOP_VERSION_STALE` | Az eltérő kombinációhoz tartozó bizonyíték szükséges. |
| `DESKTOP_CONTRACT_STALE` | A megváltozott próbaeljáráshoz tartozó bizonyíték szükséges; a régi nem címkézhető át. |
| `DESKTOP_TRACE_CHANGED`, `SCREENSHOT_CHANGED` | Állítsd helyre az eredeti bizonyítékot; ne írd át a hashét egy sikertelen futás elfedésére. |
| `NATIVE_STEP_FAILED`, `PROJECT_BINDING_FAILED`, `RUNTIME_MISMATCH`, `HUMAN_JOURNEY_FAILED` | A megnevezett lépés hibáját javítsd és célzottan igazold. |
| `OUTPUT_EXISTS` | Új kimeneti/jelentésútvonal szükséges; a meglévő adatok megmaradnak. |

Alapértelmezett jelentés: `artifacts/release-runs/<azonosító>/result.json`.
Érvénytelen argumentum vagy már foglalt jelentésútvonal esetén a hiba JSON-ja
a standard hibakimeneten jelenik meg, és nincs kiadási művelet.

## Verziókezelés és CI

A [Package checks workflow](../../.github/workflows/check.yml) megtartja a meglévő
forrás- és csomagellenőrzéseket, és futtatja az új kiadási kapu célzott tesztjeit.
A kézzel indítható kiadási job csak sikeres `core` után indul, ugyanazt a
[`finalize-release` lépést](../../.github/actions/finalize-release/action.yml)
használja, és csak utána tölthet fel `verified-release` artifactot.
Hibánál a diagnosztika külön artifact marad.

A [külön GitHub-kapupróba](../../.github/workflows/release-gate-proof.yml) három
esetet futtat: hiányzó, elavult és érvényes bizonyíték. A dedikált
`codex/release-gate-proof-*` ág push eseményén csak ez fut; a teljes termékteszt
kimarad. Más ágak és pull requestek szokásos ellenőrzése nem változik.
A negatív esetek a közös kiadási lépés hibáját és a kiadási könyvtár hiányát
követelik meg. Csak az érvényes eset tölthet fel kiadási artifactot.
Az [ellenőrzött bemenetek leírása](../../release/ci/README.md) rögzíti a két ZIP
eredetét és a privát Desktop-bizonyíték secretként történő átadását.

A `desktop_evidence_directory` bemenetnek az adott checkoutban elérhető,
adatvédelmileg átnézett bizonyítékcsomagra kell mutatnia. A workflow nem gyárt
Desktop-bizonyítékot és nem tölti fel magát a privát bizonyítékcsomagot.
Ilyen bemenet hiányában szándékosan letiltja a kiadást. A helyi kapu ugyanúgy
használható a Gitbe be nem tett, privát bizonyítékkal.

A helyi `check`/`finalize` nem futtatja újra a teljes termék tesztkészletét.
A termékváltozás által érintett ellenőrzések továbbra is szükségesek; a meglévő,
érvényes eredmények megőrizhetők. A CI a saját szokásos ellenőrzéseit futtatja.

Ez a folyamat rögzített bizonyítékot és annak érvényességét ellenőrzi; nem a
Codex által aláírt attesztáció. Szándékosan hamisított, a policyvel együtt átírt
eredményt nem tud hitelesíteni. Új bizonyíték elfogadásakor ezért az eredeti
Desktop-toolhívások és az emberi visszajelzés átnézése is kötelező.
