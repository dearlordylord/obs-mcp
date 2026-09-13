"""Render draft or published ticket mirrors. This script never writes to GitHub."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
catalog = json.loads((ROOT / "catalog.json").read_text())
tickets = catalog["tickets"]
tracker = json.loads((ROOT.parent / "obs-research-backlog-2026-09-13/tracker.json").read_text())
specs = tracker["issues"]
by_id = {t["id"]: t for t in tickets}
assert len(by_id) == len(tickets)
parents = {v["number"]: v for v in specs.values()}
published = catalog["status"] == "published"
publication = json.loads((ROOT / "tracker.json").read_text()) if published else None

def filename(t):
    return f'{t["id"]:02d}.md'

def blocker(b, prefix=""):
    if isinstance(b, int):
        t = by_id[b]
        if published:
            return f'[{t["title"]}]({publication["issues"][str(b)]["url"]})'
        return f'[{t["title"]}]({prefix}{filename(t)})'
    p = specs[b]
    return f'[{p["title"]}]({p["url"]})'

for t in tickets:
    assert t["parent"] in parents and t["criteria"]
    for b in t["blockedBy"]:
        assert (b in by_id and b < t["id"]) if isinstance(b, int) else b in specs

out = ROOT / "issues"
out.mkdir(exist_ok=True)
for t in tickets:
    p = parents[t["parent"]]
    body = '' if published else f'# {t["title"]}\n\nStatus: Draft awaiting breakdown approval; not published.\n\n'
    body += f'## Parent\n\n[{p["title"]}]({p["url"]})\n\n'
    body += f'## What to build\n\n{t["delivers"]}\n\n'
    body += '## Acceptance criteria\n\n' + '\n'.join(f'- [ ] {c}' for c in t["criteria"]) + '\n\n'
    body += '## Blocked by\n\n' + ('\n'.join('- ' + blocker(b) for b in t["blockedBy"]) or 'None (can start immediately).') + '\n'
    (out / filename(t)).write_text(body)

body = '''# OBS first-milestone ticket breakdown — review draft

Status: Awaiting user approval of granularity and dependencies. No implementation tickets have been published.

Scope: Decompose the five existing **OBS fidelity and visual acceptance** workstream specifications. The later milestone, investigations and all 58 finding dispositions remain in the existing backlog.

The draft contains 16 development/verification tasks and two operational acceptance/release tasks. Tickets are linked beneath their existing workstream specifications after approval. Existing issue bodies, labels, milestones and states are not changed by ticket publication.

## Execution boundaries

- The existing foundation workstream remains the gate for feature implementation. Complete and reconcile its five child slices before the gate is satisfied. This retains the published dependency contract; no child is blocked by its own parent.
- The installed-workflow integration retains the existing release workstream's foundation, selector, settings and image gates. These are workstream completion dependencies; implementation tickets also show their narrower dependencies where applicable.
- Settings families can proceed independently after the shared public contract is recorded. Shared helper ownership is an integration concern, not a filter-first dependency.
- Every feature slice includes public schema/result behavior, request forwarding, controlled OBS state assertions and documentation. No separate schema-only, operation-only or test-only layer tickets are introduced.
- Reuse existing installed-package, protocol and HTTP seams. Historical benchmark snapshots remain immutable. Actual rendering and save-topology claims require the separate real OBS/client check.
- Real OBS access and maintainer release authorization are explicit external gates. Plan approval does not authorize npm publication.
- A future orchestrator must select approved implementation children, not broad workstream specs merely because they share the ready-for-agent label. It must retain blockers, evidence and next actions in the tracker when handing off.

## Proposed tickets

'''
for t in tickets:
    bs = '; '.join(blocker(b, 'issues/') for b in t["blockedBy"]) or 'None'
    body += f'{t["id"]}. **[{t["title"]}](issues/{filename(t)})**\n\n'
    body += f'   Blocked by: {bs}.\n\n   Delivers: {t["delivers"]}\n\n'
body += '''## Coverage and review

| Existing workstream | Draft tickets |
|---|---|
| Foundation: contracts, baseline, fixture, field parity, subscriptions | 1–5 |
| Scene and canvas selectors, including batches | 6–8 |
| Full-fidelity filter, output and transition settings | 9–11 |
| Native images, retention compatibility, save topology and format disposition | 12–13 |
| Installed workflow, exact candidate, registry/retry, real visual acceptance, release evidence | 14–18 |

Initial unblocked work: current contracts/baseline, installed baseline acceptance, and field-aware audit (1, 2, 4). Subscription/retention verification follows the recorded contract (5 follows 1); fault acceptance follows the installed baseline (3 follows 2).

Review basis: full current GitHub bodies and comments for the epic, five milestone specifications and existing subscription issue; current package smoke, parity audit, publication paths and relevant implementation seams. Source baseline is recorded in the catalog. Two Sol medium agents independently reviewed feature slicing and foundation/release coverage. Their corrections are incorporated before submitting this breakdown.

Publication checkpoint: to-tickets requires approval of ticket granularity and genuine blocking edges before creating issues. After approval, create children with ready-for-agent and the existing milestone, replace local dependency links with tracker links, wire native sub-issue/dependency relationships, and verify the resulting bodies and graph. Preserve existing parent issues.
'''
(ROOT / 'README.md').write_text(body)
if published:
    body = body.replace('ticket breakdown — review draft', 'implementation tickets')
    body = body.replace('Status: Awaiting user approval of granularity and dependencies. No implementation tickets have been published.', 'Status: User approved the full breakdown; all 18 tickets are published with verified native parent links and dependencies. See [publication record](tracker.json) and [verification](verification.json).')
    body = body.replace('The draft contains', 'The backlog contains').replace('specifications after approval.', 'specifications.').replace('## Proposed tickets', '## Published tickets').replace('| Draft tickets |', '| Tickets |')
    body = body.replace('Publication checkpoint: to-tickets requires approval of ticket granularity and genuine blocking edges before creating issues. After approval, create children with ready-for-agent and the existing milestone, replace local dependency links with tracker links, wire native sub-issue/dependency relationships, and verify the resulting bodies and graph. Preserve existing parent issues.', 'Publication completed after user approval. All children carry ready-for-agent and the existing milestone; bodies, native parent relationships and blocking edges were read back and verified. Existing issue bodies, labels, milestones, assignees and states were preserved. Ticket publication does not start implementation or authorize an npm release.')
    for t in tickets:
        body = body.replace(f'(issues/{filename(t)})', f'({publication["issues"][str(t["id"])]["url"]})')
    (ROOT / 'README.md').write_text(body)
print(f'Validated and rendered {len(tickets)} {"published" if published else "draft"} tickets; no tracker writes.')
