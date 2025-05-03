document.addEventListener('DOMContentLoaded', function() {
  const stripMarkdownButton = document.getElementById('stripMarkdown');
  const gptPromptButton = document.getElementById('gptPrompt');
  const stripIntroButton = document.getElementById('stripIntro');
  const stripBonusButton = document.getElementById('stripBonus');
  const insertGeneralButton = document.getElementById('insertGeneral');
  const insertLanguageButton = document.getElementById('insertLanguage');
  const statusDiv = document.getElementById('status');
  stripMarkdownButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        statusDiv.textContent = 'Error: Could not get active tab.';
        return;
      }
      statusDiv.textContent = 'Processing...';
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        function: stripMarkdownDirectly
      })
      .then(results => {
        const anySuccess = results.some(result => result.result === true);
        if (anySuccess) {
          statusDiv.textContent = 'Markdown successfully stripped!';
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 2000);
        } else {
          chrome.tabs.sendMessage(tab.id, { action: 'stripMarkdown' }, { frameId: 0 }, 
            function(response) {
              if (response && response.success) {
                statusDiv.textContent = 'Markdown successfully stripped!';
                setTimeout(() => {
                  statusDiv.textContent = '';
                }, 2000);
                return;
              }
              chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                function: directContentEditableBodyProcess
              })
              .then(results => {
                const anySuccess = results.some(result => result.result === true);
                if (anySuccess) {
                  statusDiv.textContent = 'Markdown successfully stripped!';
                  setTimeout(() => {
                    statusDiv.textContent = '';
                  }, 2000);
                } else {
                  chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: processIframesDirectly
                  })
                  .then(iframeResults => {
                    if (iframeResults[0].result === true) {
                      statusDiv.textContent = 'Markdown successfully stripped from iframe!';
                      setTimeout(() => {
                        statusDiv.textContent = '';
                      }, 2000);
                    } else {
                      chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: diagnoseTextFieldIssue
                      })
                      .then(diagResults => {
                        if (diagResults && diagResults[0].result) {
                          statusDiv.textContent = diagResults[0].result;
                        } else {
                          statusDiv.textContent = 'No text field selected or no markdown found.';
                        }
                        setTimeout(() => {
                          statusDiv.textContent = '';
                        }, 5000);
                      });
                    }
                  })
                  .catch(error => {
                    statusDiv.textContent = 'Error processing content: ' + error.message;
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 5000);
                  });
                }
              })
              .catch(error => {
                statusDiv.textContent = 'Error executing script: ' + error.message;
                setTimeout(() => {
                  statusDiv.textContent = '';
                }, 5000);
              });
            }
          );
        }
      })
      .catch(error => {
        statusDiv.textContent = 'Error executing direct script: ' + error.message;
        setTimeout(() => {
          statusDiv.textContent = '';
        }, 5000);
      });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 5000);
    }
  });
  
  gptPromptButton.addEventListener('click', async function() {
    try {
      statusDiv.textContent = 'Loading prompt...';
      fetch(chrome.runtime.getURL('content.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error('Could not load content.json. HTTP status: ' + response.status);
          }
          return response.json();
        })
        .then(async (contentData) => {
          
          if (!contentData.prompt || !contentData.prompt.length) {
            statusDiv.textContent = 'Error: Prompt text not found in content.json.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const promptText = contentData.prompt.join('\n');
          if (!promptText || promptText.trim() === '') {
            statusDiv.textContent = 'Error: prompt text is empty.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            statusDiv.textContent = 'Error: Could not get active tab.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: insertTextDirectly,
            args: [promptText]
          })
          .then(results => {
            const anySuccess = results.some(result => result.result === true);
            if (anySuccess) {
              statusDiv.textContent = 'Prompt inserted successfully!';
              setTimeout(() => {
                statusDiv.textContent = '';
              }, 2000);
            } else {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'insertGptPrompt',
                promptText: promptText
              }, 
              function(response) {
                if (response && response.success) {
                  statusDiv.textContent = 'Prompt inserted successfully!';
                } else {
                  statusDiv.textContent = 'Could not insert prompt. Please click inside a text field first.';
                }
                setTimeout(() => {
                  statusDiv.textContent = '';
                }, 3000);
              });
            }
          });
        })
        .catch(error => {
          statusDiv.textContent = 'Error loading content.json: ' + error.message;
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 3000);
        });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  });
  
  
  stripIntroButton.addEventListener('click', async function() {
    try {
      statusDiv.textContent = 'Loading intro text...';
      fetch(chrome.runtime.getURL('content.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error('Could not load content.json. HTTP status: ' + response.status);
          }
          return response.json();
        })
        .then(async (contentData) => {
          if (!contentData.intro || !contentData.intro.length || !contentData.intro[0].text) {
            statusDiv.textContent = 'Error: Intro text not found in content.json.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const introText = contentData.intro[0].text;
          if (!introText || introText.trim() === '') {
            statusDiv.textContent = 'Error: intro text is empty.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            statusDiv.textContent = 'Error: Could not get active tab.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: stripIntroDirectly,
            args: [introText]
          })
          .then(results => {
            const anySuccess = results.some(result => result.result === true);
            if (anySuccess) {
              statusDiv.textContent = 'Intro text successfully stripped!';
              setTimeout(() => {
                statusDiv.textContent = '';
              }, 2000);
            } else {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'stripIntro',
                introText: introText
              }, { frameId: 0 }, 
              function(response) {
                if (response && response.success) {
                  statusDiv.textContent = 'Intro text successfully stripped!';
                  setTimeout(() => {
                    statusDiv.textContent = '';
                  }, 2000);
                } else {
                  chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    function: directContentEditableBodyProcess,
                    args: [introText, null]
                  })
                  .then(results => {
                    const anySuccess = results.some(result => result.result === true);
                    if (anySuccess) {
                      statusDiv.textContent = 'Intro text successfully stripped!';
                    } else {
                      statusDiv.textContent = 'Could not strip intro text. Please click inside a text field first.';
                    }
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  })
                  .catch(error => {
                    statusDiv.textContent = 'Error executing script: ' + error.message;
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  });
                }
              });
            }
          })
          .catch(error => {
            statusDiv.textContent = 'Error executing script: ' + error.message;
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
          });
        })
        .catch(error => {
          statusDiv.textContent = 'Error loading content.json: ' + error.message;
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 3000);
        });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  });
  
  
  stripBonusButton.addEventListener('click', async function() {
    try {
      statusDiv.textContent = 'Loading bonus text...';
      fetch(chrome.runtime.getURL('content.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error('Could not load content.json. HTTP status: ' + response.status);
          }
          return response.json();
        })
        .then(async (contentData) => {
          if (!contentData.bonus || !contentData.bonus.length || !contentData.bonus[0].text) {
            statusDiv.textContent = 'Error: Bonus text not found in content.json.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const bonusText = contentData.bonus[0].text;
          if (!bonusText || bonusText.trim() === '') {
            statusDiv.textContent = 'Error: bonus text is empty.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            statusDiv.textContent = 'Error: Could not get active tab.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: stripBonusDirectly,
            args: [bonusText]
          })
          .then(results => {
            const anySuccess = results.some(result => result.result === true);
            if (anySuccess) {
              statusDiv.textContent = 'Bonus text successfully stripped!';
              setTimeout(() => {
                statusDiv.textContent = '';
              }, 2000);
            } else {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'stripBonus',
                bonusText: bonusText
              }, { frameId: 0 }, 
              function(response) {
                if (response && response.success) {
                  statusDiv.textContent = 'Bonus text successfully stripped!';
                } else {
                  chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    function: directContentEditableBodyProcess,
                    args: [null, bonusText]
                  })
                  .then(results => {
                    const anySuccess = results.some(result => result.result === true);
                    if (anySuccess) {
                      statusDiv.textContent = 'Bonus text successfully stripped!';
                    } else {
                      statusDiv.textContent = 'Could not strip bonus text. Please click inside a text field first.';
                    }
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  })
                  .catch(error => {
                    statusDiv.textContent = 'Error executing script: ' + error.message;
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  });
                }
              });
            }
          })
          .catch(error => {
            statusDiv.textContent = 'Error executing script: ' + error.message;
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
          });
        })
        .catch(error => {
          statusDiv.textContent = 'Error loading content.json: ' + error.message;
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 3000);
        });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  });
  insertGeneralButton.addEventListener('click', async function() {
    try {
      statusDiv.textContent = 'Loading general text...';
      fetch(chrome.runtime.getURL('content.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error('Could not load content.json. HTTP status: ' + response.status);
          }
          return response.json();
        })
        .then(async (contentData) => {
          if (!contentData.general || !contentData.general.length || !contentData.general[0].text) {
            statusDiv.textContent = 'Error: General text not found in content.json.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const generalText = contentData.general[0].text;
          if (!generalText || generalText.trim() === '') {
            statusDiv.textContent = 'Error: general text is empty.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            statusDiv.textContent = 'Error: Could not get active tab.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: insertTextDirectly,
            args: [generalText]
          })
          .then(results => {
            const anySuccess = results.some(result => result.result === true);
            if (anySuccess) {
              statusDiv.textContent = 'General text inserted successfully!';
              setTimeout(() => {
                statusDiv.textContent = '';
              }, 2000);
            } else {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'insertGeneralText',
                generalText: generalText
              }, { frameId: 0 }, 
              function(response) {
                if (response && response.success) {
                  statusDiv.textContent = 'General text inserted successfully!';
                  setTimeout(() => {
                    statusDiv.textContent = '';
                  }, 2000);
                } else {
                  chrome.tabs.sendMessage(tab.id, { 
                    action: 'insertGeneralText',
                    generalText: generalText
                  }, 
                  function(response) {
                    if (response && response.success) {
                      statusDiv.textContent = 'General text inserted successfully!';
                    } else {
                      statusDiv.textContent = 'Could not insert general text. Please click inside a text field first.';
                    }
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  });
                }
              });
            }
          })
          .catch(error => {
            statusDiv.textContent = 'Error executing script: ' + error.message;
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
          });
        })
        .catch(error => {
          statusDiv.textContent = 'Error loading content.json: ' + error.message;
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 3000);
        });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  });
  insertLanguageButton.addEventListener('click', async function() {
    try {
      statusDiv.textContent = 'Loading language text...';
      fetch(chrome.runtime.getURL('content.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error('Could not load content.json. HTTP status: ' + response.status);
          }
          return response.json();
        })
        .then(async (contentData) => {
          if (!contentData.language || !contentData.language.length || !contentData.language[0].text) {
            statusDiv.textContent = 'Error: Language text not found in content.json.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const languageText = contentData.language[0].text;
          if (!languageText || languageText.trim() === '') {
            statusDiv.textContent = 'Error: language text is empty.';
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            statusDiv.textContent = 'Error: Could not get active tab.';
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: insertTextDirectly,
            args: [languageText]
          })
          .then(results => {
            const anySuccess = results.some(result => result.result === true);
            if (anySuccess) {
              statusDiv.textContent = 'Language text inserted successfully!';
              setTimeout(() => {
                statusDiv.textContent = '';
              }, 2000);
            } else {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'insertLanguageText',
                languageText: languageText
              }, { frameId: 0 }, 
              function(response) {
                if (response && response.success) {
                  statusDiv.textContent = 'Language text inserted successfully!';
                  setTimeout(() => {
                    statusDiv.textContent = '';
                  }, 2000);
                } else {
                  chrome.tabs.sendMessage(tab.id, { 
                    action: 'insertLanguageText',
                    languageText: languageText
                  }, 
                  function(response) {
                    if (response && response.success) {
                      statusDiv.textContent = 'Language text inserted successfully!';
                    } else {
                      statusDiv.textContent = 'Could not insert language text. Please click inside a text field first.';
                    }
                    setTimeout(() => {
                      statusDiv.textContent = '';
                    }, 3000);
                  });
                }
              });
            }
          })
          .catch(error => {
            statusDiv.textContent = 'Error executing script: ' + error.message;
            setTimeout(() => {
              statusDiv.textContent = '';
            }, 3000);
          });
        })
        .catch(error => {
          statusDiv.textContent = 'Error loading content.json: ' + error.message;
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 3000);
        });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
  });
});

