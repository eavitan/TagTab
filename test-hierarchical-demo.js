// Demo script to create hierarchical tags for testing
// Run this in browser console after loading the extension

async function createHierarchicalDemo() {
  console.log('Creating hierarchical tag demo...');

  try {
    // Create some demo data in storage to test the hierarchical view
    const demoData = {
      tags: {
        'Development': [
          {
            url: 'https://github.com/user/repo',
            title: 'My GitHub Repository',
            favIconUrl: '',
            savedAt: new Date().toISOString()
          }
        ],
        'Development/Frontend': [
          {
            url: 'https://react.dev',
            title: 'React Documentation',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 1000000).toISOString()
          },
          {
            url: 'https://tailwindcss.com',
            title: 'Tailwind CSS',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 2000000).toISOString()
          }
        ],
        'Development/Backend': [
          {
            url: 'https://nodejs.org',
            title: 'Node.js',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 3000000).toISOString()
          }
        ],
        'Development/DevOps': [
          {
            url: 'https://docker.com',
            title: 'Docker',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 4000000).toISOString()
          }
        ],
        'Learning': [
          {
            url: 'https://coursera.org',
            title: 'Coursera Online Courses',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 5000000).toISOString()
          }
        ],
        'Learning/JavaScript': [
          {
            url: 'https://javascript.info',
            title: 'The Modern JavaScript Tutorial',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 6000000).toISOString()
          }
        ],
        'Learning/Design': [
          {
            url: 'https://dribbble.com',
            title: 'Dribbble - Design Inspiration',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 7000000).toISOString()
          }
        ],
        'Other': [
          {
            url: 'https://example.com',
            title: 'Random Website',
            favIconUrl: '',
            savedAt: new Date(Date.now() - 8000000).toISOString()
          }
        ]
      }
    };

    // Store the demo data
    await chrome.storage.local.set(demoData);

    // Trigger hierarchy update
    await chrome.runtime.sendMessage({ type: 'getTags' });

    console.log('✅ Hierarchical demo data created!');
    console.log('Expected structure:');
    console.log('📁 All');
    console.log('📂 Other');
    console.log('📁 Development [1 item] ⯆');
    console.log('├── 📁 Frontend [2 items]');
    console.log('├── 📁 Backend [1 item]');
    console.log('└── 📁 DevOps [1 item]');
    console.log('📁 Learning [1 item] ⯆');
    console.log('├── 📁 JavaScript [1 item]');
    console.log('└── 📁 Design [1 item]');

    // Reload the page to see the changes
    if (typeof render === 'function') {
      render(null);
    } else {
      console.log('Reload the page to see the hierarchical view!');
    }

  } catch (error) {
    console.error('Error creating demo data:', error);
  }
}

// Test individual functions
async function testHierarchyFunctions() {
  console.log('Testing hierarchy helper functions...');

  // Test creating sub-tags
  try {
    const result1 = await chrome.runtime.sendMessage({
      type: 'createSubTag',
      parentPath: 'Development',
      subTagName: 'Testing'
    });
    console.log('✅ Created sub-tag:', result1);

    const result2 = await chrome.runtime.sendMessage({
      type: 'createSubTag',
      parentPath: 'Learning',
      subTagName: 'CSS'
    });
    console.log('✅ Created sub-tag:', result2);

  } catch (error) {
    console.log('ℹ️ Sub-tag creation (may fail if tags already exist):', error.message);
  }

  // Test toggle collapse
  try {
    const result3 = await chrome.runtime.sendMessage({
      type: 'toggleTagCollapse',
      tagPath: 'Development'
    });
    console.log('✅ Toggled collapse state:', result3);

  } catch (error) {
    console.error('❌ Toggle collapse failed:', error);
  }
}

// Run the demo
console.log('=== TagTab Hierarchical Demo ===');
console.log('Run createHierarchicalDemo() to create demo data');
console.log('Run testHierarchyFunctions() to test operations');

// Auto-run if you want
// createHierarchicalDemo();