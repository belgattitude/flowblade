// skills-npm.config.ts
import { defineConfig } from 'skills-npm'

export default defineConfig({
    // Source to discover skills from: 'node_modules' or 'package.json'
    source: 'package.json',
    // Target specific agents (defaults to all detected agents)
    // agents: ['cursor'],
    // Scan recursively for monorepo packages (default: false)
    recursive: true,
    // Skip confirmation prompts (default: false)
    yes: false,
    // Dry run mode (default: false)
    dryRun: false,
    // Fetch remote skills from `skills` fields (default: true); false for offline installs
    remote: true,
    // Include specific packages or skills
    include: [
        // Include all skills from a package
        //'@some/package',
        // Include all skills from packages matching a wildcard pattern
        //'@some/*',
        // Include specific skills from packages matching a wildcard pattern
        //{ package: '@some/*', skills: ['integration'] },
        // Include specific skills from a package
        //{ package: '@slidev/cli', skills: ['presenter-mode'] },
    ],
    // Exclude specific packages or skills
    exclude: [
        { package: '@reduxjs/toolkit', skills: ['*'] },
        { package: 'react-doctor', skills: ['improve-threejs'] },
    ],
})