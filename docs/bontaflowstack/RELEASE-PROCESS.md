# Kötelező kiadási folyamat

A kiadás egyetlen belépője a `node scripts/release.mjs` a forrásrepo gyökerében.
A `scripts/build-package.ps1 -Release` ugyanezt a kaput hívja. Nincs `force`,
`skip` vagy automatikus profilváltás. A folyamat Windows x64, Node.js 24 és
Windows PowerShell 5.1 mellett készült; külső npm-csomagot nem igényel.

| Kötelező feltétel | Megvalósítás | Kiadáshoz szükséges eredmény |
| --- | --- | --- |
| 1. Verziókezelt, ismételhető folyamat | `scripts/release.mjs`, két PowerShell-segéd, `release/policy.json` | Egyetlen előkészítés–bizonyítékrögzítés–ellenőrzés–véglegesítés út; nincs `.tmp`-beli kiadási program. |
| 2. Változáshoz kötött bizonyíték | Fájlonkénti SHA256, verzió, host, profil, próbaeljárás | A változatlan ellenőrzés újrahasznosul; az érintett, elavult bizonyíték elutasítva. |
| 3. Valódi Desktop-használat | [Natív próbaeljárás](../../release/desktop-acceptance.md), eredeti MCP-eredmények és két kép | ZIP-telepítés, projektkötés, látható böngésző, emberi Choose → Ready, vezérlés-visszavétel és leállítás a deklarált profilban. |
| 4. Pontos hibadiagnózis | Minden kapufutás JSON-jelentése | Hibakód, szakasz, ismert verzió/környezet, érintett profil/fájl; az eredeti hiba megmarad. |
| 5. Bizonyíték nélküli kiadás tiltása | `finalize` és a CI kiadási jobja | Csak sikeres kapu után jelenhet meg a végleges verziókönyvtár és a `RELEASE-RECEIPT.json`. |

## Használat

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
node scripts/release.mjs prepare --source . --output artifacts/candidate-075
```

3. **Először a meglévő bizonyítékot egyeztesd.** A példákban az `artifacts/desktop-proof`
   egy korábban rögzített vagy újonnan létrehozandó, privát bizonyítékcsomag.

```powershell
node scripts/release.mjs check --candidate artifacts/candidate-075/BontaFlowStack-0.7.5.zip --evidence artifacts/desktop-proof
```

   `eligible` eredménynél lépj az 5. pontra. Hiányzó/elavult bizonyítéknál a
   jelentés alapján csak az érintett Desktop-használati utat végezd el a natív
   próbaeljárással. Új funkcionális tesztet ez a parancs nem indít.
4. Az adott jelölt ZIP-pel lezajlott natív próba eredeti eredményeit rögzítsd.
   A nyers jelentés a próba elején feljegyzett `contractSha256` értéket is
   tartalmazza; a `record` nem tölti ki utólag az aktuális elvárásból.

```powershell
node scripts/release.mjs record --candidate artifacts/candidate-075/BontaFlowStack-0.7.5.zip --raw artifacts/native-result.json --profile full-access --evidence artifacts/desktop-proof
```

   A már létező profilbizonyítékot nem írja felül. Új próbához új bizonyíték-
   könyvtárat adj meg. A csomag eredeti tooleredményeket és helyi útvonalakat
   tartalmazhat: nyilvános Gitbe vagy kiadási ZIP-be ne másold ellenőrzés nélkül.
   Több kötelező profil esetén mindegyikhez kell saját rögzített eredmény.
5. Véglegesítsd pontosan ugyanazt a jelöltet:

```powershell
node scripts/release.mjs finalize --candidate artifacts/candidate-075/BontaFlowStack-0.7.5.zip --evidence artifacts/desktop-proof --output artifacts/final --report artifacts/final-result.json
```

   Siker: `outcome=released`, `artifacts/final/0.7.5/`, az ellenőrzött ZIP
   változatlan bájtjai, SHA256 és `RELEASE-RECEIPT.json`. A könyvtár csak a
   fájlok elkészülte után kapja meg a végleges nevét. A már létező kiadást és
   jelentést nem írja felül. Hiba: nem nulla kilépési kód, `outcome=blocked`;
   hiányzó vagy elavult Desktop-bizonyítékkal nem jön létre kiadási könyvtár.

A `prepare` kimenete önmagában csak jelölt. A hagyományos forráscsomagoló normál
futása is fejlesztői csomagot készít. Kiadásként a sikeres kapuhoz tartozó ZIP,
ellenőrzőösszeg és kiadási bizonylat együtt adható át.

## Mikor érvényes a korábbi Desktop-bizonyíték?

Egyeznie kell a plugin verziójának és **minden** `plugins/bontaflowstack/` fájlnak
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
`finalize` kaput használja, és csak utána tölthet fel `verified-release` artifactot.
Hibánál a diagnosztika külön artifact marad.

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