function diagnoseTextFieldIssue() {
  try {
    const activeElement = document.activeElement;
    if (!activeElement) {
      return "No active element found on the page.";
    }
    const details = {
      tagName: activeElement.tagName,
      id: activeElement.id,
      className: activeElement.className,
      contentEditable: activeElement.contentEditable,
      attributes: {},
      parentInfo: activeElement.parentElement ? {
        tagName: activeElement.parentElement.tagName,
        id: activeElement.parentElement.id,
        className: activeElement.parentElement.className,
        contentEditable: activeElement.parentElement.contentEditable
      } : null
    };
    for (const attr of activeElement.attributes) {
      details.attributes[attr.name] = attr.value;
    }
    const bodyEditable = document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true';
    const htmlEditable = document.documentElement.isContentEditable || document.documentElement.getAttribute('contenteditable') === 'true';
    if ((activeElement.tagName === 'BODY' || activeElement.tagName === 'HTML')) {
      if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
        const content = activeElement.innerHTML || activeElement.textContent;
        if (!content || content.trim() === '') {
          return "Editable body is empty. Add some markdown text first.";
        }
        if (!containsMarkdown(content)) {
          return "Text found in contenteditable body, but no markdown patterns were detected.";
        }
        return "Contenteditable body detected but couldn't process it for an unknown reason.";
      } else {
        const editableElements = document.querySelectorAll('[contenteditable="true"]');
        if (editableElements.length > 0) {
          return "Found " + editableElements.length + " contenteditable elements, but none are focused. Click inside the text field first.";
        }
        return "No input field is focused. Click inside a text field first.";
      }
    }
    if (activeElement.tagName === 'IFRAME') {
      try {
        const iframeDoc = activeElement.contentDocument || activeElement.contentWindow.document;
        if (!iframeDoc) {
          return "Found iframe but couldn't access its content (possible cross-origin issue).";
        }
        const iframeBody = iframeDoc.body;
        if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
          return "Found contenteditable body inside iframe, but couldn't access it properly. Try clicking directly inside the text area.";
        }
      } catch (e) {
        return "Found iframe but blocked from accessing it due to security restrictions.";
      }
    }
    if (activeElement.tagName === 'TEXTAREA' || 
       (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const content = activeElement.value;
      if (!content || content.trim() === '') {
        return "Text field is empty. Add some markdown text first.";
      }
      if (!containsMarkdown(content)) {
        return "Text field contains text, but no markdown patterns were detected.";
      }
      return "Text field detected but couldn't process it for an unknown reason.";
    }
    if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
      const content = activeElement.innerHTML;
      if (!content || content.trim() === '') {
        return "Editable area is empty. Add some markdown text first.";
      }
      return "Editable area detected but couldn't process it. The editor might be using a custom format.";
    }
    try {
      if (window !== window.top) {
        return "Extension is running in a frame. Try clicking the extension button when focused on the main page.";
      }
    } catch (e) {
    }
    return "Clicked element is not a standard text input. Element: " + activeElement.tagName + 
           (activeElement.className ? " (class: " + activeElement.className + ")" : "") + 
           ". Try clicking directly inside a text field.";
  } catch (error) {
    console.error('Diagnosis error:', error);
    return "Error during diagnosis: " + error.message;
  }
}

