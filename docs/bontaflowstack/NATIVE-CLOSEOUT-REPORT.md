# Célzott natív lezárási próbák — 2026-10-11

Ez az első lezárási kör történeti jelentése. A később engedélyezett cookie-javítás
kiadása: engine 0.3.2, plugin 0.7.1; lásd a [changelogot](CHANGELOG.md).
Az újraindítás utáni W01 előpróba (`01a12830-32b8-7be2-899d-8a9852f5f2e8`)
ugyanazzal a runtime sharing violation hibával már a `whoami` előtt megállt.

Felhasználói elfogadás: W01 → G01 → B01 → R01; csak hiba esetén javítás és
érintett ismétlés. Saját GitHub-tesztág és push külön engedélyezve.
Nem futott teljes tesztkampány. Eredmény: **3 PASS, 1 BLOCKED**.

## Vizsgált telepítés

- Plugin: `C:/Users/littl/.codex/plugins/cache/bontaflowstack/bontaflowstack/0.7.0`.
- HOST SHA-256: `5f80fdb29599a69d629fffbf7c2d3482726a86603cef46b96ced40a4e2471d60`.
- Guard SHA-256: `6f8bc64576b632f249ddb8ce26c870ee19d8f328795d24ca342742555049067f`.
- Codex CLI: 0.162.1; Node: 26.8.1; Windows.
- A nyers bizonyítékok helyben: `.tmp/native-closeout-20261011/`.
  Az `evidence-index.json` tartalmazza az összefoglaló fájlok SHA-256 értékeit.
  Ezek helyi tesztadatok, nem publikált release artifactok.

## W01 — BLOCKED

Natív chat: `01a1281f-853c-71f2-a6f9-29ce97853dc4`.
Célzott ismétlés: `01a12820-6137-7c40-a21e-2904a809cc08`.
Mindkettő `workspace-write`, elevated Windows sandbox és `approval_policy=never`.
A második futás explicit saját Git metadata write-rootokat is kapott; a child
runtime-környezet tisztítása sem oldotta meg az indítást.

A shell egyik futásban sem indult: `helper_unknown_error: setup refresh had errors`.
A sandboxnapló konkrét oka: `node_repl.exe` runtime read/execute ACL validation,
sharing violation, `os error 32`. A napló a saját `.git`/worktree metadata
védelmére deny ACE alkalmazását is rögzíti; ennek commitra gyakorolt hatását
ebben a futásban nem lehetett megmérni, mert a shell korábban elakadt.

HEAD változatlan: `5de819a3c35c3c82edb03fc9e512acad52d64844`; worktree tiszta.
Commit nem történt. Nincs danger-full-access fallback vagy kézi globális ACL/Git
konfigurációmódosítás. A Codex sandbox helper maga alkalmazott fixture ACL-eket.
Maradék: a runtime megosztási akadályának megszüntetése után kizárólag W01 újrapróba.

## G01 — PASS

A fő natív chat valódi hook-megfigyelésével futott. Engedélyezett könyvtárban
`apply_patch` sikerült; kívül PreToolUse denial, és a fájl nem jött létre.
A marker törlése először blokkolt. A felhasználó a pontos `Remove-Item -LiteralPath`
parancsra és saját `guard/disposable-marker.txt` célra engedélyt adott.

A policy átmeneti visszaállítása törölte az első pending ID-t, ezért friss
blokkolás után ugyanazon, már engedélyezett parancsra történt approve:
`8012aaab-0f97-4a0b-ae6b-13c4cf42e722`. Az unchanged retry exit 0, marker eltűnt.
Az ismétlést a hook ismét blokkolta (`e7fa07ff-93ca-40bb-b7d7-d82ce7f901eb`).
Záráskor az eredeti `warnings=false`, `boundary=null` állapot visszaállítva.

Korlát: külön Edit/Write, engedélylejárat és teljes eszközmátrix nem futott;
a guard továbbra sem OS-sandbox.

## B01 — PASS a helyi engine-javítás után

