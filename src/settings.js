document.addEventListener('DOMContentLoaded', async () => {
  const standardPromptTextarea = document.getElementById('standardPrompt');
  const withCommentsPromptTextarea = document.getElementById('withCommentsPrompt');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const statusMessage = document.getElementById('statusMessage');

  // Load current prompts
  async function loadPrompts() {
    chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
      const prompts = response.prompts;
      const defaults = response.defaults;
      
      standardPromptTextarea.value = prompts.standard || defaults.standard;
      withCommentsPromptTextarea.value = prompts.withComments || defaults.withComments;
    });
  }

  // Save prompts
  saveButton.addEventListener('click', () => {
    const prompts = {
      standard: standardPromptTextarea.value,
      withComments: withCommentsPromptTextarea.value
    };
    
    chrome.runtime.sendMessage({ 
      action: 'savePrompts', 
      prompts: prompts 
    }, (response) => {
      if (response.success) {
        showStatus('Settings saved successfully!', 'success');
      } else {
        showStatus('Failed to save settings', 'error');
      }
    });
  });

  // Reset to defaults
  resetButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset to default prompts?')) {
      chrome.runtime.sendMessage({ action: 'resetPrompts' }, (response) => {
        if (response.success) {
          loadPrompts();
          showStatus('Reset to default prompts', 'success');
        }
      });
    }
  });

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }

  // Load prompts on startup
  await loadPrompts();
});