function stripMarkdownFromActiveElement() {
  try {
    const activeElement = document.activeElement;
    const bodyEditor = document.querySelector('body.input-editor[contenteditable="true"]');
    if (bodyEditor) {
      const content = bodyEditor.textContent || bodyEditor.innerHTML;
      if (content) {
        const strippedContent = stripMarkdown(content);
        bodyEditor.textContent = strippedContent;
        return true;
      }
    }
    if ((activeElement.tagName === 'BODY' || activeElement.tagName === 'HTML') && 
        (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true')) {
      let content = activeElement.innerHTML || activeElement.textContent;
      if (content) {
        const strippedContent = stripMarkdown(content);
        try {
          activeElement.innerHTML = strippedContent;
        } catch (e) {
          activeElement.textContent = strippedContent;
        }
        return true;
      }
    }
    if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
      let content = document.body.innerHTML || document.body.textContent;
      if (content) {
        const strippedContent = stripMarkdown(content);
        try {
          document.body.innerHTML = strippedContent;
        } catch (e) {
          document.body.textContent = strippedContent;
        }
        return true;
      }
    }
    if (activeElement.tagName === 'IFRAME') {
      try {
        const iframeDoc = activeElement.contentDocument || activeElement.contentWindow.document;
        const iframeActiveElement = iframeDoc.activeElement;
        if (iframeActiveElement && (
            iframeActiveElement.tagName === 'TEXTAREA' || 
            iframeActiveElement.tagName === 'INPUT' && iframeActiveElement.type === 'text' ||
            iframeActiveElement.isContentEditable
        )) {
          let content;
          if (iframeActiveElement.isContentEditable) {
            content = iframeActiveElement.innerHTML;
          } else {
            content = iframeActiveElement.value;
          }
          const strippedContent = stripMarkdown(content);
          if (iframeActiveElement.isContentEditable) {
            iframeActiveElement.innerHTML = strippedContent;
          } else {
            iframeActiveElement.value = strippedContent;
          }
          return true;
        }
      } catch (e) {
        console.error("Could not access iframe content:", e);
      }
    }
    if (activeElement && (
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'INPUT' && activeElement.type === 'text' ||
        activeElement.isContentEditable
    )) {
      let content;
      if (activeElement.isContentEditable) {
        content = activeElement.innerHTML;
      } else {
        content = activeElement.value;
      }
      const strippedContent = stripMarkdown(content);
      if (activeElement.isContentEditable) {
        activeElement.innerHTML = strippedContent;
      } else {
        activeElement.value = strippedContent;
      }
      return true;
    }
    const possibleEditors = [
      document.querySelector('body.input-editor[contenteditable="true"]'),
      document.querySelector('body[contenteditable="true"]'),
      document.querySelector('html[contenteditable="true"]'),
      document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true' ? document.body : null,
      document.documentElement.isContentEditable || document.documentElement.getAttribute('contenteditable') === 'true' ? document.documentElement : null,
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.tox-edit-area__iframe'),
      document.querySelector('.tox-tinymce'),
      document.querySelector('.note-editable'),
      document.querySelector('.input-editor'),
    ].filter(Boolean); 
    for (const editor of possibleEditors) {
      let content;
      let updateMethod;
      if (editor.tagName === 'BODY' || editor.tagName === 'HTML') {
        content = editor.innerHTML;
        updateMethod = () => editor.innerHTML = stripMarkdown(content);
      } else if (editor.classList && editor.classList.contains('CodeMirror')) {
        const cm = editor.CodeMirror;
        if (cm) {
          content = cm.getValue();
          updateMethod = () => cm.setValue(stripMarkdown(content));
        }
      } else if (editor.classList && editor.classList.contains('ql-editor')) {
        content = editor.innerHTML;
        updateMethod = () => editor.innerHTML = stripMarkdown(content);
      } else if (editor.isContentEditable || editor.getAttribute('role') === 'textbox') {
        content = editor.innerHTML;
        updateMethod = () => editor.innerHTML = stripMarkdown(content);
      } else if (editor.classList && (editor.classList.contains('tox-edit-area__iframe') || editor.classList.contains('tox-tinymce'))) {
        try {
          const iframe = editor.querySelector('iframe');
          if (iframe) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const body = iframeDoc.body;
            content = body.innerHTML;
            updateMethod = () => body.innerHTML = stripMarkdown(content);
          }
        } catch (e) {
          console.error("Could not access TinyMCE content:", e);
          continue;
        }
      }
      if (content && updateMethod) {
        updateMethod();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error in stripMarkdownFromActiveElement:', error);
    return false;
  }
}

function stripMarkdown(text) {
  if (!text) return '';
  const paragraphs = text.split(/\n\s*\n/);
  let result = '';
  for (let i = 0; i < paragraphs.length; i++) {
    let paragraph = paragraphs[i];
    paragraph = paragraph.replace(/^#{1,6}\s+/gm, '');
    paragraph = paragraph.replace(/(\*\*\*|___)(.*?)\1/g, '$2'); 
    paragraph = paragraph.replace(/(\*\*|__)(.*?)\1/g, '$2');    
    paragraph = paragraph.replace(/(\*|_)(.*?)\1/g, '$2');       
    paragraph = paragraph.replace(/\[(.*?)\]\((.*?)(\s+".*?")?\)/g, '$1'); 
    paragraph = paragraph.replace(/\[(.*?)\]\[(.*?)\]/g, '$1');            
    paragraph = paragraph.replace(/!\[(.*?)\]\((.*?)(\s+".*?")?\)/g, '$1');
    paragraph = paragraph.replace(/```(?:\w+)?\n([\s\S]*?)\n```/g, '$1');
    paragraph = paragraph.replace(/```([\s\S]*?)```/g, '$1');
    paragraph = paragraph.replace(/`(.*?)`/g, '$1');
    paragraph = paragraph.replace(/^(\s*>)+\s*/gm, '');
    paragraph = paragraph.replace(/^\s*([-*_])\s*(?:\1\s*){2,}$/gm, '');
    paragraph = paragraph.replace(/^(\s*)[-*+]\s+/gm, '');
    paragraph = paragraph.replace(/^(\s*)\d+\.\s+/gm, '');
    paragraph = paragraph.replace(/~~(.*?)~~?/g, '$1');
    paragraph = paragraph.replace(/^\s*- \[([ x])\]\s+/gm, '');
    paragraph = paragraph.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
    paragraph = paragraph.replace(/^\|(.+)\|$/gm, '$1');           
    paragraph = paragraph.replace(/^\|-+\|$/gm, '');               
    paragraph = paragraph.replace(/\[\^(\d+)\](?:\[(.*?)\])?/g, '');
    paragraph = paragraph.replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1');
    paragraph = paragraph.replace(/[ \t]+/g, ' ').trim();
    result += paragraph + (i < paragraphs.length - 1 ? '\n\n' : '');
  }
  return result;
}


function directContentEditableBodyProcess(introText, bonusText) {
  if (bonusText) {
    return directBonusStrippingProcess(bonusText);
  }
  if (introText) {
    return directIntroStrippingProcess(introText);
  }
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        continue;
      }
      const iframeBody = iframeDoc.body;
      if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
        const content = iframeBody.textContent || iframeBody.innerHTML;
        if (content) {
          iframeBody.textContent = stripMarkdown(content);
          return true;
        }
      }
      const editableElementsInIframe = iframeDoc.querySelectorAll('[contenteditable="true"]');
      for (const element of editableElementsInIframe) {
        const content = element.textContent || element.innerHTML;
        if (content) {
          element.textContent = stripMarkdown(content);
          return true;
        }
      }
      const iframeActive = iframeDoc.activeElement;
      if (iframeActive && (
          iframeActive.tagName === 'TEXTAREA' || 
          iframeActive.tagName === 'INPUT' && iframeActive.type === 'text' ||
          iframeActive.isContentEditable
      )) {
        let content;
        if (iframeActive.isContentEditable) {
          content = iframeActive.innerHTML;
        } else {
          content = iframeActive.value;
        }
        if (content) {
          const strippedContent = stripMarkdown(content);
          if (iframeActive.isContentEditable) {
            iframeActive.innerHTML = strippedContent;
          } else {
            iframeActive.value = strippedContent;
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error accessing iframe:', e);
    }
  }
  const bodyEditor = document.querySelector('body.input-editor[contenteditable="true"]');
  if (bodyEditor) {
    const content = bodyEditor.textContent || bodyEditor.innerHTML;
    if (content) {
      bodyEditor.textContent = stripMarkdown(content);
      return true;
    }
  }
  if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
    const content = document.body.textContent || document.body.innerHTML;
    if (content) {
      document.body.textContent = stripMarkdown(content);
      return true;
    }
  }
  if (document.documentElement.isContentEditable || document.documentElement.getAttribute('contenteditable') === 'true') {
    const content = document.documentElement.textContent || document.documentElement.innerHTML;
    if (content) {
      document.documentElement.textContent = stripMarkdown(content);
      return true;
    }
  }
  const editableElements = document.querySelectorAll('[contenteditable="true"]');
  for (const element of editableElements) {
    const content = element.textContent || element.innerHTML;
    if (content) {
      element.textContent = stripMarkdown(content);
      return true;
    }
  }
  return false;
}

