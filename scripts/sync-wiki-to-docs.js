#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

async function syncWikiToDocs() {
  try {
    // Get environment variables
    const token = process.env.GITHUB_TOKEN;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    
    if (!token || !eventPath) {
      throw new Error('Missing required environment variables: GITHUB_TOKEN, GITHUB_EVENT_PATH');
    }

    // Read the GitHub event payload
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const { repository, pages } = eventData;
    
    if (!pages || pages.length === 0) {
      console.log('No wiki pages to process');
      return;
    }

    console.log(`Processing ${pages.length} wiki page(s)`);
    
    // Initialize Octokit
    const octokit = new Octokit({ auth: token });
    
    // Process each wiki page
    for (const page of pages) {
      console.log(`Processing page: ${page.page_name}`);
      console.log(`Action: ${page.action}`);
      console.log(`SHA: ${page.sha}`);
      
      try {
        // Fetch the wiki page content
        const wikiResponse = await octokit.rest.repos.getContent({
          owner: repository.owner.login,
          repo: `${repository.name}.wiki`,
          path: `${page.page_name}.md`
        });
        
        // Decode the content
        const content = Buffer.from(wikiResponse.data.content, 'base64').toString('utf-8');
        
        // Create the docs file path
        const docsPath = path.join('docs', `${page.page_name}.md`);
        
        // Ensure docs directory exists
        const docsDir = path.dirname(docsPath);
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }
        
        // Add metadata header to the content
        const syncedContent = `---
title: ${page.title}
wiki_page: ${page.page_name}
last_updated: ${new Date().toISOString()}
wiki_sha: ${page.sha}
---

${content}`;
        
        // Write the file
        fs.writeFileSync(docsPath, syncedContent);
        console.log(`✅ Synced ${page.page_name} to ${docsPath}`);
        
      } catch (error) {
        console.error(`❌ Failed to sync ${page.page_name}:`, error.message);
        
        // If wiki page was deleted, remove the docs file
        if (error.status === 404 && page.action === 'edited') {
          const docsPath = path.join('docs', `${page.page_name}.md`);
          if (fs.existsSync(docsPath)) {
            fs.unlinkSync(docsPath);
            console.log(`🗑️ Removed deleted wiki page: ${docsPath}`);
          }
        }
      }
    }
    
    console.log('✨ Wiki sync completed successfully');
    
  } catch (error) {
    console.error('💥 Error during wiki sync:', error.message);
    process.exit(1);
  }
}

// Run the sync if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncWikiToDocs();
}

export { syncWikiToDocs };