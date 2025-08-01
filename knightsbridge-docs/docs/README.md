# Knightsbridge Chess Documentation

This directory contains comprehensive documentation for the Knightsbridge Chess platform.

## 📁 Documentation Structure

- **[index.md](./index.md)** - Main documentation portal (start here)
- **[game-rules.md](./game-rules.md)** - Complete chess rules and mechanics
- **[getting-started.md](./getting-started.md)** - Step-by-step player guide
- **[blockchain-integration.md](./blockchain-integration.md)** - How Solana powers the game
- **[smart-contracts.md](./smart-contracts.md)** - Smart contract technical details
- **[technical-architecture.md](./technical-architecture.md)** - System design overview
- **[developer-guide.md](./developer-guide.md)** - Contributing and development
- **[security.md](./security.md)** - Security measures and risk management
- **[faq.md](./faq.md)** - Frequently asked questions

## 🚀 Serving the Documentation

### Option 1: Static Site Generator (Recommended)

#### Using Docusaurus
```bash
npx create-docusaurus@latest knightsbridge-docs classic
# Copy markdown files to docs/ directory
# Configure docusaurus.config.js
npm start
```

#### Using GitBook
1. Create GitBook account
2. Import repository
3. Configure navigation
4. Publish to custom domain

#### Using VitePress
```bash
npm init vitepress knightsbridge-docs
# Configure .vitepress/config.js
# Copy markdown files
npm run dev
```

### Option 2: Simple Static Server

#### Using Python
```bash
# Convert markdown to HTML first
pip install markdown
python -c "
import markdown
import os
for file in os.listdir('.'):
    if file.endswith('.md'):
        with open(file, 'r') as f:
            html = markdown.markdown(f.read())
            with open(file.replace('.md', '.html'), 'w') as out:
                out.write(html)
"

# Serve
python -m http.server 3000
```

#### Using Node.js
```bash
npx serve .
```

### Option 3: GitHub Pages

1. Push docs to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to docs/ folder
4. Access at `https://username.github.io/repository-name/`

## 🎨 Styling Recommendations

For a professional look similar to Kamino Finance docs:

### CSS Additions
```css
/* Add to documentation styling */
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #333;
}

.docs-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.docs-nav {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

code {
  background: #f1f3f4;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

pre {
  background: #1e1e1e;
  color: #fff;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
```

### Navigation Structure
```yaml
# Suggested navigation for static site generators
nav:
  - Overview: index.md
  - Getting Started:
    - Game Rules: game-rules.md
    - Player Guide: getting-started.md
  - Technical:
    - Blockchain Integration: blockchain-integration.md
    - Smart Contracts: smart-contracts.md
    - Architecture: technical-architecture.md
  - Development:
    - Developer Guide: developer-guide.md
    - Security: security.md
  - Support:
    - FAQ: faq.md
```

## 🔗 Integration with Frontend

The frontend menu already includes a link to `/docs`. Configure your web server to serve the documentation at this path:

### Nginx Configuration
```nginx
location /docs {
    alias /path/to/docs/build;
    try_files $uri $uri/ /index.html;
}
```

### Express.js Integration
```javascript
// Serve static docs
app.use('/docs', express.static(path.join(__dirname, 'docs/build')));
```

## 📝 Updating Documentation

When updating docs:

1. Edit the relevant markdown files
2. Test locally with your chosen documentation platform
3. Deploy changes to production
4. Update any navigation links if adding new sections

## 🤝 Contributing to Documentation

- Follow the existing tone and structure
- Include code examples where helpful
- Add screenshots for complex UI interactions
- Keep language clear and accessible
- Test all links and code snippets

---

**Choose your preferred documentation platform and get started!** 🚀