function processIframesDirectly() {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        continue;
      }
      const iframeBody = iframeDoc.body;
      if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
        const content = iframeBody.textContent || iframeBody.innerHTML;
        if (content && content.trim() !== '') {
          iframeBody.textContent = stripMarkdown(content);
          return true;
        }
      }
      const editableElements = iframeDoc.querySelectorAll('[contenteditable="true"]');
      for (const el of editableElements) {
        const content = el.textContent || el.innerHTML;
        if (content && content.trim() !== '') {
          el.textContent = stripMarkdown(content);
          return true;
        }
      }
      if (iframe.classList.contains('input-editor')) {
        const iframeBodyContent = iframeDoc.body.textContent || iframeDoc.body.innerHTML;
        if (iframeBodyContent && iframeBodyContent.trim() !== '') {
          iframeDoc.body.textContent = stripMarkdown(iframeBodyContent);
          return true;
        }
      }
      const possibleEditors = [
        iframeDoc.querySelector('[role="textbox"]'),
        iframeDoc.querySelector('.CodeMirror'),
        iframeDoc.querySelector('.ql-editor'),
        iframeDoc.querySelector('.ProseMirror'),
        iframeDoc.querySelector('.input-editor')
      ].filter(Boolean);
      for (const editor of possibleEditors) {
        const content = editor.textContent || editor.innerHTML;
        if (content && content.trim() !== '') {
          editor.textContent = stripMarkdown(content);
          return true;
        }
      }
    } catch (e) {
      console.error('Error processing iframe:', e);
    }
  }
  return false;
}

function stripIntroFromActiveElement(introText) {
  try {
    const activeElement = document.activeElement;
    let content = null;
    let updateMethod = null;
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        const strippedSelection = stripIntroText(selectedText, introText);
        if (selectedText !== strippedSelection) {
          content = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          updateMethod = () => {
            activeElement.value = content;
            activeElement.selectionStart = start;
            activeElement.selectionEnd = start + strippedSelection.length;
          };
        }
      } else {
        content = fullValue;
        const strippedContent = stripIntroText(content, introText);
        if (content !== strippedContent) {
          updateMethod = () => {
            activeElement.value = strippedContent;
            activeElement.selectionStart = activeElement.selectionEnd = start;
          };
        }
      }
    } 
    else if (activeElement.isContentEditable || 
             activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedSelection = stripIntroText(selectedText, introText);
        if (selectedText !== strippedSelection) {
          updateMethod = () => {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          };
        }
      } else {
        content = activeElement.innerHTML;
        const strippedContent = stripIntroText(content, introText);
        if (content !== strippedContent) {
          updateMethod = () => {
            activeElement.innerHTML = strippedContent;
          };
        }
      }
    }
    else if (activeElement.tagName === 'IFRAME') {
      try {
        const iframeDoc = activeElement.contentDocument || activeElement.contentWindow.document;
        const iframeActive = iframeDoc.activeElement;
        const iframeBody = iframeDoc.body;
        if (iframeActive && (
            iframeActive.tagName === 'TEXTAREA' || 
            iframeActive.tagName === 'INPUT' && iframeActive.type === 'text')) {
          const start = iframeActive.selectionStart;
          const end = iframeActive.selectionEnd;
          const fullValue = iframeActive.value;
          if (start !== end) {
            const selectedText = fullValue.substring(start, end);
            const strippedSelection = stripIntroText(selectedText, introText);
            if (selectedText !== strippedSelection) {
              content = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
              updateMethod = () => {
                iframeActive.value = content;
                iframeActive.selectionStart = start;
                iframeActive.selectionEnd = start + strippedSelection.length;
              };
            }
          } else {
            content = fullValue;
            updateMethod = () => iframeActive.value = stripIntroText(content, introText);
          }
        } 
        else if (iframeActive && (
            iframeActive.isContentEditable || 
            iframeActive.getAttribute('contenteditable') === 'true')) {
          const iframeSelection = iframeDoc.getSelection();
          if (iframeSelection && iframeSelection.rangeCount > 0 && iframeSelection.toString().trim() !== '') {
            const range = iframeSelection.getRangeAt(0);
            const selectedText = iframeSelection.toString();
            const strippedSelection = stripIntroText(selectedText, introText);
            if (selectedText !== strippedSelection) {
              updateMethod = () => {
                range.deleteContents();
                const textNode = iframeDoc.createTextNode(strippedSelection);
                range.insertNode(textNode);
                range.selectNodeContents(textNode);
                iframeSelection.removeAllRanges();
                iframeSelection.addRange(range);
              };
            }
          } else {
            content = iframeActive.innerHTML;
            updateMethod = () => iframeActive.innerHTML = stripIntroText(content, introText);
          }
        }
        else if (iframeBody && (
            iframeBody.isContentEditable || 
            iframeBody.getAttribute('contenteditable') === 'true')) {
          content = iframeBody.innerHTML;
          updateMethod = () => iframeBody.innerHTML = stripIntroText(content, introText);
        }
      } catch (e) {
        console.error("Could not access iframe content:", e);
      }
    }
    if (!content && !updateMethod && window.tinymce) {
      try {
        const tinyMCEInstance = tinymce.activeEditor;
        if (tinyMCEInstance) {
          const selection = tinyMCEInstance.selection.getContent();
          if (selection && selection.trim() !== '') {
            const strippedSelection = stripIntroText(selection, introText);
            if (selection !== strippedSelection) {
              updateMethod = () => {
                tinyMCEInstance.selection.setContent(strippedSelection);
              };
            }
          } else {
            content = tinyMCEInstance.getContent();
            updateMethod = () => tinyMCEInstance.setContent(stripIntroText(content, introText));
          }
        }
      } catch (e) {
        console.error("Could not access TinyMCE content:", e);
      }
    }
    if (!content && !updateMethod) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.id && iframe.id.includes('mce')) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const body = iframeDoc.body;
            content = body.innerHTML;
            updateMethod = () => body.innerHTML = stripIntroText(content, introText);
          }
        } catch (e) {
          console.error("Could not access TinyMCE content:", e);
          continue;
        }
      }
    }
    if (updateMethod) {
      updateMethod();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in stripIntroFromActiveElement:', error);
    return false;
  }
}

