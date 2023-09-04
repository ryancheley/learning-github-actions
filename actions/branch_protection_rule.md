This doesn't seem to be used in any sort of way that makes sense to me at this point. 

The examples (liked below) all show a file named `scorecard` or some derivation of that. It seems like the `branch_protection_rule` is used mostly in the context of checking supply chain security. 

All but one of the examples (as of September 4, 2023) have other workflow events (usually `scheduled` and `push` so it doesn't really give me a good sense of **why** you'd want to have this rule. 

The [one example]([url](https://github.com/luisrapestre/GitHub-Microsoft/blob/53b661989bd30b05e5606826ff65e008b2047a30/11-test-with-actions-main/.github/workflows/4-add-branch-protections.yml#L11)) that doesn't includes only `branch_protection_rule` and `workflow_displatch` looks like this:

```yaml
name: Step 4, Add branch protections

# This step triggers after we turn on or edit a branch protection rule
# This step sets STEP to 5
# This step closes <details id=4> and opens <details id=5>

# This will run every time we turn on or edit a branch protection rule
# Reference https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows
on:
  workflow_dispatch:
  branch_protection_rule:
    types:
      - created
      - edited
    branches:
      - main

# Reference https://docs.github.com/en/actions/security-guides/automatic-token-authentication
permissions:
  # Need `contents: read` to checkout the repository
  # Need `contents: write` to update the step metadata
  contents: write

jobs:
  # Get the current step from .github/script/STEP so we can
  # limit running the main job when the learner is on the same step.
  get_current_step:
    name: Check current step number
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - id: get_step
        run: |
          echo "current_step=$(cat ./.github/script/STEP)" >> $GITHUB_OUTPUT
    outputs:
      current_step: ${{ steps.get_step.outputs.current_step }}

  on_update_branch_protection:
    name: On update branch protection
    needs: get_current_step

    # We will only run this action when:
    # 1. This repository isn't the template repository
    # 2. The STEP is currently 4
    # Reference https://docs.github.com/en/actions/learn-github-actions/contexts
    # Reference https://docs.github.com/en/actions/learn-github-actions/expressions
    if: >-
      ${{ !github.event.repository.is_template
          && needs.get_current_step.outputs.current_step == 4 }}

    # We'll run Ubuntu for performance instead of Mac or Windows
    runs-on: ubuntu-latest

    steps:
      # We'll need to check out the repository so that we can edit the README
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Let's get all the branches
          ref: ci # Important, as normally `branch_protection_rule` event won't grab other branches

      # TODO: figure out a better way to deal with the lock on `main`, merge conflict this creates
      # Update README to close <details id=4> and open <details id=5>
      # and set STEP to '5'
      # - name: Update to step 5
      #   uses: skills/action-update-step@v1
      #   with:
      #     token: ${{ secrets.GITHUB_TOKEN }}
      #     from_step: 4
      #     to_step: 5
      #     branch_name: ci
```

Examples of the branch_protection_rule can be found [here]([url](https://github.com/search?q=%22branch_protection_rule%3A%22+%28path%3A*.yml+OR+path%3A*.yaml%29+path%3A%2F.github%2Fworkflows+language%3AYAML+&type=code)https://github.com/search?q=%22branch_protection_rule%3A%22+%28path%3A*.yml+OR+path%3A*.yaml%29+path%3A%2F.github%2Fworkflows+language%3AYAML+&type=code)

