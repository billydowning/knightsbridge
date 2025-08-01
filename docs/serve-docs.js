#!/usr/bin/env node

/**
 * Simple Node.js script to serve markdown documentation as HTML
 * Usage: node serve-docs.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked') || require('markdown-it')();

const PORT = process.argv[2] || 3000;

// Simple CSS for styling
const CSS = `
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: #fff;
  }
  
  .docs-nav {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    border: 1px solid #e9ecef;
  }
  
  .docs-nav h3 {
    margin: 0 0 1rem 0;
    color: #495057;
  }
  
  .docs-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
  }
  
  .docs-nav a {
    color: #007bff;
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 6px;
    display: block;
    transition: background 0.2s;
  }
  
  .docs-nav a:hover {
    background: #e3f2fd;
  }
  
  h1, h2, h3 { color: #2c3e50; }
  h1 { border-bottom: 3px solid #007bff; padding-bottom: 0.5rem; }
  h2 { border-bottom: 1px solid #e9ecef; padding-bottom: 0.3rem; }
  
  code {
    background: #f1f3f4;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: #1e1e1e;
    color: #f8f8f2;
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    border: 1px solid #333;
  }
  
  pre code {
    background: none;
    padding: 0;
    color: inherit;
  }
  
  blockquote {
    border-left: 4px solid #007bff;
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border-radius: 0 6px 6px 0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  
  th, td {
    border: 1px solid #dee2e6;
    padding: 0.75rem;
    text-align: left;
  }
  
  th {
    background: #f8f9fa;
    font-weight: 600;
  }
  
  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    margin: 0.5rem 0.5rem 0.5rem 0;
    transition: background 0.2s;
  }
  
  .btn:hover {
    background: #0056b3;
  }
  
  .alert {
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 6px;
    border: 1px solid;
  }
  
  .alert-info {
    background: #e3f2fd;
    border-color: #1976d2;
    color: #0d47a1;
  }
  
  .footer {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e9ecef;
    text-align: center;
    color: #6c757d;
    font-size: 0.9rem;
  }
</style>
`;

// Navigation menu
const NAVIGATION = `
<div class="docs-nav">
  <h3>📚 Knightsbridge Chess Documentation</h3>
  <ul>
    <li><a href="/">🏠 Overview</a></li>
    <li><a href="/game-rules">♟️ Game Rules</a></li>
    <li><a href="/getting-started">🚀 Getting Started</a></li>
    <li><a href="/blockchain-integration">⛓️ Blockchain</a></li>
    <li><a href="/smart-contracts">📜 Smart Contracts</a></li>
    <li><a href="/technical-architecture">🏗️ Architecture</a></li>
    <li><a href="/developer-guide">👨‍💻 Developer Guide</a></li>
    <li><a href="/security">🔒 Security</a></li>
    <li><a href="/faq">❓ FAQ</a></li>
  </ul>
</div>
`;

// Convert markdown file to HTML
function markdownToHtml(filePath) {
  try {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const html = marked ? marked.parse(markdown) : markdown;
    
    return \`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Knightsbridge Chess Documentation</title>
  \${CSS}
</head>
<body>
  \${NAVIGATION}
  <main>
    \${html}
  </main>
  <footer class="footer">
    <p>Built with ♟️ on Solana • <a href="https://github.com/knightsbridge-chess">GitHub</a></p>
  </footer>
</body>
</html>
    \`;
  } catch (error) {
    return \`
<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>File not found</h1>
  <p>The requested documentation page could not be found.</p>
  <a href="/">← Back to documentation home</a>
</body>
</html>
    \`;
  }
}

// Simple HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  
  let filePath;
  if (req.url === '/' || req.url === '/index') {
    filePath = path.join(__dirname, 'index.md');
  } else {
    const fileName = req.url.slice(1) + '.md';
    filePath = path.join(__dirname, fileName);
  }
  
  const html = markdownToHtml(filePath);
  res.end(html);
});

server.listen(PORT, () => {
  console.log(\`📚 Knightsbridge Chess Documentation Server\`);
  console.log(\`🌐 Running at http://localhost:\${PORT}\`);
  console.log(\`📖 Available pages:\`);
  console.log(\`   • http://localhost:\${PORT}/ (Overview)\`);
  console.log(\`   • http://localhost:\${PORT}/game-rules\`);
  console.log(\`   • http://localhost:\${PORT}/getting-started\`);
  console.log(\`   • http://localhost:\${PORT}/blockchain-integration\`);
  console.log(\`   • http://localhost:\${PORT}/smart-contracts\`);
  console.log(\`   • http://localhost:\${PORT}/technical-architecture\`);
  console.log(\`   • http://localhost:\${PORT}/developer-guide\`);
  console.log(\`   • http://localhost:\${PORT}/security\`);
  console.log(\`   • http://localhost:\${PORT}/faq\`);
  console.log(\`\`);
  console.log(\`💡 Install marked for better rendering: npm install marked\`);
});