# npm terjesztés és kiadási kapu

## Jelenlegi felhasználói terjesztés: egy npm-csomag két hosthoz

A felhasználói telepítési artefaktum a `bontaflowstack` npm-csomag pontos
verziójú `.tgz` fájlja. A csomag egyetlen `npx bontaflowstack@<verzió> setup`
parancsa a Codex és a Claude Code plugint is telepíti. Új felhasználói ZIP-et
nem készítünk és nem publikálunk. A `plugins/bontaflowstack/engines/*.zip` a
csomag belső, ellenőrzőösszeggel rögzített motorarchívuma; nem telepítőcsomag.

A publikált verzió `1.1.0-rc.2`; a helyben előkészített következő jelölt
`1.1.0-rc.3`. Az alábbi parancsok erre a még nem publikált jelöltre vonatkoznak;
lásd az [rc.3 ellenőrzési jelentését](RELEASE-1.1.0-rc.3.md).
Kiadásjelölt csak az `rc` npm dist-taggel publikálható.
Ez nem jelent teljes natív hostelfogadást. A korábbi Codex `1.0.0` ZIP-bizonyíték
annak az eredeti csomagnak és futásnak a történeti bizonyítéka; nem igazolja a
két-hostos npm artefaktumot vagy a Claude Code natív viselkedését. Stabil npm
verzió kiadását a jelenlegi eszköz blokkolja, amíg nincs az egzakt npm `.tgz`-re
futtatott és rögzített natív Codex- és Claude Code-elfogadási kapu.

### Kiadásjelölt készítése és ellenőrzése

Windows x64-en, Node.js 24+-szal és npm 11.21.0+-szal futtasd a projektellenőrzést,
majd készíts egy új, még nem létező kiadási könyvtárat a verziótagból:

```powershell
node --test tests/npm-package.test.mjs tests/npm-release.test.mjs
node scripts/npm-release.mjs prepare --output artifacts/npm/1.1.0-rc.3 --tag rc --release-tag v1.1.0-rc.3
```

A `prepare` elkészíti a két host pluginját, valódi `npm pack`-ot futtat,
megőrzi a pontos `.tgz` bájtjait, és `release.json` fájlban rögzíti a nevet,
verziót, RC taget, forrástagot, SHA256-ot, npm SHA512-integritást és a csomagolt
fájlokat. Létező könyvtárat nem ír felül. A csomag tartalmát és a SHA256-ot
ellenőrizd publikálás előtt.

### Publikálás

Első npm publikáláskor a csomagnak már léteznie kell a registryben, mielőtt a
Trusted Publisher beállítható. Ezért az első RC-t a kiadási könyvtárból,
interaktívan, a tulajdonosi npm-fiókkal kell publikálni:

```powershell
node scripts/npm-release.mjs publish --artifact artifacts/npm/1.1.0-rc.3 --tag rc
```

A parancs csak a `prepare` során létrehozott `.tgz`-t publikálja, és előtte
ellenőrzi annak változatlanságát. Elutasítja a hiányzó vagy eltérő verziót,
forrástagot, integritást és a prerelease `latest` taggel való publikálását.
Sikeres publikálás után összeveti a registry név/verzió/integritás adatait a
helyi `.tgz`-vel, majd ellenőrzi, hogy az `rc` dist-tag a verzióra mutat.
Publikálási hiba esetén őrizd meg a kiadási könyvtárat; egy npm-verzió nem
írható felül.

Az első sikeres publikálás után az npm csomagbeállításainál konfiguráld a
GitHub Actions Trusted Publishert a `BillBalint-SM/bontaflowstack` repóhoz és
`.github/workflows/npm-publish.yml` workflow-hoz. Ezután a védett pontos
`v<verzió>` taggel indított manuális workflow ellenőrzi és publikálja az RC-t
OIDC-vel. A workflow npm CLI 11.21.0-t használ, mert az npm dokumentációja ezt
írja elő a Trusted Publisherrel végzett dist-tag műveletekhez. Lásd az npm
[Trusted publishing](https://docs.npmjs.com/trusted-publishers/) és
[dist-tag](https://docs.npmjs.com/adding-dist-tags-to-packages/) útmutatóját.

Az első publikálás megtörtént a `bontaflow` fiókkal: `1.1.0-rc.1`, explicit `rc`
címkével. A registry-integritás és a registryből indított telepítés igazolt;
lásd a [kiadási jelentést](RELEASE-1.1.0-rc.1.md). Az OIDC-beállítás és az abból
végzett kiadás még nincs igazolva.

Az npm a feltöltés után feldolgozási késést jelzett. Ilyenkor ne publikáld újra
ugyanazt a verziót: a megőrzött artifacttal futtasd újra a `verify` parancsot.
A verifier az npm objektum- és egyetlen elemből álló tömbválaszát is kezeli.
Az első kiadásnál a registry `latest` címkét is rendelt az RC-hez, majd annak
törlését E400-zal elutasította. A verifier ezt külön figyelmeztetésben és
`registryAssignedLatest` mezőben jelzi; nem nevezi stabilnak az RC-t és nem
engedélyez stabil publikálást. A felhasználói parancs a pontos RC-verziót rögzíti.

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
