Follow these steps to determine the full set of projects, products and AG dependency versions that can be updated in a repo.

## Output

The goal of this process is to produce a 2-level markdown list of projects, and under each project a list of package.json ag dependencies in use.

Example of expected output format:

- path/to/project/a
  - ag-dependency-name@current-version
  - ag-dependency-name@current-version
- path/to/project/b
  - ag-dependency-name@current-version

Do not include any other information in the output

## Steps

- Determine the projects to operate on. A "project" is a folder containing a package.json.
  - If you were provided with a list of projects, use it
  - Otherwise, recursively find all projects in the current directory that contain dependencies starting "@ag-grid-", "ag-grid-", "ag-charts-" or "ag-studio". Ignore projects that are not part of the software in this folder, e.g. inside node_modules and build artefacts. Show these projects to the user and ask them which they want to update.
- Determine the dependency versions in use for each project
  - The version can be determined from package.json if an explicit version like "31.2.0" is used, otherwise use the package manager to determine what actual version is installed.
