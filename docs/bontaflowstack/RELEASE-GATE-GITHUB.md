# GitHubon igazolt kiadási kapu — 2026-10-11

A [38156928938-as GitHub Actions-futás](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928938)
**sikeres**. Ellenőrzött commit: `95900ec7e79b315b787d6fc8414fe0cea5596bdb`,
ág: `codex/release-gate-proof-20261011`. Ez külön ellenőrzési ág;
a változtatások nem kerültek beolvasztásra a `main` ágba.

| Desktop-bizonyíték | A tényleges kiadási kapu eredménye | Kiadási könyvtár | Kiadási artifact feltöltése |
| --- | --- | --- | --- |
| [Hiányzó](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928938/job/114521715800) | `DESKTOP_EVIDENCE_MISSING`, kilépési kód 1 | Nem jött létre | Kihagyva |
| [Elavult](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928938/job/114521715798) | `DESKTOP_INPUTS_STALE`, kilépési kód 1; eltérés: `plugins/bontaflowstack/scripts/bfstack.ps1` | Nem jött létre | Kihagyva |
| [Érvényes](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928938/job/114521715551) | `outcome=released`, kilépési kód 0 | Létrejött | `verified-release-valid` elkészült |

Mindhárom job a kiadási workflow által is használt
[közös finalize-release actiont](../../.github/actions/finalize-release/action.yml)
hívta. A negatív esetekben kizárólag a próba folytatódik a várt hiba után:
ellenőrzi a `steps.gate.outcome=failure` értéket, a konkrét hibakódot és a
kiadási könyvtár hiányát. Eltérő eredménynél a job hibás. Ezért zöld az
ellenpróba jobja annak ellenére, hogy a kiadási lépés szabályosan elutasított.
A normál kiadási workflow nem használ `continue-on-error` engedményt.
A GitHub [outcome/conclusion szabálya](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/contexts)
szerint a próba az eredeti hibát vizsgálja.

## Letöltéssel is ellenőrzött eredmény

A GitHub API pontosan négy artifactot adott vissza: három diagnosztikát és egy
`verified-release-valid` kiadási artifactot. A két negatív esethez nincs kiadási
artifact. Mind a négyet letöltöttük és beolvastuk.

A GitHubról letöltött kiadási ZIP SHA256 értéke:
`3628c15d1ab99e8c1d87b42523a62812d3c3500653f931fca2c32af6b06ad899`.
Ez bájtról bájtra megegyezik az eredeti, már igazolt 0.7.5-ös terjesztési ZIP-pel.
A gépi ellenőrzés és az artifactazonosítók:
[RELEASE-GATE-GITHUB-RESULTS.json](RELEASE-GATE-GITHUB-RESULTS.json).

## Mi nem futott újra?

A [Package checks társfutás](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928867)
`core` és `release` jobja egyaránt `skipped`, mindkettő nulla végrehajtott lépéssel.
Nem indult teljes termékteszt, motortelepítés, böngésző vagy új Desktop-próba.
A meglévő Desktop-eredmény eredeti bájtjai GitHub Actions-secreten keresztül
kerültek a runnerre, és a rögzített hashértékekkel egyeztek. A privát bizonyítékot
nem tettük Gitbe, naplóba vagy letölthető artifactba.

## Határok és fenntartás

Ez a GitHub-hostolt kiadási kaput igazolja. A Desktop elfogadása továbbra is a
korábbi, Windows/Full Access melletti tényleges használati bizonyítékra épül.
Nyilvános GitHub Release-t vagy taget nem hoztunk létre; az engedélyezett kimenet
a workflow-ból letölthető kiadási artifact. Az artifactok megőrzése 30 nap;
ez az eredményjegyzék verziókezelve megmarad.

A GitHub figyelmeztetést adott a használt v4 actionök deklarált Node 20
futtatókörnyezetére, és ebben a futásban Node 24 alatt hajtotta végre őket.
A próbát ez nem akadályozta. Action-verzióváltást ebben a feladatban nem végeztünk.
