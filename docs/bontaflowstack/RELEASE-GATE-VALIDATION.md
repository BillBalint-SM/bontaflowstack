# A kiadási kapu igazolása — 2026-10-11

Az [öt kötelező kiadási feltétel](RELEASE-PROCESS.md) új folyamatát ellenőriztük.
A korábban lezárt natív, böngésző- és termékteszteket nem futtattuk újra.
A GitHub Actions workflow-t nem indítottuk el.

## Megfigyelt eredmények

| Eset | Tényleges eredmény | Végleges kiadási könyvtár |
| --- | --- | --- |
| Valódi 0.7.5 ZIP, hiányzó Desktop-bizonyíték | `DESKTOP_EVIDENCE_MISSING`, kilépési kód 1 | Nem jött létre |
| Elkülönített csomagpéldány megváltozott `bfstack.ps1` fájllal és a régi bizonyítékkal | `DESKTOP_INPUTS_STALE`, kilépési kód 1; a jelentés pontosan ezt a fájlt nevezi meg | Nem jött létre |
| Változatlan 0.7.5 ZIP, érvényes korábbi Desktop-bizonyíték | `outcome=released`, kilépési kód 0 | Létrejött; a ZIP bájtról bájtra az eredeti |

Az elfogadott ZIP SHA256 értéke:
`3628c15d1ab99e8c1d87b42523a62812d3c3500653f931fca2c32af6b06ad899`.
Az eredeti terjesztési ZIP nem változott. A sikeres ellenpróba külön kimenetet
hozott létre az `artifacts/release-gate-proof/valid-final-output/0.7.5` alatt.

A negatív ellenpróba a munkafában már jelen lévő, korábban nem igazolt
`plugins/bontaflowstack/scripts/bfstack.ps1` eltérést másolta egy elkülönített
csomagforrásba. A valódi pluginfájlt és a telepített plugint nem módosította.

A gépi összesítés és az egyes diagnosztikák hashértékei:
[RELEASE-GATE-RESULTS.json](RELEASE-GATE-RESULTS.json).
A teljes helyi jelentések és privát bizonyítékcsomag az
`artifacts/release-gate-proof/` könyvtárban maradtak.

## Új automatizált ellenőrzések

Parancs: `node --test tests/release-gate.test.mjs tests/release-workflow.test.mjs`.
Eredmény: **11 sikeres, 0 hibás, 0 kihagyott teszt**.

A szintetikus kaputesztek a hiányzó bizonyítékot, runtime/telepítő/host/profil/
verzió/eljárás változását, módosított vagy hibás tooleredményt, hiányzó emberi
lépést és leállítást, valamint a kizárólag dokumentációt érintő újrahasznosítást
ellenőrzik. A Git LF/CRLF normalizálása önmagában nem érvénytelenít bizonyítékot.

A valódi CLI-vel és Windows PowerShell ZIP-kezeléssel futó integrációs teszt
10 elutasítási helyzetet ellenőriz. Köztük van a meglévő jelentés felülírásának
tiltása, az elavult eljáráshoz tartozó eredmény újrarögzítésének tiltása,
a második kötelező profil hiánya és a régi `build-package.ps1 -Release`
belépő kapuhoz irányítása. A `--force` argumentumot elutasítja.
Ezek a szintetikus eredmények a kapu működését igazolják, önmagukban nem
jelentenek natív Desktop-elfogadást.

## A megőrzött natív bizonyíték eredete és korlátai

A kapu a korábbi, 12 natív toolhívással lezárt 0.7.5-ös Desktop-próbát használta.
A régi nyers jelentés SHA256 értékét összevetettük a már rögzített környezeti
jelentéssel. Az eredeti próbaoldal tartalma egyezik a verziókezelt oldallal.
A próba lépéseit összevetettük az első kiadási szerződéssel; az import egy
külön másolatban rögzíti ezt az egyeztetést és az eredeti jelentések hashét.
Az eredeti nyers bizonyíték változatlan maradt. Új Desktop-futás nem történt.

A bizonyított mátrix: Windows x64, Codex Desktop `26.1007.2314.0`, CLI
`0.162.0-alpha.17.2`, Full Access, `approvalPolicy=never`, Chromium sandbox
bekapcsolva. Más gépen vagy más Desktop-verzión ezt a kiadási folyamatot még
nem teszteltük. A rögzített bizonyíték nem kriptográfiai hostattesztáció.
