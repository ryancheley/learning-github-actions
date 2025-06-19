# Documentation

This directory contains automatically synchronized documentation from the repository wiki.

## How it works

When wiki pages are created or updated, the `gollum` workflow automatically:
1. Detects the wiki change
2. Fetches the wiki page content
3. Creates/updates corresponding markdown files in this directory
4. Commits the changes

This ensures documentation stays in sync between the wiki interface and the repository.