A telepített plugin CLI és valódi Chromium hajtotta végre a handoff/resume
parancsokat. Az első harness JSON-ként kezelt szöveges választ; egy ismétlés
egy már leállított tesztkiszolgáló URL-jét töltötte vissza. Ezek megőrzött
harnesshibák, nem termék-PASS-ok.

A kezdeti PASS-t visszavontuk: a kiszolgáló újratöltéskor újra kiadta a cookie-kat,
ezért elfedte a session-cookie veszteséget. A szigorított próba csak az első
kéréskor állít cookie-t, és a handoff utáni első kérésben követeli annak jelenlétét.
Ez a telepített eredeti engine 0.3.1-en FAILED lett.

Valódi gyökérok: a Chromium bezárásakor a session cookie-k nem maradtak meg;
a BrowserSession csak a profilra támaszkodott. Minimális javítás: close előtt
cookies kiolvasása, memóriában tartás, launch után és laprestore előtt addCookies.
Nem készült új cookie-fájl vagy BFS-memóriába mentett hitelesítő adat.

Egy új regresszió: `node --test tests/session-cookie-handoff.test.mjs`:
RED 0/1 (exit 1), majd ugyanaz GREEN 1/1 (exit 0). Más tesztfájl nem futott.
A szigorított B01 ezután PASS: HTTP-fejléc, normál/HttpOnly session cookie,
localStorage, laponként eltérő sessionStorage, két URL és kiválasztott lap megmaradt.
Az első váltás újratöltött; ismételt látható handoff és resume nem töltött újra.
A mentetlen input és JS-memóriaállapot az elvárt módon elveszett.

Aktív, külön helyi javított engine-build:
`0.3.1-local-handoff-92c12d033e2eb3ed`.
Manifest SHA-256: `bcebb1d96f0042b351b1556b6080fa42a8dbd578a6dbc5413198db7b4bfb6a69`.
Az eredeti engine megtartva; rollback-regisztráció az `engine-original-registration.json`-ban.
**Ez nem új publikált engine-release.** A kiadási pin továbbra is az eredeti
0.3.1-et választja; egy későbbi alapértelmezett újratelepítés nem garantálja ezt
a helyi javítást. A source-javítás és regressziós teszt nincs commitolva/kiadva.

## R01 — PASS

Egyetlen valódi push a saját `codex/verification-native-closeout-20261011` ágra.
GitHub commit: `9e326736534f419a175448cf42a1f499292fb013`.
A remote a konfigurált workbook címet a `BillBalint-SM/bontaflowstack` repóra irányította.
Main, release és deploy nem változott.

A telepített `delivery evidence` publikáló parancsa exit 0; utána a saját izolált
evidence könyvtár helyére tett fájl miatt a mentés EEXIST hibával meghiúsult.
A fault eltávolítása után új valódi chat (`01a12824-7321-7af0-acbd-47f258cfcc5d`)
resume/adopt, szándékosan sikertelen státuszlekérdezés (exit 23, failed/unknown),
majd valódi `gh api` és fresh verify. Új push nem történt.

Workflow `30046712-3a9d-45fa-a3f7-4f5dd56d5326` completed.
Live-query evidence `bc6edf7f-5793-481e-982a-ee1c64fa15c9`;
probe `6780f3d3-5b97-4eba-a7b9-9873340d9228`:
COMPLETED, matching revision, valid=true, liveVerified=true a lekérdezés idején.
A read-only report helyesen liveVerified=false, mert nem végez új lekérdezést.
A publisher naplóban egyetlen hívás; a native transcript nem tartalmaz új push-t.
A visszaolvasott workflow és bizonyítékok külön ellenőrizve.

Korlát: a recovery chat a jelenlegi danger-full-access hostprofilon futott;
ez nem W01 sandbox-bizonyíték. GitHub-ág helyreállítását igazolja, nem deploy/health
vagy minden providerhibát. A tesztág és a saját fixture-k megőrizve.