function stripIntroText(content, introText) {
  if (!content || !introText) return content;
  const div = document.createElement('div');
  div.innerHTML = introText;
  const cleanIntroText = div.textContent;
  const isHTML = /<[^>]*>/g.test(content);
  if (isHTML) {
    div.innerHTML = content;
    let textContent = div.textContent;
    if (textContent.startsWith(cleanIntroText)) {
      textContent = textContent.slice(cleanIntroText.length).trim();
      let tempContent = content;
      let currentIndex = 0;
      const walker = document.createTreeWalker(
        div, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      let introRemaining = cleanIntroText.length;
      let nodeStart = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeText = node.nodeValue;
        if (introRemaining <= 0) break;
        if (introRemaining >= nodeText.length) {
          introRemaining -= nodeText.length;
          currentIndex += nodeText.length;
        } else {
          currentIndex += introRemaining;
          break;
        }
      }
      if (currentIndex > 0 && currentIndex < content.length) {
        return content.substring(currentIndex).trim();
      }
      return content;
    }
    return content;
  } else {
    if (content.startsWith(cleanIntroText)) {
      return content.slice(cleanIntroText.length).trim();
    }
    return content;
  }
}

function directIntroStrippingProcess(introText) {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        continue;
      }
      const iframeBody = iframeDoc.body;
      if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
        const content = iframeBody.textContent || iframeBody.innerHTML;
        if (content) {
          iframeBody.innerHTML = stripIntroText(content, introText);
          return true;
        }
      }
      const editableElementsInIframe = iframeDoc.querySelectorAll('[contenteditable="true"]');
      for (const element of editableElementsInIframe) {
        const content = element.textContent || element.innerHTML;
        if (content) {
          element.innerHTML = stripIntroText(content, introText);
          return true;
        }
      }
      const iframeActive = iframeDoc.activeElement;
      if (iframeActive && (
          iframeActive.tagName === 'TEXTAREA' || 
          iframeActive.tagName === 'INPUT' && iframeActive.type === 'text' ||
          iframeActive.isContentEditable
      )) {
        let content;
        if (iframeActive.isContentEditable) {
          content = iframeActive.innerHTML;
        } else {
          content = iframeActive.value;
        }
        if (content) {
          const strippedContent = stripIntroText(content, introText);
          if (iframeActive.isContentEditable) {
            iframeActive.innerHTML = strippedContent;
          } else {
            iframeActive.value = strippedContent;
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error accessing iframe for intro stripping:', e);
    }
  }
  if (stripIntroFromActiveElement(introText)) {
    return true;
  }
  const bodyEditor = document.querySelector('body.input-editor[contenteditable="true"]');
  if (bodyEditor) {
    const content = bodyEditor.textContent || bodyEditor.innerHTML;
    if (content) {
      bodyEditor.innerHTML = stripIntroText(content, introText);
      return true;
    }
  }
  if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
    const content = document.body.textContent || document.body.innerHTML;
    if (content) {
      document.body.innerHTML = stripIntroText(content, introText);
      return true;
    }
  }
  const editableElements = document.querySelectorAll('[contenteditable="true"]');
  for (const element of editableElements) {
    const content = element.textContent || element.innerHTML;
    if (content) {
      element.innerHTML = stripIntroText(content, introText);
      return true;
    }
  }
  return false;
}

function directBonusStrippingProcess(bonusText) {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        continue;
      }
      const iframeBody = iframeDoc.body;
      if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
        const content = iframeBody.textContent || iframeBody.innerHTML;
        if (content) {
          iframeBody.innerHTML = stripBonusText(content, bonusText);
          return true;
        }
      }
      const editableElementsInIframe = iframeDoc.querySelectorAll('[contenteditable="true"]');
      for (const element of editableElementsInIframe) {
        const content = element.textContent || element.innerHTML;
        if (content) {
          element.innerHTML = stripBonusText(content, bonusText);
          return true;
        }
      }
      const iframeActive = iframeDoc.activeElement;
      if (iframeActive && (
          iframeActive.tagName === 'TEXTAREA' || 
          iframeActive.tagName === 'INPUT' && iframeActive.type === 'text' ||
          iframeActive.isContentEditable
      )) {
        let content;
        if (iframeActive.isContentEditable) {
          content = iframeActive.innerHTML;
        } else {
          content = iframeActive.value;
        }
        if (content) {
          const strippedContent = stripBonusText(content, bonusText);
          if (iframeActive.isContentEditable) {
            iframeActive.innerHTML = strippedContent;
          } else {
            iframeActive.value = strippedContent;
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error accessing iframe for bonus stripping:', e);
    }
  }
  if (stripBonusFromActiveElement(bonusText)) {
    return true;
  }
  const bodyEditor = document.querySelector('body.input-editor[contenteditable="true"]');
  if (bodyEditor) {
    const content = bodyEditor.textContent || bodyEditor.innerHTML;
    if (content) {
      bodyEditor.innerHTML = stripBonusText(content, bonusText);
      return true;
    }
  }
  if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
    const content = document.body.textContent || document.body.innerHTML;
    if (content) {
      document.body.innerHTML = stripBonusText(content, bonusText);
      return true;
    }
  }
  const editableElements = document.querySelectorAll('[contenteditable="true"]');
  for (const element of editableElements) {
    const content = element.textContent || element.innerHTML;
    if (content) {
      element.innerHTML = stripBonusText(content, bonusText);
      return true;
    }
  }
  return false;
}

