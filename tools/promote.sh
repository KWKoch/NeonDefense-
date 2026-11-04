#!/usr/bin/env bash
# Promote a tested commit from this repo into the separate production repo.
#   tools/promote.sh <tested-ref> <path to a clone of NeonDefense-Production> <version tag, e.g. v1.0.0>
# Copies the exact source at <tested-ref> over the clone (deleting files that no longer exist), swaps in the production workflow,
# commits, and tags. It does NOT push: look at `git -C <clone> show --stat` first, then push the branch and tag yourself.
set -euo pipefail
ref=${1:?tested ref (branch, tag or commit)}; dest=${2:?path to the production repo clone}; tag=${3:?version tag like v1.0.0}
[ -d "$dest/.git" ] || { echo "not a git clone: $dest"; exit 1; }
sha=$(git rev-parse --short "$ref")
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
git archive "$ref" | tar -x -C "$tmp"
rm -rf "$tmp/.github"; mkdir -p "$tmp/.github/workflows"; cp "$tmp/production/release.yml" "$tmp/.github/workflows/release.yml"
find "$dest" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
rm -f "$tmp/CNAME"   # never carry the live-site domain into the production repo
cp -a "$tmp"/. "$dest"/
git -C "$dest" add -A
git -C "$dest" commit -q -m "Release $tag: promoted from NeonDefense- @ $sha" || echo "nothing changed since the last release"
git -C "$dest" tag -a "$tag" -m "Release $tag (source $sha)"
echo "Ready. Review, then: git -C $dest push origin HEAD $tag"
