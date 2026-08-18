#!/bin/sh
# Copy the tracked hooks in scripts/git-hooks/ into .git/hooks/, where git
# actually looks. Re-run after editing any of them – git never reads the
# tracked copy.
#
# Safe to run repeatedly. Refuses to clobber a hook it did not write, so a
# hook you added by hand is never silently replaced.
set -e

root=$(git rev-parse --show-toplevel)
src="$root/scripts/git-hooks"
dst="$(git rev-parse --git-dir)/hooks"
marker='scripts/git-hooks'

[ -d "$src" ] || { echo "no scripts/git-hooks directory"; exit 1; }
mkdir -p "$dst"

for hook in "$src"/*; do
  [ -f "$hook" ] || continue
  name=$(basename "$hook")
  target="$dst/$name"

  if [ -e "$target" ] && ! grep -q "$marker" "$target" 2>/dev/null; then
    echo "SKIPPED $name – a hook is already there and this script did not write it."
    echo "        Move it aside and re-run if you want ours."
    continue
  fi

  cp "$hook" "$target"
  chmod +x "$target"
  echo "installed $name"
done