function stripBonusFromActiveElement(bonusText) {
  try {
    const activeElement = document.activeElement;
    let content = null;
    let updateMethod = null;
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        const strippedSelection = stripBonusText(selectedText, bonusText);
        if (selectedText !== strippedSelection) {
          content = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          updateMethod = () => {
            activeElement.value = content;
            activeElement.selectionStart = start;
            activeElement.selectionEnd = start + strippedSelection.length;
          };
        }
      } else {
        content = fullValue;
        const strippedContent = stripBonusText(content, bonusText);
        if (content !== strippedContent) {
          updateMethod = () => {
            activeElement.value = strippedContent;
            activeElement.selectionStart = activeElement.selectionEnd = start;
          };
        }
      }
    } 
    else if (activeElement.isContentEditable || 
             activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedSelection = stripBonusText(selectedText, bonusText);
        if (selectedText !== strippedSelection) {
          updateMethod = () => {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          };
        }
      } else {
        content = activeElement.innerHTML;
        const strippedContent = stripBonusText(content, bonusText);
        if (content !== strippedContent) {
          updateMethod = () => {
            activeElement.innerHTML = strippedContent;
          };
        }
      }
    }
    else if (activeElement.tagName === 'IFRAME') {
      try {
        const iframeDoc = activeElement.contentDocument || activeElement.contentWindow.document;
        const iframeActive = iframeDoc.activeElement;
        const iframeBody = iframeDoc.body;
        if (iframeActive && (
            iframeActive.tagName === 'TEXTAREA' || 
            iframeActive.tagName === 'INPUT' && iframeActive.type === 'text')) {
          const start = iframeActive.selectionStart;
          const end = iframeActive.selectionEnd;
          const fullValue = iframeActive.value;
          if (start !== end) {
            const selectedText = fullValue.substring(start, end);
            const strippedSelection = stripBonusText(selectedText, bonusText);
            if (selectedText !== strippedSelection) {
              content = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
              updateMethod = () => {
                iframeActive.value = content;
                iframeActive.selectionStart = start;
                iframeActive.selectionEnd = start + strippedSelection.length;
              };
            }
          } else {
            content = fullValue;
            updateMethod = () => iframeActive.value = stripBonusText(content, bonusText);
          }
        } 
        else if (iframeActive && (
            iframeActive.isContentEditable || 
            iframeActive.getAttribute('contenteditable') === 'true')) {
          const iframeSelection = iframeDoc.getSelection();
          if (iframeSelection && iframeSelection.rangeCount > 0 && iframeSelection.toString().trim() !== '') {
            const range = iframeSelection.getRangeAt(0);
            const selectedText = iframeSelection.toString();
            const strippedSelection = stripBonusText(selectedText, bonusText);
            if (selectedText !== strippedSelection) {
              updateMethod = () => {
                range.deleteContents();
                const textNode = iframeDoc.createTextNode(strippedSelection);
                range.insertNode(textNode);
                range.selectNodeContents(textNode);
                iframeSelection.removeAllRanges();
                iframeSelection.addRange(range);
              };
            }
          } else {
            content = iframeActive.innerHTML;
            updateMethod = () => iframeActive.innerHTML = stripBonusText(content, bonusText);
          }
        }
        else if (iframeBody && (
            iframeBody.isContentEditable || 
            iframeBody.getAttribute('contenteditable') === 'true')) {
          content = iframeBody.innerHTML;
          updateMethod = () => iframeBody.innerHTML = stripBonusText(content, bonusText);
        }
      } catch (e) {
        console.error("Could not access iframe content:", e);
      }
    }
    if (!content && !updateMethod && window.tinymce) {
      try {
        const tinyMCEInstance = tinymce.activeEditor;
        if (tinyMCEInstance) {
          const selection = tinyMCEInstance.selection.getContent();
          if (selection && selection.trim() !== '') {
            const strippedSelection = stripBonusText(selection, bonusText);
            if (selection !== strippedSelection) {
              updateMethod = () => {
                tinyMCEInstance.selection.setContent(strippedSelection);
              };
            }
          } else {
            content = tinyMCEInstance.getContent();
            updateMethod = () => tinyMCEInstance.setContent(stripBonusText(content, bonusText));
          }
        }
      } catch (e) {
        console.error("Could not access TinyMCE content:", e);
      }
    }
    if (!content && !updateMethod) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.id && iframe.id.includes('mce')) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const body = iframeDoc.body;
            content = body.innerHTML;
            updateMethod = () => body.innerHTML = stripBonusText(content, bonusText);
          }
        } catch (e) {
          console.error("Could not access TinyMCE content:", e);
          continue;
        }
      }
    }
    if (updateMethod) {
      updateMethod();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in stripBonusFromActiveElement:', error);
    return false;
  }
}


function stripBonusText(content, bonusText) {
  if (!content || !bonusText) return content;
  const div = document.createElement('div');
  div.innerHTML = bonusText;
  const cleanBonusText = div.textContent;
  const isHTML = /<[^>]*>/g.test(content);
  if (isHTML) {
    div.innerHTML = content;
    let textContent = div.textContent;
    const bonusIndex = textContent.indexOf(cleanBonusText);
    if (bonusIndex >= 0) {
      const beforeBonus = textContent.substring(0, bonusIndex);
      const afterBonus = textContent.substring(bonusIndex + cleanBonusText.length);
      textContent = beforeBonus + afterBonus;
      let tempContent = content;
      let currentIndex = 0;
      let currentTextLength = 0;
      let bonusFound = false;
      const walker = document.createTreeWalker(
        div, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      let bonusStartIndex = -1;
      let bonusEndIndex = -1;
      while (walker.nextNode() && !bonusFound) {
        const node = walker.currentNode;
        const nodeText = node.nodeValue;
        if (currentTextLength <= bonusIndex && bonusIndex < currentTextLength + nodeText.length) {
          const relativeStart = bonusIndex - currentTextLength;
          bonusStartIndex = currentIndex + relativeStart;
          let remainingBonusLength = cleanBonusText.length;
          let currentNodeTextIndex = relativeStart;
          if (relativeStart + remainingBonusLength <= nodeText.length) {
            bonusEndIndex = bonusStartIndex + remainingBonusLength;
            bonusFound = true;
          } else {
            remainingBonusLength -= (nodeText.length - relativeStart);
            currentIndex += nodeText.length;
            while (walker.nextNode() && remainingBonusLength > 0) {
              const nextNode = walker.currentNode;
              const nextNodeText = nextNode.nodeValue;
              if (remainingBonusLength <= nextNodeText.length) {
                bonusEndIndex = currentIndex + remainingBonusLength;
                bonusFound = true;
                break;
              } else {
                remainingBonusLength -= nextNodeText.length;
                currentIndex += nextNodeText.length;
              }
            }
          }
        }
        currentTextLength += nodeText.length;
        currentIndex += nodeText.length;
      }
      if (bonusFound && bonusStartIndex >= 0 && bonusEndIndex > bonusStartIndex) {
        return content.substring(0, bonusStartIndex) + content.substring(bonusEndIndex);
      }
    }
    return content;
  } else {
    const bonusIndex = content.indexOf(cleanBonusText);
    if (bonusIndex >= 0) {
      return content.substring(0, bonusIndex) + content.substring(bonusIndex + cleanBonusText.length);
    }
    return content;
  }
}

function stripIntroDirectly(introText) {
  try {
    const activeElement = document.activeElement;
    const div = document.createElement('div');
    div.innerHTML = introText;
    const cleanIntroText = div.textContent.trim(); 
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        if (selectedText.startsWith(cleanIntroText)) {
          const strippedSelection = selectedText.substring(cleanIntroText.length).trim();
          activeElement.value = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          activeElement.selectionStart = start;
          activeElement.selectionEnd = start + strippedSelection.length;
          return true;
        }
        const normalizedSelectedText = selectedText.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedSelectedText.startsWith(normalizedIntroText)) {
          const strippedSelection = normalizedSelectedText.substring(normalizedIntroText.length).trim();
          activeElement.value = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          activeElement.selectionStart = start;
          activeElement.selectionEnd = start + strippedSelection.length;
          return true;
        }
      } else {
        if (fullValue.includes(cleanIntroText)) {
          const introIndex = fullValue.indexOf(cleanIntroText);
          if (introIndex >= 0) {
            const newContent = fullValue.substring(0, introIndex) + 
                              fullValue.substring(introIndex + cleanIntroText.length);
            activeElement.value = newContent;
            activeElement.selectionStart = activeElement.selectionEnd = introIndex;
            console.log('Successfully stripped intro text from input field');
            return true;
          }
        }
        const normalizedFullValue = fullValue.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedFullValue.startsWith(normalizedIntroText)) {
          const newContent = normalizedFullValue.substring(normalizedIntroText.length).trim();
          activeElement.value = newContent;
          return true;
        }
      }
    }
    else if (activeElement.isContentEditable || 
            activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.startsWith(cleanIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.substring(cleanIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        const normalizedSelectedText = selectedText.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedSelectedText.startsWith(normalizedIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = normalizedSelectedText.substring(normalizedIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = activeElement.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanIntroText)) {
          activeElement.innerHTML = content.replace(cleanIntroText, '');
          return true;
        }
        const normalizedTextContent = textContent.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedTextContent.startsWith(normalizedIntroText)) {
          const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const introRegex = new RegExp('^\\s*' + escapeRegExp(normalizedIntroText));
          activeElement.innerHTML = content.replace(introRegex, '');
          return true;
        }
      }
    }
    else if (activeElement.tagName === 'BODY' && document.body.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.startsWith(cleanIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.substring(cleanIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        const normalizedSelectedText = selectedText.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedSelectedText.startsWith(normalizedIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = normalizedSelectedText.substring(normalizedIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = document.body.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanIntroText)) {
          document.body.innerHTML = content.replace(cleanIntroText, '');
          return true;
        }
        const normalizedTextContent = textContent.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedTextContent.startsWith(normalizedIntroText)) {
          const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const introRegex = new RegExp('^\\s*' + escapeRegExp(normalizedIntroText));
          document.body.innerHTML = content.replace(introRegex, '');
          return true;
        }
      }
    }
    const editors = [
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor'),
      document.querySelector('.tox-edit-area__iframe'),
      document.querySelector('.note-editable')
    ].filter(Boolean);
    for (const editor of editors) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && 
          editor.contains(selection.anchorNode) && 
          selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.startsWith(cleanIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.substring(cleanIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
        const normalizedSelectedText = selectedText.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedSelectedText.startsWith(normalizedIntroText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = normalizedSelectedText.substring(normalizedIntroText.length).trim();
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = editor.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanIntroText)) {
          editor.innerHTML = content.replace(cleanIntroText, '');
          return true;
        }
        const normalizedTextContent = textContent.trim();
        const normalizedIntroText = cleanIntroText.trim();
        if (normalizedTextContent.startsWith(normalizedIntroText)) {
          const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const introRegex = new RegExp('^\\s*' + escapeRegExp(normalizedIntroText));
          editor.innerHTML = content.replace(introRegex, '');
          return true;
        }
      }
    }
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) continue;
        const iframeBody = iframeDoc.body;
        if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
          const content = iframeBody.innerHTML;
          div.innerHTML = content;
          const textContent = div.textContent;
          if (textContent.includes(cleanIntroText)) {
            iframeBody.innerHTML = content.replace(cleanIntroText, '');
            return true;
          }
          const normalizedTextContent = textContent.trim();
          const normalizedIntroText = cleanIntroText.trim();
          if (normalizedTextContent.startsWith(normalizedIntroText)) {
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const introRegex = new RegExp('^\\s*' + escapeRegExp(normalizedIntroText));
            iframeBody.innerHTML = content.replace(introRegex, '');
            return true;
          }
        }
        const editables = iframeDoc.querySelectorAll('[contenteditable="true"]');
        for (const editable of editables) {
          const content = editable.innerHTML;
          div.innerHTML = content;
          const textContent = div.textContent;
          if (textContent.includes(cleanIntroText)) {
            editable.innerHTML = content.replace(cleanIntroText, '');
            return true;
          }
          const normalizedTextContent = textContent.trim();
          const normalizedIntroText = cleanIntroText.trim();
          if (normalizedTextContent.startsWith(normalizedIntroText)) {
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const introRegex = new RegExp('^\\s*' + escapeRegExp(normalizedIntroText));
            editable.innerHTML = content.replace(introRegex, '');
            return true;
          }
        }
      } catch (e) {
        console.error('Error accessing iframe for intro stripping:', e);
      }
    }
    return false;
  } catch (e) {
    console.error('Error in stripIntroDirectly:', e);
    return false;
  }
}

