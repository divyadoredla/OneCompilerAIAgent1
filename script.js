// Aurora Compile - Browser-first HTML/CSS/JS Compiler
// Fixed version with proper preview handling for active HTML files

class AuroraCompile {
  constructor() {
    this.project = null;
    this.activeFileId = null;
    this.editor = null;
    this.isLoading = false;
    this.hotReload = true;
    this.hotReloadTimeout = null;
    
    this.init();
  }

  async init() {
    try {
      await this.initializeMonaco();
      this.setupEventListeners();
      this.loadProject();
      this.checkOnboarding();
      this.setupKeyboardShortcuts();
      
      // Initial preview refresh
      setTimeout(() => {
        this.refreshPreview();
      }, 500);
    } catch (error) {
      console.error('Failed to initialize Aurora Compile:', error);
      this.addConsoleMessage('error', `Initialization failed: ${error.message}`);
    }
  }

  // Monaco Editor Setup
  async initializeMonaco() {
    return new Promise((resolve, reject) => {
      if (typeof require === 'undefined') {
        reject(new Error('Monaco Editor loader not available'));
        return;
      }

      require.config({ 
        paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' },
        'vs/nls': { availableLanguages: { '*': 'en' } }
      });
      
      require(['vs/editor/editor.main'], () => {
        try {
          // Configure Monaco themes
          monaco.editor.defineTheme('aurora-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6c757d', fontStyle: 'italic' },
              { token: 'keyword', foreground: '4dabf7', fontStyle: 'bold' },
              { token: 'string', foreground: '51cf66' },
              { token: 'number', foreground: 'ffd43b' }
            ],
            colors: {
              'editor.background': '#1a1d23',
              'editor.foreground': '#f8f9fa',
              'editor.lineHighlightBackground': '#2f3349',
              'editor.selectionBackground': '#4dabf7',
              'editorCursor.foreground': '#4dabf7',
              'editorLineNumber.foreground': '#6c757d',
              'editorLineNumber.activeForeground': '#adb5bd'
            }
          });

          monaco.editor.defineTheme('aurora-light', {
            base: 'vs',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6c757d', fontStyle: 'italic' },
              { token: 'keyword', foreground: '0066cc', fontStyle: 'bold' },
              { token: 'string', foreground: '28a745' },
              { token: 'number', foreground: 'e83e8c' }
            ],
            colors: {
              'editor.background': '#ffffff',
              'editor.foreground': '#212529',
              'editor.lineHighlightBackground': '#f8f9fa',
              'editor.selectionBackground': '#0066cc',
              'editorCursor.foreground': '#0066cc',
              'editorLineNumber.foreground': '#6c757d',
              'editorLineNumber.activeForeground': '#212529'
            }
          });

          this.createEditor();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        reject(new Error('Failed to load Monaco Editor: ' + error));
      });
    });
  }

  createEditor() {
    const container = document.getElementById('monaco-editor');
    if (!container) {
      throw new Error('Monaco editor container not found');
    }
    
    const theme = document.documentElement.getAttribute('data-theme');
    
    this.editor = monaco.editor.create(container, {
      value: '// Welcome to Aurora Compile!\n// Start editing your code here...',
      language: 'html',
      theme: theme === 'dark' ? 'aurora-dark' : 'aurora-light',
      fontSize: 14,
      lineHeight: 22,
      fontFamily: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      minimap: { enabled: true, maxColumn: 80 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true
      },
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true
    });

    // Editor event listeners
    this.editor.onDidChangeModelContent(() => {
      if (this.activeFileId && this.project) {
        const content = this.editor.getValue();
        this.updateFileContent(this.activeFileId, content);
        this.updateTabStatus(this.activeFileId, true);
        
        // Hot reload with debouncing
        if (this.hotReload) {
          if (this.hotReloadTimeout) {
            clearTimeout(this.hotReloadTimeout);
          }
          this.hotReloadTimeout = setTimeout(() => {
            this.refreshPreview();
          }, 1000);
        }
      }
    });

    this.editor.onDidChangeCursorPosition((e) => {
      this.updateCursorPosition(e.position);
    });

    // Add keyboard shortcuts to editor
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      this.runPreview();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveProject();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
      this.exportProject();
    });
  }

  // Project Management
  loadProject() {
    const savedProject = localStorage.getItem('aurora-compile-project');
    if (savedProject) {
      try {
        this.project = JSON.parse(savedProject);
        this.addConsoleMessage('info', '📂 Loaded saved project from localStorage');
      } catch (e) {
        console.warn('Failed to load saved project:', e);
        this.project = this.createDefaultProject();
        this.addConsoleMessage('warning', '⚠️ Failed to load saved project, created new default project');
      }
    } else {
      this.project = this.createDefaultProject();
      this.addConsoleMessage('info', '🆕 Created new default project');
    }
    
    this.renderFileTree();
    this.renderEditorTabs();
    if (this.project.files.length > 0) {
      this.openFile(this.project.files[0].id);
    }
  }

  createDefaultProject() {
    const timestamp = Date.now();
    return {
      id: 'default',
      name: 'Aurora Demo',
      files: [
        {
          id: 'html-' + timestamp,
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Compile Demo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>🌅 Welcome to Aurora Compile</h1>
    <p>Your browser-first web compiler is ready!</p>
    <button id="demo-btn" class="btn">Click me!</button>
    <div id="counter" class="counter">0</div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          language: 'html',
          isDirty: false
        },
        {
          id: 'css-' + timestamp + 1,
          name: 'styles.css',
          content: `/* Aurora Demo Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  color: white;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #fff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  line-height: 1.6;
}

.btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.counter {
  font-size: 3rem;
  font-weight: bold;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.btn:active {
  animation: pulse 0.3s ease;
}`,
          language: 'css',
          isDirty: false
        },
        {
          id: 'js-' + timestamp + 2,
          name: 'app.js',
          content: `// Aurora Compile Demo
console.log('🌅 Aurora Compile initialized!');

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('demo-btn');
  const counter = document.getElementById('counter');
  let count = 0;
  
  if (!button || !counter) {
    console.error('Required elements not found!');
    return;
  }
  
  button.addEventListener('click', () => {
    count++;
    counter.textContent = count;
    
    // Add visual feedback
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = '';
    }, 100);
    
    // Update button text based on count
    if (count === 1) {
      button.textContent = 'Great job! 🎉';
    } else if (count === 5) {
      button.textContent = 'You\\'re on fire! 🔥';
    } else if (count === 10) {
      button.textContent = 'Amazing! ⭐';
    } else if (count === 20) {
      button.textContent = 'Incredible! 🚀';
    }
    
    console.log(\`Button clicked \${count} time\${count === 1 ? '' : 's'}!\`);
  });
  
  // Add some dynamic behavior
  let heartbeat = 0;
  setInterval(() => {
    heartbeat++;
    if (heartbeat % 30 === 0) {
      console.log('✨ Aurora Compile is running smoothly!');
    }
  }, 1000);
});`,
          language: 'javascript',
          isDirty: false
        }
      ]
    };
  }

  // File Operations
  addFile(name, content = '') {
    if (!this.project) {
      this.addConsoleMessage('error', 'No project loaded');
      return;
    }
    
    // Check if file already exists
    if (this.project.files.some(f => f.name === name)) {
      this.addConsoleMessage('error', `File "${name}" already exists`);
      return;
    }
    
    const id = name + '-' + Date.now();
    const language = this.getLanguageFromExtension(name);
    
    const newFile = {
      id,
      name,
      content,
      language,
      isDirty: false
    };
    
    this.project.files.push(newFile);
    this.renderFileTree();
    this.renderEditorTabs();
    this.openFile(id);
    this.saveProject();
    this.addConsoleMessage('info', `📄 Created new file: ${name}`);
  }

  deleteFile(fileId) {
    if (!this.project) return;
    
    const file = this.project.files.find(f => f.id === fileId);
    if (!file) return;
    
    this.project.files = this.project.files.filter(f => f.id !== fileId);
    
    if (this.activeFileId === fileId) {
      const nextFile = this.project.files[0];
      if (nextFile) {
        this.openFile(nextFile.id);
      } else {
        this.activeFileId = null;
        if (this.editor) {
          this.editor.setValue('');
        }
      }
    }
    
    this.renderFileTree();
    this.renderEditorTabs();
    this.saveProject();
    this.addConsoleMessage('info', `🗑️ Deleted file: ${file.name}`);
  }

  openFile(fileId) {
    const file = this.project?.files.find(f => f.id === fileId);
    if (!file) {
      this.addConsoleMessage('error', `File not found: ${fileId}`);
      return;
    }
    
    this.activeFileId = fileId;
    
    if (this.editor) {
      // Create a new model for the file
      const existingModel = monaco.editor.getModel(monaco.Uri.file(file.name));
      if (existingModel) {
        existingModel.dispose();
      }
      
      const model = monaco.editor.createModel(
        file.content, 
        file.language, 
        monaco.Uri.file(file.name)
      );
      this.editor.setModel(model);
    }
    
    this.updateFileTreeSelection();
    this.updateTabSelection();
    this.updateEditorStatus(`Editing ${file.name}`);
    this.addConsoleMessage('info', `📝 Opened file: ${file.name}`);
    
    // Refresh preview if it's an HTML file or if hot reload is enabled
    if (file.language === 'html' || this.hotReload) {
      setTimeout(() => this.refreshPreview(), 100);
    }
  }

  updateFileContent(fileId, content) {
    const file = this.project?.files.find(f => f.id === fileId);
    if (file) {
      file.content = content;
      file.isDirty = true;
    }
  }

  // UI Rendering
  renderFileTree() {
    const container = document.getElementById('file-tree');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!this.project?.files.length) {
      container.innerHTML = '<div class="file-item">No files</div>';
      return;
    }
    
    this.project.files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.fileId = file.id;
      if (file.isDirty) item.classList.add('dirty');
      
      const icon = this.getFileIcon(file.language);
      item.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-name">${file.name}</div>
      `;
      
      item.addEventListener('click', () => this.openFile(file.id));
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showFileContextMenu(e, file.id);
      });
      
      container.appendChild(item);
    });
  }

  renderEditorTabs() {
    const container = document.getElementById('editor-tabs');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!this.project?.files.length) return;
    
    this.project.files.forEach(file => {
      const tab = document.createElement('button');
      tab.className = 'editor-tab';
      tab.dataset.fileId = file.id;
      
      const icon = this.getFileIcon(file.language);
      tab.innerHTML = `
        <div class="file-icon">${icon}</div>
        <span>${file.name}</span>
        <div class="tab-close" data-file-id="${file.id}">&times;</div>
      `;
      
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.openFile(file.id);
        }
      });
      
      // Handle tab close
      const closeBtn = tab.querySelector('.tab-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteFile(file.id);
      });
      
      container.appendChild(tab);
    });
  }

  // FIXED: Preview Management - This is the core fix for the issue
  refreshPreview() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) {
      this.addConsoleMessage('error', 'Preview iframe not found');
      return;
    }

    if (!this.project || !this.project.files.length) {
      iframe.srcdoc = '<div style="padding: 2rem; text-align: center; font-family: system-ui;">No project files found</div>';
      this.addConsoleMessage('warning', '⚠️ No project files available for preview');
      return;
    }

    let htmlFile = null;
    let html = '';

    try {
      // PRIORITY 1: Use the currently active file if it's HTML
      if (this.activeFileId) {
        const activeFile = this.project.files.find(f => f.id === this.activeFileId);
        if (activeFile && activeFile.name.endsWith('.html')) {
          htmlFile = activeFile;
          html = activeFile.content;
          this.addConsoleMessage('info', `🔄 Using active HTML file: ${activeFile.name}`);
        }
      }

      // PRIORITY 2: Fall back to the first HTML file if active file isn't HTML
      if (!htmlFile) {
        htmlFile = this.project.files.find(f => f.name.endsWith('.html'));
        if (htmlFile) {
          html = htmlFile.content;
          this.addConsoleMessage('info', `🔄 Using first HTML file: ${htmlFile.name} (active file is not HTML)`);
        }
      }

      // No HTML file found
      if (!htmlFile) {
        iframe.srcdoc = '<div style="padding: 2rem; text-align: center; font-family: system-ui; color: #666;">No HTML file found in project.<br><br>Create an HTML file to see the preview.</div>';
        this.addConsoleMessage('warning', '⚠️ No HTML file found for preview');
        return;
      }

      // Inline all CSS files
      const cssFiles = this.project.files.filter(f => f.name.endsWith('.css'));
      let cssContent = '';
      cssFiles.forEach(cssFile => {
        try {
          cssContent += `<style>/* ${cssFile.name} */\n${cssFile.content}</style>\n`;
          // Remove external CSS references
          const cssLinkRegex = new RegExp(`<link[^>]*href=["']${cssFile.name}["'][^>]*>`, 'gi');
          html = html.replace(cssLinkRegex, '');
          this.addConsoleMessage('info', `✅ Inlined CSS: ${cssFile.name}`);
        } catch (e) {
          this.addConsoleMessage('error', `❌ Failed to inline CSS ${cssFile.name}: ${e.message}`);
        }
      });

      // Inline all JS files
      const jsFiles = this.project.files.filter(f => f.name.endsWith('.js'));
      let jsContent = '';
      jsFiles.forEach(jsFile => {
        try {
          jsContent += `<script>/* ${jsFile.name} */\n${jsFile.content}</script>\n`;
          // Remove external JS references
          const jsScriptRegex = new RegExp(`<script[^>]*src=["']${jsFile.name}["'][^>]*><\\/script>`, 'gi');
          html = html.replace(jsScriptRegex, '');
          this.addConsoleMessage('info', `✅ Inlined JS: ${jsFile.name}`);
        } catch (e) {
          this.addConsoleMessage('error', `❌ Failed to inline JS ${jsFile.name}: ${e.message}`);
        }
      });

      // Console capture script for logging
      const consoleScript = `
        <script>
          (function() {
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            const originalInfo = console.info;
            
            function postToParent(level, args) {
              try {
                const message = args.map(arg => {
                  if (typeof arg === 'object') {
                    try {
                      return JSON.stringify(arg, null, 2);
                    } catch (e) {
                      return String(arg);
                    }
                  }
                  return String(arg);
                }).join(' ');
                
                parent.postMessage({
                  type: 'console',
                  level: level,
                  message: message,
                  timestamp: new Date().toLocaleTimeString()
                }, '*');
              } catch (e) {
                // Fallback if postMessage fails
                originalError('Console bridge error:', e);
              }
            }
            
            console.log = function(...args) {
              originalLog.apply(console, args);
              postToParent('log', args);
            };
            
            console.error = function(...args) {
              originalError.apply(console, args);
              postToParent('error', args);
            };
            
            console.warn = function(...args) {
              originalWarn.apply(console, args);
              postToParent('warning', args);
            };
            
            console.info = function(...args) {
              originalInfo.apply(console, args);
              postToParent('info', args);
            };
            
            // Capture runtime errors
            window.addEventListener('error', function(e) {
              postToParent('error', [\`\${e.message} at \${e.filename}:\${e.lineno}:\${e.colno}\`]);
            });

            // Capture unhandled promise rejections
            window.addEventListener('unhandledrejection', function(e) {
              postToParent('error', [\`Unhandled Promise Rejection: \${e.reason}\`]);
            });
          })();
        </script>
      `;

      // Inject all content strategically
      let finalHtml = html;
      
      // Add CSS before </head> or at the beginning of <body>
      if (cssContent) {
        if (finalHtml.includes('</head>')) {
          finalHtml = finalHtml.replace('</head>', `${cssContent}</head>`);
        } else if (finalHtml.includes('<body>')) {
          finalHtml = finalHtml.replace('<body>', `<body>${cssContent}`);
        } else {
          finalHtml = cssContent + finalHtml;
        }
      }
      
      // Add JS and console script before </body> or at the end
      const scriptContent = jsContent + consoleScript;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scriptContent}</body>`);
      } else {
        finalHtml = finalHtml + scriptContent;
      }

      // Force iframe refresh by setting srcdoc
      iframe.srcdoc = finalHtml;
      
      // Additional force refresh technique
      setTimeout(() => {
        if (iframe && iframe.srcdoc === finalHtml) {
          const currentSrc = iframe.srcdoc;
          iframe.srcdoc = '';
          setTimeout(() => {
            if (iframe) {
              iframe.srcdoc = currentSrc;
            }
          }, 50);
        }
      }, 100);
      
      this.addConsoleMessage('info', `🔄 Preview refreshed successfully using ${htmlFile.name}`);

    } catch (error) {
      console.error('Preview refresh error:', error);
      this.addConsoleMessage('error', `❌ Preview refresh failed: ${error.message}`);
      if (iframe) {
        iframe.srcdoc = `<div style="padding: 2rem; color: red; font-family: system-ui;">Preview Error: ${error.message}</div>`;
      }
    }
  }

  runPreview() {
    this.addConsoleMessage('info', '▶️ Running preview...');
    this.refreshPreview();
  }

  // Build & Export
  async buildProject() {
    if (this.isLoading) return;
    
    this.showLoading('Building your project...');
    this.addBuildMessage('🔨 Starting build process...');
    this.switchConsoleTab('build');
    
    try {
      // Simulate build time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const htmlFiles = this.project.files.filter(f => f.name.endsWith('.html'));
      const cssFiles = this.project.files.filter(f => f.name.endsWith('.css'));
      const jsFiles = this.project.files.filter(f => f.name.endsWith('.js'));
      
      let buildCount = 0;
      
      htmlFiles.forEach(file => {
        buildCount++;
        this.addBuildMessage(`✅ Built ${file.name} (${file.content.length} bytes)`);
      });
      
      cssFiles.forEach(file => {
        buildCount++;
        this.addBuildMessage(`✅ Processed ${file.name} (${file.content.length} bytes)`);
      });
      
      jsFiles.forEach(file => {
        buildCount++;
        this.addBuildMessage(`✅ Bundled ${file.name} (${file.content.length} bytes)`);
      });
      
      this.addBuildMessage(`🎉 Build complete — ${buildCount} files processed`);
      this.addConsoleMessage('info', `🎉 Build complete — ${buildCount} files processed`);
      
    } catch (error) {
      this.addBuildMessage(`❌ Build failed: ${error.message}`);
      this.addConsoleMessage('error', `❌ Build failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async exportProject() {
    if (!window.JSZip) {
      this.addConsoleMessage('error', 'JSZip not loaded. Cannot export project.');
      return;
    }
    
    this.showLoading('Exporting your project...');
    
    try {
      const zip = new JSZip();
      let fileCount = 0;
      
      // Add project files
      this.project.files.forEach(file => {
        let fileName = file.name;
        let content = file.content;
        
        // For HTML files, keep external references for exported version
        if (file.language === 'html') {
          // Ensure proper references to CSS and JS files
          const cssFiles = this.project.files.filter(f => f.name.endsWith('.css'));
          const jsFiles = this.project.files.filter(f => f.name.endsWith('.js'));
          
          cssFiles.forEach(cssFile => {
            if (!content.includes(`href="${cssFile.name}"`)) {
              content = content.replace('</head>', `  <link rel="stylesheet" href="${cssFile.name}">\n</head>`);
            }
          });
          
          jsFiles.forEach(jsFile => {
            if (!content.includes(`src="${jsFile.name}"`)) {
              content = content.replace('</body>', `  <script src="${jsFile.name}"></script>\n</body>`);
            }
          });
        }
        
        zip.file(fileName, content);
        fileCount++;
      });
      
      // Add README
      const readme = `# ${this.project.name || 'Aurora Compile Project'}

This project was created with Aurora Compile - a browser-first web compiler.

## Files
${this.project.files.map(f => `- ${f.name} (${f.language})`).join('\n')}

## Usage
Open index.html in your browser to view the project.

Generated on: ${new Date().toLocaleString()}
`;
      zip.file('README.md', readme);
      fileCount++;
      
      // Generate zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      
      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.project.name || 'aurora-project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const sizeKB = Math.round(blob.size / 1024);
      this.addConsoleMessage('info', `📦 Exported ${this.project.name || 'project'}.zip (${fileCount} files, ${sizeKB} KB)`);
      
    } catch (error) {
      this.addConsoleMessage('error', `❌ Export failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  // Project Templates
  loadTemplate(templateName) {
    let template;
    
    switch (templateName) {
      case 'vanilla-spa':
        template = this.createVanillaSPATemplate();
        break;
      case 'react-cdn':
        template = this.createReactCDNTemplate();
        break;
      case 'landing-page':
        template = this.createLandingPageTemplate();
        break;
      default:
        template = this.createBlankTemplate();
    }
    
    this.project = template;
    this.renderFileTree();
    this.renderEditorTabs();
    if (template.files.length > 0) {
      this.openFile(template.files[0].id);
    }
    this.saveProject();
    this.addConsoleMessage('info', `📋 Loaded template: ${template.name}`);
  }

  createBlankTemplate() {
    const timestamp = Date.now();
    return {
      id: 'blank-' + timestamp,
      name: 'Blank Project',
      files: [
        {
          id: 'html-' + timestamp,
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Hello, World!</h1>
  <script src="app.js"></script>
</body>
</html>`,
          language: 'html',
          isDirty: false
        },
        {
          id: 'css-' + timestamp + 1,
          name: 'styles.css',
          content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 2rem;
  background: #f5f5f5;
}

h1 {
  color: #333;
  text-align: center;
}`,
          language: 'css',
          isDirty: false
        },
        {
          id: 'js-' + timestamp + 2,
          name: 'app.js',
          content: `console.log('Hello from your new project!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded and ready!');
});`,
          language: 'javascript',
          isDirty: false
        }
      ]
    };
  }

  createVanillaSPATemplate() {
    const timestamp = Date.now();
    return {
      id: 'vanilla-spa-' + timestamp,
      name: 'Vanilla SPA',
      files: [
        {
          id: 'html-' + timestamp,
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vanilla SPA</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <nav class="nav">
      <h1>Vanilla SPA</h1>
      <div class="nav-links">
        <a href="#home" class="nav-link">Home</a>
        <a href="#about" class="nav-link">About</a>
        <a href="#contact" class="nav-link">Contact</a>
      </div>
    </nav>
    <main id="content"></main>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          language: 'html',
          isDirty: false
        },
        {
          id: 'css-' + timestamp + 1,
          name: 'styles.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: #333;
}

.nav {
  background: #fff;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav h1 {
  color: #007bff;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #666;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.active {
  background: #007bff;
  color: white;
}

#content {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 2rem;
}

.page {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.fade-in {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}`,
          language: 'css',
          isDirty: false
        },
        {
          id: 'js-' + timestamp + 2,
          name: 'app.js',
          content: `// Simple SPA Router
class Router {
  constructor() {
    this.routes = {};
    this.init();
  }
  
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
    this.handleRoute();
  }
  
  addRoute(path, component) {
    this.routes[path] = component;
  }
  
  handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';
    const component = this.routes[hash] || this.routes['home'];
    
    if (component) {
      this.render(component);
      this.updateNav(hash);
    }
  }
  
  render(component) {
    const content = document.getElementById('content');
    content.innerHTML = component;
    content.className = 'fade-in';
  }
  
  updateNav(activeRoute) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === \`#\${activeRoute}\`) {
        link.classList.add('active');
      }
    });
  }
}

// Page components
const HomePage = \`
  <div class="page">
    <h2>Welcome Home</h2>
    <p>This is a simple single-page application built with vanilla JavaScript.</p>
    <p>Navigate using the links above to see the router in action!</p>
  </div>
\`;

const AboutPage = \`
  <div class="page">
    <h2>About</h2>
    <p>This SPA demonstrates client-side routing with vanilla JavaScript.</p>
    <p>No frameworks needed - just clean, simple code!</p>
  </div>
\`;

const ContactPage = \`
  <div class="page">
    <h2>Contact</h2>
    <p>Get in touch with us!</p>
    <p>This is a demo page showing how easy it is to build SPAs.</p>
  </div>
\`;

// Initialize router
const router = new Router();
router.addRoute('home', HomePage);
router.addRoute('about', AboutPage);
router.addRoute('contact', ContactPage);

console.log('🚀 Vanilla SPA loaded and ready!');`,
          language: 'javascript',
          isDirty: false
        }
      ]
    };
  }

  createReactCDNTemplate() {
    const timestamp = Date.now();
    return {
      id: 'react-cdn-' + timestamp,
      name: 'React CDN App',
      files: [
        {
          id: 'html-' + timestamp,
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React CDN App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  
  <!-- React CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <script type="text/babel" src="app.js"></script>
</body>
</html>`,
          language: 'html',
          isDirty: false
        },
        {
          id: 'css-' + timestamp + 1,
          name: 'styles.css',
          content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 0;
  background: #f5f5f5;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.counter {
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.counter h1 {
  color: #333;
  margin-bottom: 1rem;
}

.counter button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  margin: 0 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.counter button:hover {
  background: #0056b3;
}

.counter button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.count {
  font-size: 3rem;
  font-weight: bold;
  margin: 1rem 0;
  color: #007bff;
}

.todo-app {
  margin-top: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.todo-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 16px;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item input[type="checkbox"] {
  margin-right: 12px;
}

.todo-item.completed span {
  text-decoration: line-through;
  color: #666;
}`,
          language: 'css',
          isDirty: false
        },
        {
          id: 'js-' + timestamp + 2,
          name: 'app.js',
          content: `const { useState } = React;

function Counter() {
  const [count, setCount] = useState(0);

  return React.createElement('div', { className: 'counter' },
    React.createElement('h1', null, '⚛️ React Counter'),
    React.createElement('div', { className: 'count' }, count),
    React.createElement('div', null,
      React.createElement('button', {
        onClick: () => setCount(count - 1),
        disabled: count <= 0
      }, 'Decrease'),
      React.createElement('button', {
        onClick: () => setCount(0)
      }, 'Reset'),
      React.createElement('button', {
        onClick: () => setCount(count + 1)
      }, 'Increase')
    )
  );
}

function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build something awesome', completed: false }
  ]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false
      }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return React.createElement('div', { className: 'todo-app' },
    React.createElement('h2', null, '📝 Todo List'),
    React.createElement('div', null,
      React.createElement('input', {
        type: 'text',
        className: 'todo-input',
        placeholder: 'Add a new todo...',
        value: inputValue,
        onChange: (e) => setInputValue(e.target.value),
        onKeyPress: (e) => e.key === 'Enter' && addTodo()
      }),
      React.createElement('button', {
        onClick: addTodo,
        style: { marginBottom: '1rem' }
      }, 'Add Todo')
    ),
    React.createElement('ul', { className: 'todo-list' },
      todos.map(todo =>
        React.createElement('li', {
          key: todo.id,
          className: \`todo-item \${todo.completed ? 'completed' : ''}\`
        },
          React.createElement('input', {
            type: 'checkbox',
            checked: todo.completed,
            onChange: () => toggleTodo(todo.id)
          }),
          React.createElement('span', null, todo.text)
        )
      )
    )
  );
}

function App() {
  return React.createElement('div', { className: 'app' },
    React.createElement(Counter),
    React.createElement(TodoApp)
  );
}

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));
console.log('⚛️ React app loaded via CDN!');`,
          language: 'javascript',
          isDirty: false
        }
      ]
    };
  }

  createLandingPageTemplate() {
    const timestamp = Date.now();
    return {
      id: 'landing-' + timestamp,
      name: 'Landing Page',
      files: [
        {
          id: 'html-' + timestamp,
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Compile - Modern Web Compiler</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <div class="nav-brand">Aurora Compile</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#demo">Demo</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <h1>Build. Compile. Deploy.</h1>
        <p>The modern browser-first compiler for HTML, CSS, and JavaScript.</p>
        <button class="cta-button" id="get-started">Get Started</button>
      </div>
    </section>

    <section id="features" class="features">
      <div class="container">
        <h2>Why Aurora Compile?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3>Lightning Fast</h3>
            <p>Compile your code instantly with WebAssembly-powered tools.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🛠️</div>
            <h3>No Setup</h3>
            <p>Start coding immediately. No downloads or configuration.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>Responsive</h3>
            <p>Preview your work on any device size in real-time.</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <p>&copy; 2025 Aurora Compile. Built for developers.</p>
    </div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,
          language: 'html',
          isDirty: false
        },
        {
          id: 'css-' + timestamp + 1,
          name: 'styles.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Header */
.header {
  position: fixed;
  top: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  border-bottom: 1px solid #e0e0e0;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #667eea;
}

/* Hero */
.hero {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  position: relative;
}

.hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* Features */
.features {
  padding: 5rem 0;
  background: #f8f9fa;
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin-bottom: 1rem;
  color: #333;
}

.feature-card p {
  color: #666;
}

/* Footer */
.footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 2rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .hero h1 {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}`,
          language: 'css',
          isDirty: false
        },
        {
          id: 'js-' + timestamp + 2,
          name: 'app.js',
          content: `// Landing Page JavaScript
console.log('🚀 Landing page loaded!');

document.addEventListener('DOMContentLoaded', () => {
  const ctaButton = document.getElementById('get-started');
  
  if (ctaButton) {
    ctaButton.addEventListener('click', () => {
      alert('Welcome to Aurora Compile! 🌅\\n\\nThis is a demo landing page.\\nIn a real app, this would redirect to your signup page.');
      console.log('CTA button clicked!');
    });
  }
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Header background on scroll
  let lastScrollY = window.scrollY;
  
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (header) {
      if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
      } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
      }
    }
  });
  
  // Add some interactive elements
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      console.log(\`Hovering over feature \${index + 1}\`);
    });
  });
});`,
          language: 'javascript',
          isDirty: false
        }
      ]
    };
  }

  // Event Listeners
  setupEventListeners() {
    // Toolbar buttons
    const runBtn = document.getElementById('run-btn');
    const buildBtn = document.getElementById('build-btn');
    const exportBtn = document.getElementById('export-btn');
    const templatesBtn = document.getElementById('templates-btn');
    
    if (runBtn) runBtn.addEventListener('click', () => this.runPreview());
    if (buildBtn) buildBtn.addEventListener('click', () => this.buildProject());
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportProject());
    if (templatesBtn) templatesBtn.addEventListener('click', () => this.showTemplatesModal());
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) helpBtn.addEventListener('click', () => this.showOnboardingModal());
    
    // File operations
    const newFileBtn = document.getElementById('new-file-btn');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (newFileBtn) newFileBtn.addEventListener('click', () => this.showNewFileModal());
    if (uploadBtn) uploadBtn.addEventListener('click', () => this.triggerFileUpload());
    
    // Preview controls
    const hotReloadToggle = document.getElementById('hot-reload-toggle');
    const previewRefresh = document.getElementById('preview-refresh');
    const previewExternal = document.getElementById('preview-external');
    const deviceSelector = document.getElementById('device-selector');
    
    if (hotReloadToggle) {
      hotReloadToggle.addEventListener('change', (e) => {
        this.hotReload = e.target.checked;
        this.addConsoleMessage('info', `🔄 Hot reload ${this.hotReload ? 'enabled' : 'disabled'}`);
      });
    }
    
    if (previewRefresh) previewRefresh.addEventListener('click', () => this.refreshPreview());
    if (previewExternal) previewExternal.addEventListener('click', () => this.openPreviewExternal());
    if (deviceSelector) {
      deviceSelector.addEventListener('change', (e) => {
        this.setPreviewDevice(e.target.value);
      });
    }
    
    // Console controls
    const clearConsole = document.getElementById('clear-console');
    const toggleConsole = document.getElementById('toggle-console');
    
    if (clearConsole) clearConsole.addEventListener('click', () => this.clearConsole());
    if (toggleConsole) toggleConsole.addEventListener('click', () => this.toggleConsole());
    
    // Console tabs
    document.querySelectorAll('.console-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchConsoleTab(tab.dataset.tab));
    });
    
    // Modal event listeners
    this.setupModalEventListeners();
    
    // File upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    
    // Listen for console messages from preview iframe
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'console') {
        this.addConsoleMessage(e.data.level, e.data.message, e.data.timestamp);
      }
    });
  }

  setupModalEventListeners() {
    // Onboarding modal
    const closeOnboarding = document.getElementById('close-onboarding');
    const startCoding = document.getElementById('start-coding');
    const loadTemplate = document.getElementById('load-template');
    
    if (closeOnboarding) closeOnboarding.addEventListener('click', () => this.hideOnboardingModal());
    if (startCoding) startCoding.addEventListener('click', () => this.hideOnboardingModal());
    if (loadTemplate) {
      loadTemplate.addEventListener('click', () => {
        this.hideOnboardingModal();
        this.showTemplatesModal();
      });
    }
    
    // Templates modal
    const closeTemplates = document.getElementById('close-templates');
    if (closeTemplates) closeTemplates.addEventListener('click', () => this.hideTemplatesModal());
    
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        this.loadTemplate(card.dataset.template);
        this.hideTemplatesModal();
      });
    });
    
    // New file modal
    const closeNewFile = document.getElementById('close-new-file');
    const cancelNewFile = document.getElementById('cancel-new-file');
    const createFile = document.getElementById('create-file');
    const fileNameInput = document.getElementById('file-name-input');
    
    if (closeNewFile) closeNewFile.addEventListener('click', () => this.hideNewFileModal());
    if (cancelNewFile) cancelNewFile.addEventListener('click', () => this.hideNewFileModal());
    if (createFile) createFile.addEventListener('click', () => this.createNewFile());
    if (fileNameInput) {
      fileNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.createNewFile();
      });
    }
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.style.display = 'none';
          overlay.classList.remove('active');
        }
      });
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runPreview();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.exportProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showNewFileModal();
      }
    });
  }

  // Theme Management
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('aurora-compile-theme', newTheme);
    
    // Update Monaco theme
    if (this.editor) {
      monaco.editor.setTheme(newTheme === 'dark' ? 'aurora-dark' : 'aurora-light');
    }
    
    this.addConsoleMessage('info', `🎨 Switched to ${newTheme} theme`);
  }

  // Utility Functions
  getLanguageFromExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      html: 'html',
      htm: 'html',
      css: 'css',
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext'
    };
    return languageMap[ext] || 'plaintext';
  }

  getFileIcon(language) {
    const iconMap = {
      html: '📄',
      css: '🎨',
      javascript: '⚡',
      typescript: '🔷',
      json: '📋',
      markdown: '📝',
      plaintext: '📄'
    };
    return iconMap[language] || '📄';
  }

  // UI Update Functions
  updateFileTreeSelection() {
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.fileId === this.activeFileId) {
        item.classList.add('active');
      }
    });
  }

  updateTabSelection() {
    document.querySelectorAll('.editor-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.fileId === this.activeFileId) {
        tab.classList.add('active');
      }
    });
  }

  updateTabStatus(fileId, isDirty) {
    const tab = document.querySelector(`.editor-tab[data-file-id="${fileId}"]`);
    const fileItem = document.querySelector(`.file-item[data-file-id="${fileId}"]`);
    
    if (tab) {
      if (isDirty) {
        tab.classList.add('dirty');
      } else {
        tab.classList.remove('dirty');
      }
    }
    
    if (fileItem) {
      if (isDirty) {
        fileItem.classList.add('dirty');
      } else {
        fileItem.classList.remove('dirty');
      }
    }
  }

  updateEditorStatus(message) {
    const status = document.querySelector('.status-info');
    if (status) status.textContent = message;
  }

  updateCursorPosition(position) {
    const cursor = document.querySelector('.cursor-position');
    if (cursor) cursor.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
  }

  // Console Management
  addConsoleMessage(level, message, timestamp = null) {
    const output = document.getElementById('console-output');
    if (!output) return;
    
    const time = timestamp || new Date().toLocaleTimeString();
    
    const messageEl = document.createElement('div');
    messageEl.className = `console-message console-${level}`;
    messageEl.innerHTML = `
      <span class="console-timestamp">[${time}]</span>
      <span class="console-text">${this.escapeHtml(message)}</span>
    `;
    
    output.appendChild(messageEl);
    output.scrollTop = output.scrollHeight;
    
    // Switch to console tab if error
    if (level === 'error') {
      this.switchConsoleTab('console');
    }
    
    // Limit console messages to prevent memory issues
    const messages = output.querySelectorAll('.console-message');
    if (messages.length > 1000) {
      messages[0].remove();
    }
  }

  addBuildMessage(message) {
    const output = document.getElementById('build-output');
    if (!output) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'build-message';
    messageEl.innerHTML = `<span class="build-text">${this.escapeHtml(message)}</span>`;
    
    output.appendChild(messageEl);
    output.scrollTop = output.scrollHeight;
  }

  clearConsole() {
    const consoleOutput = document.getElementById('console-output');
    const buildOutput = document.getElementById('build-output');
    
    if (consoleOutput) consoleOutput.innerHTML = '';
    if (buildOutput) buildOutput.innerHTML = '';
    
    this.addConsoleMessage('info', '🧹 Console cleared');
  }

  toggleConsole() {
    const panel = document.getElementById('console-panel');
    if (!panel) return;
    
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'flex' : 'none';
    
    this.addConsoleMessage('info', `👁️ Console ${isHidden ? 'shown' : 'hidden'}`);
  }

  switchConsoleTab(tabName) {
    document.querySelectorAll('.console-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });
    
    const consoleOutput = document.getElementById('console-output');
    const buildOutput = document.getElementById('build-output');
    
    if (consoleOutput) consoleOutput.style.display = tabName === 'console' ? 'block' : 'none';
    if (buildOutput) buildOutput.style.display = tabName === 'build' ? 'block' : 'none';
  }

  // Preview Management
  setPreviewDevice(device) {
    const container = document.getElementById('preview-container');
    if (!container) return;
    
    container.className = 'preview-container';
    if (device !== 'desktop') {
      container.classList.add(device);
    }
    
    this.addConsoleMessage('info', `📱 Preview device set to: ${device}`);
  }

  openPreviewExternal() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe || !iframe.srcdoc) {
      this.addConsoleMessage('warning', '⚠️ No preview content to open');
      return;
    }
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(iframe.srcdoc);
      newWindow.document.close();
      this.addConsoleMessage('info', '🔗 Opened preview in new window');
    } else {
      this.addConsoleMessage('error', '❌ Failed to open new window (popup blocked?)');
    }
  }

  // Modal Management
  showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }

  hideOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
    localStorage.setItem('aurora-compile-onboarded', 'true');
  }

  showTemplatesModal() {
    const modal = document.getElementById('templates-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }

  hideTemplatesModal() {
    const modal = document.getElementById('templates-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
  }

  showNewFileModal() {
    const modal = document.getElementById('new-file-modal');
    const input = document.getElementById('file-name-input');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('active');
      if (input) input.focus();
    }, 10);
  }

  hideNewFileModal() {
    const modal = document.getElementById('new-file-modal');
    const input = document.getElementById('file-name-input');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
    if (input) input.value = '';
  }

  createNewFile() {
    const input = document.getElementById('file-name-input');
    if (!input) return;
    
    const fileName = input.value.trim();
    
    if (!fileName) {
      alert('Please enter a file name');
      return;
    }
    
    if (this.project?.files.some(f => f.name === fileName)) {
      alert('File already exists');
      return;
    }
    
    this.addFile(fileName);
    this.hideNewFileModal();
  }

  // File Upload
  triggerFileUpload() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.click();
  }

  handleFileUpload(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.addFile(file.name, event.target.result);
      };
      reader.onerror = () => {
        this.addConsoleMessage('error', `Failed to read file: ${file.name}`);
      };
      reader.readAsText(file);
    });
    
    e.target.value = ''; // Reset input
    this.addConsoleMessage('info', `📁 Uploaded ${files.length} file(s)`);
  }

  // File Context Menu
  showFileContextMenu(e, fileId) {
    // Simple context menu - could be enhanced
    const file = this.project?.files.find(f => f.id === fileId);
    if (!file) return;
    
    const action = confirm(`Delete "${file.name}"?`);
    if (action) {
      this.deleteFile(fileId);
    }
  }

  // Loading Management
  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    
    const text = overlay.querySelector('p');
    if (text) text.textContent = message;
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
    this.isLoading = true;
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('active');
    setTimeout(() => overlay.style.display = 'none', 300);
    this.isLoading = false;
  }

  // Project Persistence
  saveProject() {
    if (!this.project) return;
    
    // Mark all files as saved
    this.project.files.forEach(file => {
      file.isDirty = false;
    });
    
    try {
      localStorage.setItem('aurora-compile-project', JSON.stringify(this.project));
      this.renderFileTree();
      this.renderEditorTabs();
      this.addConsoleMessage('info', '💾 Project saved');
    } catch (error) {
      this.addConsoleMessage('error', `❌ Failed to save project: ${error.message}`);
    }
  }

  // Onboarding Check
  checkOnboarding() {
    const hasSeenOnboarding = localStorage.getItem('aurora-compile-onboarded');
    if (!hasSeenOnboarding) {
      setTimeout(() => this.showOnboardingModal(), 1000);
    }
  }

  // Utility function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the application
let app;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new AuroraCompile();
  });
} else {
  app = new AuroraCompile();
}

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Application error:', e.error);
  if (app) {
    app.addConsoleMessage('error', `Application error: ${e.message}`);
  }
});

// Prevent accidental page reload
window.addEventListener('beforeunload', (e) => {
  if (app && app.project && app.project.files.some(f => f.isDirty)) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});

// Export for global access
window.AuroraCompile = AuroraCompile;

