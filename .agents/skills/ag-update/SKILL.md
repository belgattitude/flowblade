---
name: ag-update
description: Update AG Grid, AG Charts and AG Studio dependencies to a newer version
---

## Rules

- Do not make use of the codemod or MCP server, or suggest their use or installation. They are not relevant to the task you are now completing
- Follow the process documented below exactly
- If you are instructed "Tell the user X" then show the message to the user and **continue**.
- If you are instructed "Ask the user X" then show the question to the user and **stop**. Do not continue until you receive a response. If you have a tool available designed to ask the user a question you may use it.
- This skill consists of a set of sequential steps, each of which writes a file with results. Ensure that the file is written before moving on to the next step. DO NOT combine steps, or refer to information in future steps while handling a previous step.

## Explain process to user

Tell the user "Welcome to the AG Update skill. Let's start by gathering some context on your application"

## Version check

- Read `VERSION.md` in this skill folder. Fetch the latest: `https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md`.
- Compare as semver:
  - If the local version is the same as, or newer than, the fetched version: continue silently.
  - If the local version is older and only the patch or minor differs: Prominently tell the user that a new version has been released, show the new and currently installed version, suggest quitting the harness and running `npx skills update ag-grid/skills`. Ask the user if they'd like to continue with this old skill version, suggesting they type "continue" to do so.
  - If the local version is older and the major differs: Prominently tell the user that their current skill version is incompatible and will not work, show the new and currently installed version, tell them to quit the harness and run `npx skills update ag-grid/skills` before resuming. Stop. The skill invocation is now finished. Regardless of the user response, do not follow any of the other instructions in this file.

## Check for existing plan

- Look for files matching `AG_UPDATE_*.md` in the current directory
- If any exist, then ask the user whether they'd like to start fresh and delete these files or resume.
  - If they select start fresh, delete the `AG_UPDATE_*.md` files
  - If they select resume, continue with the skill and skip the stages for which the files have already been generated

## Determine scope

This section populates the AG_UPDATE_SCOPE.md file

1. Determine the full set of potential projects to update. There are instructions in the file `references/determine-scope.md`. If you have access to sub-agents, give that file path to a sub-agent and ask it to report the results to you. Otherwise follow the steps yourself. If this skill was invoked with instructions to upgrade specific projects, pass that to the sub agent.
2. Determine which of the three products — grid, charts and studio — are in use. **Refer only to the products actually installed**, in every message from here on. There is no need to confuse the process by referring to a product that the user does not have installed.
3. Determine the latest versions of the product(s) in use with `npm view ag-grid-community version`, `npm view ag-charts-community version` and/or `npm view ag-studio version`
4. Tell the user which projects you found, what current versions they're on, and the latest version you propose updating to. Ask them if they'd like to continue, giving them the option to change the target version, or select a subset of projects if applicable.
5. Record the user's decisions in AG_UPDATE_SCOPE.md before continuing. Under `## Projects to update` record the projects and dependencies in exactly the same 2-level markdown list format as it was generated in, removing any projects that the user indicated that they did not want to update. Under `## Target versions` record the target version of grid and/or charts to update to.

## Warn on unsupported versions

The earliest supported major version to migrate _from_ is 25 for grid, 8 for charts and 1 for studio. If the application uses earlier versions, **stop** the skill execution and tell the user why (it is because this skill only has change information going back to these versions).

## Determine the full set of changes

This stage populates the AG_UPDATE_CHANGES.md file

1. Determine the full set of potential changes to make. There are instructions in the file `references/determine-changes.md`. If you have access to sub-agents, give that file path to a sub-agent and it will write the results to AG_UPDATE_CHANGES.md. Otherwise follow the steps yourself. Pass the sub-agent the path to AG_UPDATE_SCOPE.md
2. Write the results verbatim to AG_UPDATE_CHANGES.md before continuing to the next step.

## Trim behaviour changes

For behaviour changes there is a choice about whether to do nothing and accept the change, or apply a mitigation to restore the old behaviour. The user must make this decision.

1. Extract the changes tagged BEHAVIOUR in AG_UPDATE_CHANGES.md
2. Count them and tell the user "There are $COUNT behaviour changes, in each case I need to know whether to accept the new behaviour or restore the old behaviour"
3. Show the behaviour changes to the user (only the description, not the mitigation)
4. Offer to explain any behaviour change in more detail, and ask the user which behaviour changes to accept and which to mitigate (NOTE: if there are many do this as a plain conversation, avoid using any tools to ask the user this question)
5. Once you have the user's response, edit the AG_UPDATE_CHANGES.md file to remove all behaviour changes that the user wants to accept, leaving only the ones to mitigate.
6. If any behaviour changes remain, add a section to the end of the AG_UPDATE_CHANGES.md file `# Validation` with the text content "All changes marked "BEHAVIOUR" are optional changes that the user has decided to apply. Double-check, using a sub-agent if available, that they have all been applied because tests/typechecking may not fail if the change has not been applied."

## Report completion to the user

Tell the user that the file is now ready to apply and give them the path to AG_UPDATE_CHANGES.md.

Show this text verbatim:

```
For best results we suggest that you start a new agent session or clear the context of this one, and prompt your agent to plan an update based on the changes listed in AG_UPDATE_CHANGES.md.

This skill is under active development, please report issues to https://github.com/ag-grid/skills/issues or report your results and share ideas at https://github.com/ag-grid/skills/discussions
```
