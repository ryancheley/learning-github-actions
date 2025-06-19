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
    console.log('Event data:', JSON.stringify(eventData, null, 2));
    
    // Initialize Octokit
    const octokit = new Octokit({ auth: token });
    
    // Process each wiki page
    for (const page of pages) {
      console.log(`Processing page: ${page.page_name}`);
      console.log(`Action: ${page.action}`);
      console.log(`SHA: ${page.sha}`);
      
      try {
        console.log(`Attempting to fetch wiki content for: ${page.page_name}`);
        console.log(`HTML URL: ${page.html_url}`);
        
        // Try to fetch the raw content using different methods
        let content = '';
        try {
          // Try using git API to get the blob content directly
          const blobResponse = await octokit.rest.git.getBlob({
            owner: repository.owner.login,
            repo: `${repository.name}.wiki`,
            file_sha: page.sha
          });
          content = Buffer.from(blobResponse.data.content, 'base64').toString('utf-8');
          console.log('✅ Successfully fetched content using git blob API');
        } catch (blobError) {
          console.log(`Git blob fetch failed: ${blobError.message}`);
          
          try {
            // Fallback: Try repos.getContent
            const wikiResponse = await octokit.rest.repos.getContent({
              owner: repository.owner.login,
              repo: `${repository.name}.wiki`,
              path: `${page.page_name}.md`
            });
            content = Buffer.from(wikiResponse.data.content, 'base64').toString('utf-8');
            console.log('✅ Successfully fetched content using repos API');
          } catch (reposError) {
            console.log(`Repos API fetch failed: ${reposError.message}`);
            console.log(`Creating placeholder content...`);
            
            // Alternative: Create placeholder content with available info
            content = `# ${page.title}

> **Note**: This page was automatically synced from the wiki but the content could not be retrieved.

**Wiki Details:**
- Page Name: ${page.page_name}
- Action: ${page.action}
- SHA: ${page.sha}
- View on Wiki: [${page.title}](${page.html_url})

*Please edit this page directly or update the wiki to add content.*`;
          }
        }
        
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