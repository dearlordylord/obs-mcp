"""Render local issue mirrors from the reviewed catalog; performs no network writes."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT / 'catalog.json').read_text())
ITEMS = {item['key']: item for item in CATALOG['items']}
FINDINGS = json.loads((ROOT / 'dispositions.json').read_text())['findings']
TRACKER = json.loads((ROOT / 'tracker.json').read_text()) if (ROOT / 'tracker.json').exists() else {'issues': {}, 'milestones': {}}
STUDY = 'https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/'
MILESTONES = {'M1': 'OBS fidelity and visual acceptance', 'M2': 'OBS guided workflows and diagnostics'}

def link(key):
    record = TRACKER['issues'].get(key)
    return f"[#{record['number']} — {ITEMS[key]['title']}]({record['url']})" if record else ITEMS[key]['title']

def bullets(values):
    return '\n'.join('- ' + value for value in values)

def disposition_table():
    result = '| Finding | Disposition | Destination and reason |\n|---|---|---|\n'
    for row in FINDINGS:
        evidence = STUDY + row['source']
        result += f"| [{row['id']}: {row['finding']}]({evidence}) | {row['status']} | {link(row['destination'])}. {row['rationale']} |\n"
    return result

def render(item):
    stories = '\n'.join(f'{i}. As an {actor}, I want {want}, so that {benefit}.' for i, (actor, want, benefit) in enumerate(item['stories'], 1))
    # Use the grammatically appropriate article while retaining the skill's story form.
    stories = stories.replace('As an maintainer', 'As a maintainer').replace('As an new user', 'As a new user').replace('As an desktop user', 'As a desktop user').replace('As an platform user', 'As a platform user').replace('As an user,', 'As a user,').replace('As an product maintainer', 'As a product maintainer').replace('As an recording user', 'As a recording user').replace('As an show operator', 'As a show operator').replace('As an multi-PC operator', 'As a multi-PC operator').replace('As an live producer', 'As a live producer').replace('As an creator', 'As a creator').replace('As an remote operator', 'As a remote operator').replace('As an remote OBS operator', 'As a remote OBS operator')
    body = f"## Problem Statement\n\n{item['problem']}\n\n## Solution\n\n{item['solution']}\n\n## User Stories\n\n{stories}\n\n## Implementation Decisions\n\n{bullets(item['decisions'])}\n\n## Testing Decisions\n\n{bullets(item['tests'])}\n\nTests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.\n\n## Out of Scope\n\n{item['out']}\n\n## Further Notes\n\n"
    body += f"Evidence: [September comparative study]({STUDY}README.md), [local findings]({STUDY}candidates/local.md), [independent fixture audit]({STUDY}independent-review.md).\n\n"
    body += 'Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.\n\n'
    if item['key'] != 'epic':
        body += f"Parent: {link('epic')}.\n\n"
        body += 'Track: ' + (MILESTONES[item['milestone']] if item['milestone'] else 'Bounded investigation / continuation decision; no release commitment') + '.\n\n'
        body += 'Depends on: ' + (', '.join(link(key) for key in item['dependencies']) if item['dependencies'] else 'No child prerequisite; remain within the parent scope') + '.\n\n'
        body += 'Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.\n\n'
        assigned = [row['id'] for row in FINDINGS if row['destination'] == item['key']]
        body += 'Findings covered: ' + ', '.join(assigned) + '.\n'
    else:
        body += '### Delivery and continuation\n\n'
        for group in ['M1', 'M2', None]:
            body += f"**{MILESTONES.get(group, 'Bounded decisions and lifecycle audit')}**\n\n"
            for child in ITEMS.values():
                if child['key'] != 'epic' and child['milestone'] == group:
                    body += f"- [ ] {link(child['key'])}\n"
            body += '\n'
        body += 'The next action is the foundation child. After its contracts are accepted, selectors, settings and images can proceed in parallel with explicit ownership. The lifecycle audit can also proceed after foundation; mutating guided workflows depend on it. Later children stay open until delivered or explicitly superseded with a reason and successor link.\n\n'
        body += '### Complete finding disposition map\n\n'
        body += disposition_table()
        body += '\nExisting [issue #2](https://github.com/dearlordylord/obs-mcp/issues/2) remains linked for evidence-based subscription/retention reconciliation in the foundation child. It is not closed by this planning pass.\n'
    return body

def validate():
    assert len(ITEMS) == 14
    assert len(FINDINGS) == 58 and len({row['id'] for row in FINDINGS}) == len(FINDINGS)
    for row in FINDINGS:
        assert row['destination'] in ITEMS
        assert (ROOT.parent / 'obs-comparative-study-2026-09-13' / row['source']).exists(), row
    def visit(key, chain):
        assert key not in chain, ('Dependency cycle', chain, key)
        for dependency in ITEMS[key]['dependencies']:
            assert dependency in ITEMS
            visit(dependency, chain + [key])
    for key in ITEMS:
        visit(key, [])
        assert len(ITEMS[key]['stories']) >= 6
        assert len(render(ITEMS[key])) < 65000

if __name__ == '__main__':
    validate()
    (ROOT / 'issues').mkdir(exist_ok=True)
    for key, item in ITEMS.items():
        (ROOT / 'issues' / f'{key}.md').write_text(render(item))
    (ROOT / 'disposition-map.md').write_text('# OBS research disposition map\n\nEvery finding retains a destination, including preserved capabilities and reasoned rejections.\n\n' + disposition_table())
    overview = '# OBS research adoption backlog\n\n'
    overview += f"Parent: {link('epic')}.\n\nThe user approved the acceptance seam; this catalog follows the to-spec template. All {len(FINDINGS)} findings have explicit dispositions. Ready-for-agent applies to all published specs, while dependency edges and milestone scope govern execution.\n\n"
    overview += '| Work item | Track | Dependencies |\n|---|---|---|\n'
    for key, item in ITEMS.items():
        overview += f"| {link(key)} | {MILESTONES.get(item['milestone'], 'Parent tracker' if key == 'epic' else 'Bounded decision/audit')} | {', '.join(link(dep) for dep in item['dependencies']) or 'None'} |\n"
    overview += '\n[Full disposition map](disposition-map.md) · [Historical follow-through](../obs-crap4ts-follow-through-2026-09-13.md) · [Comparative study](../obs-comparative-study-2026-09-13/README.md)\n'
    (ROOT / 'README.md').write_text(overview)
    print(f'Rendered {len(ITEMS)} specs, {sum(len(item["stories"]) for item in ITEMS.values())} stories, {len(FINDINGS)} dispositions; dependency graph is acyclic.')