function stripBonusDirectly(bonusText) {
  try {
    const activeElement = document.activeElement;
    const div = document.createElement('div');
    div.innerHTML = bonusText;
    const cleanBonusText = div.textContent.trim(); 
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        if (selectedText.includes(cleanBonusText)) {
          const strippedSelection = selectedText.replace(cleanBonusText, '');
          activeElement.value = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          activeElement.selectionStart = start;
          activeElement.selectionEnd = start + strippedSelection.length;
          return true;
        }
      } else {
        if (fullValue.includes(cleanBonusText)) {
          const bonusIndex = fullValue.indexOf(cleanBonusText);
          if (bonusIndex >= 0) {
            const newContent = fullValue.substring(0, bonusIndex) + 
                              fullValue.substring(bonusIndex + cleanBonusText.length);
            activeElement.value = newContent;
            activeElement.selectionStart = activeElement.selectionEnd = bonusIndex;
            return true;
          }
        }
        const normalizedFullValue = fullValue.trim();
        const normalizedBonusText = cleanBonusText.trim();
        if (normalizedFullValue.endsWith(normalizedBonusText)) {
          const newContent = normalizedFullValue.substring(0, normalizedFullValue.length - normalizedBonusText.length).trim();
          activeElement.value = newContent;
          return true;
        }
      }
    }
    else if (activeElement.isContentEditable || 
            activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.includes(cleanBonusText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.replace(cleanBonusText, '');
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = activeElement.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanBonusText)) {
          activeElement.innerHTML = content.replace(cleanBonusText, '');
          return true;
        }
        const normalizedTextContent = textContent.trim();
      }
    }
    else if (activeElement.tagName === 'BODY' && document.body.isContentEditable) {
      const div = document.createElement('div');
      div.innerHTML = bonusText;
      const cleanBonusText = div.textContent;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.includes(cleanBonusText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.replace(cleanBonusText, '');
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = document.body.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanBonusText)) {
          document.body.innerHTML = content.replace(cleanBonusText, '');
          return true;
        }
      }
    }
    const editors = [
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor'),
      document.querySelector('.tox-edit-area__iframe'),
      document.querySelector('.note-editable')
    ].filter(Boolean);
    for (const editor of editors) {
      const div = document.createElement('div');
      div.innerHTML = bonusText;
      const cleanBonusText = div.textContent;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && 
          editor.contains(selection.anchorNode) && 
          selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        if (selectedText.includes(cleanBonusText)) {
          const range = selection.getRangeAt(0);
          const strippedSelection = selectedText.replace(cleanBonusText, '');
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = editor.innerHTML;
        div.innerHTML = content;
        const textContent = div.textContent;
        if (textContent.includes(cleanBonusText)) {
          editor.innerHTML = content.replace(cleanBonusText, '');
          return true;
        }
      }
    }
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) continue;
        const iframeBody = iframeDoc.body;
        if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
          const div = document.createElement('div');
          div.innerHTML = bonusText;
          const cleanBonusText = div.textContent;
          const content = iframeBody.innerHTML;
          div.innerHTML = content;
          const textContent = div.textContent;
          if (textContent.includes(cleanBonusText)) {
            iframeBody.innerHTML = content.replace(cleanBonusText, '');
            return true;
          }
        }
        const editables = iframeDoc.querySelectorAll('[contenteditable="true"]');
        for (const editable of editables) {
          const content = editable.innerHTML;
          const div = document.createElement('div');
          div.innerHTML = bonusText;
          const cleanBonusText = div.textContent;
          div.innerHTML = content;
          const textContent = div.textContent;
          if (textContent.includes(cleanBonusText)) {
            editable.innerHTML = content.replace(cleanBonusText, '');
            return true;
          }
        }
      } catch (e) {
        console.error('Error accessing iframe for bonus stripping:', e);
      }
    }
    return false;
  } catch (e) {
    console.error('Error in stripBonusDirectly:', e);
    return false;
  }
}

