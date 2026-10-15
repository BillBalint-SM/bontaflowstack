# Linux/macOS candidate: installation and verification status

The published `1.2.0` release has a Windows x64 baseline. Issue #6 extends the
local candidate to Linux and macOS x64/ARM64. These candidate changes have not
been published. An accepted npm target is not evidence of a complete native port.

The following status is based on the [implementation evidence](OS-EXPANSION-IMPLEMENTATION.md)
recorded on 2026-10-15. Older entries in that log describe earlier states; later
entries qualify or supersede them. The [specification](https://github.com/BillBalint-SM/bontaflowstack/issues/6)
still defines the complete acceptance matrix.

Native host outcomes belong to the artifact hashes recorded in that evidence.
Later test and documentation changes do not constitute a rerun of those host
model journeys, and do not turn a waiting model cell into a verified result.

## OS, CPU and libc evidence

| Environment | Observed candidate result | Still unverified or blocked |
| --- | --- | --- |
| Windows x64 | Previous full regression and native lifecycle results retained; Windows storage layout and host commands preserved | New changes need their affected Windows checks |
| Linux x64, WSL Ubuntu 26.04, glibc 2.43, Node 24.21.0 | Six native host install/repeat/update paths; core, Chromium/render and Impeccable paths; OpenCode native model health/browser/render journey | Host model coverage differs; WSL userland evidence does not establish every distribution or a separately booted Linux desktop |
| Fedora 44 x64 userland under rootless bwrap/WSL | Actual native engine suite 12/12, render, browser and CSS detector; current shared tarball setup help/core doctor | Native host journeys and independently booted desktop; dependency preparation had a limited RPM post-install failure, detailed in the log |
| Arch bootstrap 2026.10.01 x64 under rootless bwrap/WSL | Actual native engine suite 12/12, render, browser and CSS detector; current shared tarball setup help/core doctor | Native host journeys, independently booted desktop |
| Alpine 3.24.2 x64, musl | Current shared tarball setup help/core doctor with native Node 24.18.1; earlier native Impeccable/CSS path. Doctor reports libc as unknown | Full engine blocked: bundled Chromium requires the missing glibc ELF loader; not full Alpine browser support |
| Debian 13 x64 | CI job prepared with a pinned image | Actual execution of the new CI job and native host/engine journey |
| Linux ARM64 glibc | Candidate target, generated adapters and CI job prepared | Actual native ARM64 checks, hosts and engines |
| macOS ARM64 / Intel x64 | Candidate paths, Node discovery/recovery and adapters have controlled coverage; native CI jobs prepared | No Mac available locally; native checks, Finder/GUI PATH, engines, volume case behavior and host journeys |

Linux support uses OS/CPU, ABI and actual capability checks. There is no Ubuntu
allowlist. A missing library or an incompatible Chromium build affects that
capability; it does not disable core registration solely because of a distro name.
Setup does not install system libraries with apt, dnf, pacman or sudo.

X11/WSLg native Cursor visibility and physical clicking were confirmed. Separate
Wayland and human BFS browser handoff/resume are still unverified. A GUI snapshot,
installed manifest or successful doctor is not a substitute for those checks.
With display variables removed, the real Linux engine completed headless
click/readback, screenshot and render operations, reported a missing X display
for a visible launch, and recovered headless operation. This process-environment
probe ran on the WSL host; it is not an independently tested headless server.

## Native Linux host evidence

| Host and actual version | Installation/repeat/update | Native model/tool journey |
| --- | --- | --- |
| Codex CLI 0.162.0 | Verified | Waiting for authentication |
| Claude Code 2.1.296 | Verified | Waiting for authentication |
| Gemini CLI 0.63.0 | Verified, including Node-path recovery | Model journey not verified |
| GitHub Copilot CLI 1.0.96 | Verified | Waiting for authentication |
| Cursor IDE 3.24.18 | Verified; GUI discovers 34 skills, five MCP tools and seven hook definitions | Waiting for provider quota; **no further model requests**. Actual sessionStart, beforeSubmitPrompt, stop(error), sessionEnd(user_close) verified. MCP calls and pre/post tool hooks remain unverified |
| OpenCode CLI 1.19.0 | Verified | Actual health and browser/render/CSS model journeys verified in their recorded scope |

Authentication is a host action. Setup does not copy credentials between Windows
and Linux or change accounts, subscriptions, trust or permission settings.

## Trying a local candidate

Use Node.js 24+ with npm, Git and a supported native host. The examples below
build this checkout and install its actual tarball, not the published Windows
baseline. They require internet access for package/engine dependencies. Choose
only hosts you intend to configure; `--host all` requires all six.

```sh
node scripts/build-npm-package.mjs --output .tmp/posix-candidate/package
npm pack ./.tmp/posix-candidate/package --pack-destination .tmp/posix-candidate
npx --yes --package "$PWD/.tmp/posix-candidate/bontaflowstack-1.2.0.tgz" bontaflowstack setup --host codex
```

The build output must be a new directory. Its current package version is `1.2.0`;
local candidate bytes differ from the published release. Record the tarball hash
and the tested source revision when sharing an outcome. A later published POSIX
release will use the normal exact-version `npx bontaflowstack@<version> setup` route.

Start a new host session after installation. In Cursor, save work, reload the
relevant IDE window and check Customize before testing tools. Native Linux login
needs a working Linux browser opener and callback to that same Linux Cursor.
A Windows browser callback can target Windows Cursor; it is not Linux acceptance.
The temporary WSL test helper described in the implementation log is not part of
the distributed installer.

For command-line diagnosis, the installed plugin offers the same direct Node API:

```sh
node "/absolute/path/to/plugin/core/cli.mjs" doctor
node "/absolute/path/to/plugin/core/cli.mjs" engine status
```

Run from the actual project using the absolute plugin path reported by setup or
the host's registration. These read-only commands do not prove model access or
GUI readiness. No PowerShell installation is required for these POSIX commands.

## Paths, recovery and preserved data

| Default | Linux | macOS candidate |
| --- | --- | --- |
| Durable npm adapter root | `${XDG_DATA_HOME:-$HOME/.local/share}/bontaflowstack/npm` | `$HOME/Library/Application Support/BontaFlowStack/npm` |
| New state root | `${XDG_STATE_HOME:-$HOME/.local/state}/bontaflowstack/state/v2` | `$HOME/Library/Application Support/BontaFlowStack/state/v2` |
| Adapter version directory | `versions/linux-<arch>/<version>/hosts` | `versions/darwin-<arch>/<version>/hosts` |

Only absolute XDG values are used; relative values fall back to the documented
defaults. An explicit `BFS_STATE_HOME` must be absolute. An existing installation
pin retains its previous state root even when the host's environment changes.
Setup does not migrate or merge data. POSIX private state directories/files use
0700/0600; this is not a whole-home permission change.

Setup records phases and per-host results in `setup-status.json` under the durable
npm root. Missing engines can leave core registered while setup reports
`incomplete` and exits nonzero. Resolve the specific prerequisite and rerun the
same command. Previous versions, shared data, foreign MCP entries and native
host policies remain separate from registration. Removing a host registration
does not remove the retained data.

Setup pins a usable absolute Node path for GUI hooks/MCP. If a version manager
removes that Node, rerun the same candidate setup with a working Node 24+ process;
the owned runtime-recovery path has controlled and native Linux evidence.
Actual macOS GUI recovery is still unverified.

## CI coverage and its limits

The existing Windows source-package/release checks remain. Added jobs request
Node 24 and assert the runtime OS/architecture on Linux x64/ARM64 and macOS
ARM64/Intel, then run the common checks, including real `npm pack`.
The POSIX jobs also exercise a temporary-directory alias with a real core case;
the common fixture roots resolve the temporary parent before creating state.
The runner labels follow the [GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

Debian/Fedora/Arch jobs use pinned container images and run common checks. They
also verify and extract the same SHA-256-bound candidate tarball built by the
Linux x64 job, then exercise setup help and the packed core doctor. Alpine uses
an official Node 24 musl image in Docker for the same core/package boundary.
Those jobs do not establish full distro engine or graphical host acceptance.

At preparation time, the workflow has not run on GitHub. Local Linux/Windows
results are recorded separately. Container image digests pin the base filesystem;
package-manager prerequisites and GitHub runner images can still change.
No model API, host login token, paid upgrade, publication or deployment is needed
by these jobs. Native host login, GUI trust and human handoff remain separate.
