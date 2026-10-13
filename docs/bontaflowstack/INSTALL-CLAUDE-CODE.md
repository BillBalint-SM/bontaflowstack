# Claude Code with the universal BontaFlowStack installer

Codex and Claude Code share one installer. The published npm release candidate is
**`bontaflowstack@1.1.0-rc.2`**. Its registry installation passed with both host CLIs;
authenticated Claude session acceptance remains pending. Install it with:

```powershell
npx bontaflowstack@1.1.0-rc.2 setup
```

The same command without `setup` starts setup too. By default it detects both
supported host CLIs and configures every installed host. To select just Claude
Code, pass `--host claude`; use `--host codex` for Codex, or `--host all` to
require both.

## Requirements and first session

Use Windows x64, Node.js 24+ with npm, Git for Windows, Claude Code 2.1.296 or
newer on `PATH`, and internet access for engine dependencies and Chromium. A
Claude account with Code access is needed for model-driven work, not for copying
the package files. This prerelease has no authenticated Claude model-session
acceptance yet; the validator and local CLI installation checks do not prove
hook, MCP or skill behavior in a live session.

After setup reports success, start a fresh Claude Code session in your project
and begin with:

```text
/bontaflowstack:bfs-router
```

The installer keeps versioned adapter files outside the npm cache at
`%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0-rc.2\hosts\claude`. Its
`install-state.json` pins the selected shared BFS state root. Setup reuses a
sole existing root, including a Windows Store redirected LocalAppData location;
with no prior state, it uses `%LOCALAPPDATA%\BontaFlowStack\state\v2`. If two
different roots contain state, setup stops before host configuration. Set
`BFS_STATE_HOME` to the existing root you choose and rerun setup; the installer
does not merge state. Codex and Claude Code then use the same selected memory
and workflow data.

Claude can understand supplied images when available and create authored
HTML/SVG or use supplied assets. Raster image generation and editing are outside
the accepted scope.

## Update and remove

Update by running the same setup flow with a newer exact published version.
Previous version directories and shared BFS state are retained. Start one setup
at a time and open a fresh Claude session after an update. A plugin disabled in
Claude remains disabled; enable it through Claude's `/plugin` interface.

Remove only the Claude plugin registration with Claude's plugin manager:

```powershell
claude plugin uninstall bontaflowstack@bontaflowstack-npx --scope user
claude plugin marketplace remove bontaflowstack-npx --scope user
```

Uninstall does not remove the versioned adapter directory, shared BFS state or
engine data. Review and delete retained files separately only if you intend to
erase them; see [local data](LOCAL-DATA.md).

## Local candidate checks for maintainers

The published release above remains rc.2. The next candidate, rc.3, is prepared
locally and is not yet available from the registry. To build it for verification,
use a fresh output directory and the local tarball:

```powershell
node scripts/npm-release.mjs prepare --output artifacts/npm/1.1.0-rc.3 --tag rc --release-tag v1.1.0-rc.3
npx --yes --package ./artifacts/npm/1.1.0-rc.3/bontaflowstack-1.1.0-rc.3.tgz -- bontaflowstack setup --host claude
```

The generated package is the distributable input; the source installer directory
is not published directly. These local commands do not make the version available
from npm. The actual package/setup tests use isolated configuration and cache
directories. They do not establish authenticated Claude session acceptance or
publish a release. See the [rc.3 audit and evidence](RELEASE-1.1.0-rc.3.md).

See the [universal Windows guide](INSTALL-WINDOWS.md) for common setup, host
selection, trust, state sharing and troubleshooting.
