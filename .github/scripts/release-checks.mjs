import assert from 'node:assert/strict';
import test from 'node:test';
import { nextVersion, release, releaseType } from './release.mjs';

const labels = (...names) => names.map((name) => ({ name }));
const sha = 'a'.repeat(40);

function fixture() {
  const state = {
    event: { action: 'closed', pull_request: { number: 1, merged: true,
      base: { ref: 'main' }, merge_commit_sha: sha, labels: labels('release:minor') } },
    metadata: { 'dist-tags': { latest: '0.0.12' }, versions: { '0.0.12': { version: '0.0.12' } } },
    tag: null, githubRelease: null, commands: [], writes: [], failTag: false, failPublish: false,
  };
  state.execute = () => release({ event: state.event, repository: 'owner/repo',
    token: 'test', packageName: '@test/container',
    fetchImpl: async (url, options = {}) => {
      if (url.startsWith('https://registry.npmjs.org/')) return Response.json(state.metadata);
      const path = url.split('/repos/owner/repo/')[1];
      if (options.method === 'POST') {
        state.writes.push(path);
        const body = JSON.parse(options.body);
        if (path === 'git/refs') {
          if (state.failTag) return new Response(null, { status: 503 });
          state.tag = { object: { type: 'commit', sha: body.sha } };
        } else state.githubRelease = body;
        return Response.json(body, { status: 201 });
      }
      const value = path.startsWith('git/ref/') ? state.tag : state.githubRelease;
      return value ? Response.json(value) : new Response(null, { status: 404 });
    },
    run: (command, args) => {
      state.commands.push([command, ...args]);
      if (command === 'npm' && args[0] === 'version') state.version = args[1];
      if (command === 'npm' && args[0] === 'publish') {
        if (state.failPublish) throw new Error('Publish failed');
        state.metadata.versions[state.version] = { version: state.version, gitHead: sha };
        state.metadata['dist-tags'].latest = state.version;
      }
    },
  });
  return state;
}

test('label selection and semver, including the first minor release', () => {
  for (const [names, type, version] of [[[], 'patch', '0.0.13'],
    [['release:minor'], 'minor', '0.1.0'], [['release:major'], 'major', '1.0.0']]) {
    assert.equal(releaseType(labels('documentation', ...names)), type);
    assert.equal(nextVersion('0.0.12', type), version);
  }
  assert.throws(() => releaseType(labels('release:minor', 'release:major')), /Conflicting/);
  assert.throws(() => releaseType(labels('release:patch')), /supported/);
  assert.throws(() => nextVersion('0.1.0-beta.1', 'patch'), /Invalid/);
});

test('publishes once, creates the exact merge tag and release, then reruns without writes', async () => {
  const state = fixture();
  await state.execute();
  assert.equal(state.version, '0.1.0');
  assert.equal(state.tag.object.sha, sha);
  assert.equal(state.githubRelease.tag_name, 'v0.1.0');
  assert.deepEqual(state.commands.map((entry) => entry.slice(0, 2)), [
    ['npm', 'version'], ['pnpm', 'build'], ['pnpm', 'exec'], ['pnpm', 'exec'], ['npm', 'publish'],
  ]);
  state.commands = []; state.writes = [];
  await state.execute();
  assert.deepEqual(state.commands, []);
  assert.deepEqual(state.writes, []);
});

test('recovers after npm succeeds but tag creation fails, even after latest advances', async () => {
  const state = fixture();
  state.failTag = true;
  await assert.rejects(state.execute(), /503/);
  state.failTag = false;
  state.metadata['dist-tags'].latest = '0.2.0';
  state.commands = [];
  await state.execute();
  assert.deepEqual(state.commands, []);
  assert.equal(state.githubRelease.tag_name, 'v0.1.0');
});

test('rejects conflicting labels, unmerged/wrong-base PRs and tag collisions before publishing', async () => {
  for (const mutate of [
    (s) => { s.event.pull_request.labels = labels('release:minor', 'release:major'); },
    (s) => { s.event.pull_request.merged = false; },
    (s) => { s.event.pull_request.base.ref = 'develop'; },
    (s) => { s.tag = { object: { type: 'commit', sha: 'b'.repeat(40) } }; },
  ]) {
    const state = fixture();
    mutate(state);
    await assert.rejects(state.execute());
    assert.deepEqual(state.commands, []);
    assert.deepEqual(state.writes, []);
  }
});

test('recovers a missing GitHub Release without republishing or recreating its tag', async () => {
  const state = fixture();
  await state.execute();
  state.githubRelease = null; state.commands = []; state.writes = [];
  await state.execute();
  assert.deepEqual(state.commands, []);
  assert.deepEqual(state.writes, ['releases']);
});

test('a failed npm publication never creates a tag or GitHub Release', async () => {
  const state = fixture();
  state.failPublish = true;
  await assert.rejects(state.execute(), /Publish failed/);
  assert.deepEqual(state.writes, []);
});
