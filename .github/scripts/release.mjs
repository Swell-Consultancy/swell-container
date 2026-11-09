import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function releaseType(labels) {
  const selected = labels.map(({ name }) => name).filter((name) => name.startsWith('release:'));
  if (selected.length > 1) throw new Error('Conflicting release labels');
  if (selected.some((name) => !['release:minor', 'release:major'].includes(name))) {
    throw new Error('Only release:minor and release:major are supported; omit labels for patch');
  }
  return selected[0]?.slice('release:'.length) ?? 'patch';
}

export function nextVersion(latest, type) {
  if (!/^\d+\.\d+\.\d+$/.test(latest)) throw new Error(`Invalid latest npm version: ${latest}`);
  const [major, minor, patch] = latest.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export async function release({ event, repository, token, packageName, fetchImpl = fetch,
  run = (command, args) => execFileSync(command, args, { stdio: 'inherit' }) }) {
  const pr = event.pull_request;
  if (event.action !== 'closed' || !pr?.merged || pr.base.ref !== 'main') {
    throw new Error('Releases require a merged PR into main');
  }
  const type = releaseType(pr.labels);
  const sha = pr.merge_commit_sha;
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid merge commit SHA');

  async function github(path, method = 'GET', body) {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (method === 'GET' && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status}`);
    return response.json();
  }

  // The full registry document preserves gitHead for every published version,
  // allowing retries even after another PR has advanced npm's latest tag.
  const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
  if (!response.ok) throw new Error(`npm registry: ${response.status}`);
  const metadata = await response.json();
  const published = Object.values(metadata.versions).filter((entry) => entry.gitHead === sha);
  if (published.length > 1) throw new Error('Multiple npm versions already reference this merge');
  const version = published[0]?.version ?? nextVersion(metadata['dist-tags'].latest, type);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version');
  const tag = `v${version}`;
  const existingTag = await github(`git/ref/tags/${tag}`);
  if (existingTag && (existingTag.object.type !== 'commit' || existingTag.object.sha !== sha)) {
    throw new Error(`${tag} already points to a different commit`);
  }
  if (!published.length) {
    if (metadata.versions[version]) throw new Error(`${version} already exists on npm`);
    if (existingTag) throw new Error(`${tag} exists without a matching npm publication`);
    // Change only the runner's package.json: no commit, version hook, or automatic tag.
    run('npm', ['version', version, '--no-git-tag-version', '--ignore-scripts']);
    run('pnpm', ['build']);
    run('pnpm', ['exec', 'publint']);
    run('pnpm', ['exec', 'attw', '--pack']);
    run('npm', ['publish', '--access', 'public', '--registry', 'https://registry.npmjs.org/',
      '--provenance', '--ignore-scripts']);
  }
  if (!existingTag) await github('git/refs', 'POST', { ref: `refs/tags/${tag}`, sha });
  if (!await github(`releases/tags/${tag}`)) {
    await github('releases', 'POST', { tag_name: tag, name: tag, generate_release_notes: true,
      // Retrying an old release must not move GitHub's latest release backwards.
      make_latest: 'legacy' });
  }
  console.log(`Released ${packageName}@${version} from PR #${pr.number}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (process.argv.includes('--check-labels')) releaseType(event.pull_request.labels);
  else {
    if (process.env.GITHUB_EVENT_NAME !== 'pull_request_target') throw new Error('Expected pull_request_target event');
    await release({ event, repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN,
      packageName: JSON.parse(readFileSync('package.json', 'utf8')).name });
  }
}