function insertTextDirectly(text) {
  try {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      activeElement.value = fullValue.substring(0, start) + text + fullValue.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      return true;
    }
    else if (activeElement.isContentEditable || 
            activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      } else {
        const textNode = document.createTextNode(text);
        activeElement.appendChild(textNode);
        return true;
      }
    }
    else if (activeElement.tagName === 'BODY' && document.body.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      } else {
        const textNode = document.createTextNode(text);
        document.body.appendChild(textNode);
        return true;
      }
    }
    const editors = [
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor'),
      document.querySelector('.tox-edit-area__iframe'),
      document.querySelector('.note-editable')
    ].filter(Boolean);
    for (const editor of editors) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && 
          editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      } else {
        const textNode = document.createTextNode(text);
        editor.appendChild(textNode);
        return true;
      }
    }
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) continue;
        const iframeSelection = iframeDoc.getSelection();
        if (iframeSelection && iframeSelection.rangeCount > 0) {
          const range = iframeSelection.getRangeAt(0);
          range.deleteContents();
          const textNode = iframeDoc.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          iframeSelection.removeAllRanges();
          iframeSelection.addRange(range);
          return true;
        }
        const iframeActive = iframeDoc.activeElement;
        if (iframeActive) {
          if (iframeActive.tagName === 'TEXTAREA' || 
              (iframeActive.tagName === 'INPUT' && iframeActive.type === 'text')) {
            const start = iframeActive.selectionStart;
            const end = iframeActive.selectionEnd;
            const value = iframeActive.value;
            iframeActive.value = value.substring(0, start) + text + value.substring(end);
            iframeActive.selectionStart = iframeActive.selectionEnd = start + text.length;
            return true;
          } else if (iframeActive.isContentEditable) {
            const textNode = iframeDoc.createTextNode(text);
            iframeActive.appendChild(textNode);
            return true;
          }
        }
        const iframeBody = iframeDoc.body;
        if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
          const textNode = iframeDoc.createTextNode(text);
          iframeBody.appendChild(textNode);
          return true;
        }
      } catch (e) {
        console.error('Error accessing iframe for text insertion:', e);
      }
    }
    return false;
  } catch (e) {
    console.error('Error in insertTextDirectly:', e);
    return false;
  }
}

function stripMarkdownDirectly() {
  try {
    const activeElement = document.activeElement;
    function stripMarkdown(text) {
      if (!text) return '';
      const paragraphs = text.split(/\n\s*\n/);
      let result = '';
      for (let i = 0; i < paragraphs.length; i++) {
        let paragraph = paragraphs[i];
        paragraph = paragraph.replace(/^#{1,6}\s+/gm, '');
        paragraph = paragraph.replace(/(\*\*\*|___)(.*?)\1/g, '$2'); 
        paragraph = paragraph.replace(/(\*\*|__)(.*?)\1/g, '$2');    
        paragraph = paragraph.replace(/(\*|_)(.*?)\1/g, '$2');       
        paragraph = paragraph.replace(/\[(.*?)\]\((.*?)(\s+".*?")?\)/g, '$1'); 
        paragraph = paragraph.replace(/\[(.*?)\]\[(.*?)\]/g, '$1');            
        paragraph = paragraph.replace(/!\[(.*?)\]\((.*?)(\s+".*?")?\)/g, '$1');
        paragraph = paragraph.replace(/```(?:\w+)?\n([\s\S]*?)\n```/g, '$1');
        paragraph = paragraph.replace(/```([\s\S]*?)```/g, '$1');
        paragraph = paragraph.replace(/`(.*?)`/g, '$1');
        paragraph = paragraph.replace(/^(\s*>)+\s*/gm, '');
        paragraph = paragraph.replace(/^\s*([-*_])\s*(?:\1\s*){2,}$/gm, '');
        paragraph = paragraph.replace(/^(\s*)[-*+]\s+/gm, '');
        paragraph = paragraph.replace(/^(\s*)\d+\.\s+/gm, '');
        paragraph = paragraph.replace(/~~(.*?)~~?/g, '$1');
        paragraph = paragraph.replace(/^\s*- \[([ x])\]\s+/gm, '');
        paragraph = paragraph.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        paragraph = paragraph.replace(/^\|(.+)\|$/gm, '$1');           
        paragraph = paragraph.replace(/^\|-+\|$/gm, '');               
        paragraph = paragraph.replace(/\[\^(\d+)\](?:\[(.*?)\])?/g, '');
        paragraph = paragraph.replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1');
        paragraph = paragraph.replace(/[ \t]+/g, ' ').trim();
        result += paragraph + (i < paragraphs.length - 1 ? '\n\n' : '');
      }
      return result;
    }
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const fullValue = activeElement.value;
      if (!fullValue) return false;
      const strippedContent = stripMarkdown(fullValue);
      if (strippedContent !== fullValue) {
        activeElement.value = strippedContent;
        return true;
      }
    }
    else if (activeElement.isContentEditable || 
            activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedContent = stripMarkdown(selectedText);
        if (strippedContent !== selectedText) {
          range.deleteContents();
          const textNode = document.createTextNode(strippedContent);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = activeElement.innerHTML;
        const strippedContent = stripMarkdown(content);
        if (strippedContent !== content) {
          activeElement.textContent = strippedContent;
          return true;
        }
      }
    }
    else if ((activeElement.tagName === 'BODY' || activeElement.tagName === 'HTML') && 
             (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true')) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedContent = stripMarkdown(selectedText);
        if (strippedContent !== selectedText) {
          range.deleteContents();
          const textNode = document.createTextNode(strippedContent);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = document.body.innerHTML;
        const strippedContent = stripMarkdown(content);
        if (strippedContent !== content) {
          document.body.textContent = strippedContent;
          return true;
        }
      }
    }
    const possibleEditors = [
      document.querySelector('body.input-editor[contenteditable="true"]'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor'),
      document.querySelector('.tox-edit-area__iframe'),
      document.querySelector('.note-editable')
    ].filter(Boolean); 
    for (const editor of possibleEditors) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && 
          editor.contains(selection.anchorNode) && 
          selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedContent = stripMarkdown(selectedText);
        if (strippedContent !== selectedText) {
          range.deleteContents();
          const textNode = document.createTextNode(strippedContent);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const content = editor.innerHTML || editor.textContent;
        const strippedContent = stripMarkdown(content);
        if (strippedContent !== content) {
          editor.textContent = strippedContent;
          return true;
        }
      }
    }
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          continue;
        }
        const iframeBody = iframeDoc.body;
        if (iframeBody && (iframeBody.isContentEditable || iframeBody.getAttribute('contenteditable') === 'true')) {
          const content = iframeBody.textContent || iframeBody.innerHTML;
          if (content && content.trim() !== '') {
            const strippedContent = stripMarkdown(content);
            if (strippedContent !== content) {
              iframeBody.textContent = strippedContent;
              return true;
            }
          }
        }
        const editableElements = iframeDoc.querySelectorAll('[contenteditable="true"]');
        for (const el of editableElements) {
          const content = el.textContent || el.innerHTML;
          if (content && content.trim() !== '') {
            const strippedContent = stripMarkdown(content);
            if (strippedContent !== content) {
              el.textContent = strippedContent;
              return true;
            }
          }
        }
        const iframeActive = iframeDoc.activeElement;
        if (iframeActive && (
            iframeActive.tagName === 'TEXTAREA' || 
            iframeActive.tagName === 'INPUT' && iframeActive.type === 'text' ||
            iframeActive.isContentEditable
        )) {
          let content;
          if (iframeActive.isContentEditable) {
            content = iframeActive.innerHTML;
          } else {
            content = iframeActive.value;
          }
          if (content && content.trim() !== '') {
            const strippedContent = stripMarkdown(content);
            if (strippedContent !== content) {
              if (iframeActive.isContentEditable) {
                iframeActive.textContent = strippedContent;
              } else {
                iframeActive.value = strippedContent;
              }
              return true;
            }
          }
        }
      } catch (e) {
        console.error('Error accessing iframe:', e);
      }
    }
    return false;
  } catch (error) {
    console.error('Error in stripMarkdownDirectly:', error);
    return false;
  }
}