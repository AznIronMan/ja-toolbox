function cleanupElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
    return true;
  }
  return false;
}

function createTempElement(tag = 'div') {
  const element = document.createElement(tag);
  document.body.appendChild(element);
  return {
    element: element,
    cleanup: function() {
      return cleanupElement(element);
    }
  };
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

function processContentEditableInFrame() {
  try {
    if (window !== window.top) {
      if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
        const content = document.body.textContent || document.body.innerHTML;
        if (content && content.trim() !== '') {
          document.body.textContent = stripMarkdown(content);
          window.top.postMessage({type: 'MARKDOWN_STRIPPER_SUCCESS', frameUrl: window.location.href}, '*');
          return true;
        }
      }
      const editableElements = document.querySelectorAll('[contenteditable="true"]');
      for (const el of editableElements) {
        const content = el.textContent || el.innerHTML;
        if (content && content.trim() !== '') {
          el.textContent = stripMarkdown(content);
          window.top.postMessage({type: 'MARKDOWN_STRIPPER_SUCCESS', frameUrl: window.location.href}, '*');
          return true;
        }
      }
    }
    if (document.body.classList.contains('input-editor') && 
        (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true')) {
      const content = document.body.textContent || document.body.innerHTML;
      if (content && content.trim() !== '') {
        document.body.textContent = stripMarkdown(content);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error in processContentEditableInFrame:', e);
    return false;
  }
}


function insertTextIntoActiveElement(text) {
  try {
    const activeElement = document.activeElement;
    if (window !== window.top) {
      if (document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true') {
        insertTextAtCursor(document.body, text);
        return true;
      }
    }
    if ((activeElement.tagName === 'BODY' || activeElement.tagName === 'HTML') && 
        (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true')) {
      insertTextAtCursor(activeElement, text);
      return true;
    }
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;
      activeElement.value = value.substring(0, start) + text + value.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      return true;
    }
    if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
      insertTextAtCursor(activeElement, text);
      return true;
    }
    const possibleEditors = [
      document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true' ? document.body : null,
      document.querySelector('body.input-editor[contenteditable="true"]'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor')
    ].filter(Boolean);
    for (const editor of possibleEditors) {
      insertTextAtCursor(editor, text);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error inserting text:', e);
    return false;
  }
}

function insertTextAtCursor(element, text) {
  if (window.getSelection && document.createRange) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
      element.textContent += text;
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  } 
  else if (document.selection && document.selection.createRange) {
    const range = document.selection.createRange();
    range.text = text;
    range.select();
  }
  else {
    element.textContent += text;
  }
}

function stripIntroText(content, introText) {
  if (!content || !introText) return content;
  const tempIntroDiv = createTempElement();
  tempIntroDiv.element.innerHTML = introText;
  const cleanIntroText = tempIntroDiv.element.textContent;
  const isHTML = /<[^>]*>/g.test(content);
  if (isHTML) {
    const tempContentDiv = createTempElement();
    tempContentDiv.element.innerHTML = content;
    let textContent = tempContentDiv.element.textContent;
    
    if (textContent.startsWith(cleanIntroText)) {
      textContent = textContent.slice(cleanIntroText.length).trim();
      let currentIndex = 0;
      const walker = document.createTreeWalker(
        tempContentDiv.element, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      let introRemaining = cleanIntroText.length;
      let node;
      while ((node = walker.nextNode())) {
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
      if (walker.currentNode) {
        walker.currentNode = null;
      }
      tempIntroDiv.cleanup();
      let result = content;
      if (currentIndex > 0 && currentIndex < content.length) {
        result = content.substring(currentIndex).trim();
      }
      tempContentDiv.cleanup();
      return result;
    }
    tempIntroDiv.cleanup();
    tempContentDiv.cleanup();
    return content;
  } else {
    const result = content.startsWith(cleanIntroText) ? 
                   content.slice(cleanIntroText.length).trim() : 
                   content;
    tempIntroDiv.cleanup();
    return result;
  }
}

function stripIntroFromActiveElement(introText) {
  try {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        const strippedSelection = stripIntroText(selectedText, introText);
        if (selectedText !== strippedSelection) {
          const newContent = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          activeElement.value = newContent;
          activeElement.selectionStart = start;
          activeElement.selectionEnd = start + strippedSelection.length;
          return true;
        }
      } else {
        const originalContent = fullValue;
        const modifiedContent = stripIntroText(originalContent, introText);
        if (originalContent !== modifiedContent) {
          activeElement.value = modifiedContent;
          activeElement.selectionStart = activeElement.selectionEnd = start;
          return true;
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
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const originalContent = activeElement.innerHTML;
        const modifiedContent = stripIntroText(originalContent, introText);
        if (originalContent !== modifiedContent) {
          activeElement.innerHTML = modifiedContent;
          return true;
        }
      }
    }
    else if (activeElement.tagName === 'BODY' && (document.body.isContentEditable || 
        document.body.getAttribute('contenteditable') === 'true')) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const strippedSelection = stripIntroText(selectedText, introText);
        if (selectedText !== strippedSelection) {
          range.deleteContents();
          const textNode = document.createTextNode(strippedSelection);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      } else {
        const originalContent = document.body.innerHTML;
        const modifiedContent = stripIntroText(originalContent, introText);
        if (originalContent !== modifiedContent) {
          document.body.innerHTML = modifiedContent;
          return true;
        }
      }
    }
    const possibleEditors = [
      document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true' ? document.body : null,
      document.querySelector('body.input-editor[contenteditable="true"]'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor')
    ].filter(Boolean);
    
    for (const editor of possibleEditors) {
      const selection = window.getSelection();
      try {
        if (selection && selection.rangeCount > 0 && 
            editor.contains(selection.anchorNode) && 
            selection.toString().trim() !== '') {
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString();
          const strippedSelection = stripIntroText(selectedText, introText);
          if (selectedText !== strippedSelection) {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }
        } else {
          const originalContent = editor.innerHTML;
          const modifiedContent = stripIntroText(originalContent, introText);
          if (originalContent !== modifiedContent) {
            editor.innerHTML = modifiedContent;
            return true;
          }
        }
      } catch (e) {
        console.error('Error in selection processing:', e);
        if (selection) {
          selection.removeAllRanges();
        }
      }
    }
    return false;
  } catch (e) {
    console.error('Error in stripIntroFromActiveElement:', e);
    return false;
  }
}

function stripBonusText(content, bonusText) {
  if (!content || !bonusText) return content;
  const tempBonusDiv = createTempElement();
  tempBonusDiv.element.innerHTML = bonusText;
  const cleanBonusText = tempBonusDiv.element.textContent;
  const isHTML = /<[^>]*>/g.test(content);
  if (isHTML) {
    const tempContentDiv = createTempElement();
    tempContentDiv.element.innerHTML = content;
    let textContent = tempContentDiv.element.textContent;
    const bonusIndex = textContent.indexOf(cleanBonusText);
    if (bonusIndex >= 0) {
      const beforeBonus = textContent.substring(0, bonusIndex);
      const afterBonus = textContent.substring(bonusIndex + cleanBonusText.length);
      textContent = beforeBonus + afterBonus;
      let currentIndex = 0;
      let currentTextLength = 0;
      let bonusFound = false;
      const walker = document.createTreeWalker(
        tempContentDiv.element, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      let bonusStartIndex = -1;
      let bonusEndIndex = -1;
      let node;
      while ((node = walker.nextNode()) && !bonusFound) {
        const nodeText = node.nodeValue;
        if (currentTextLength <= bonusIndex && bonusIndex < currentTextLength + nodeText.length) {
          const relativeStart = bonusIndex - currentTextLength;
          bonusStartIndex = currentIndex + relativeStart;
          let remainingBonusLength = cleanBonusText.length;
          if (relativeStart + remainingBonusLength <= nodeText.length) {
            bonusEndIndex = bonusStartIndex + remainingBonusLength;
            bonusFound = true;
          } else {
            remainingBonusLength -= (nodeText.length - relativeStart);
            currentIndex += nodeText.length;
            let nextNode;
            while ((nextNode = walker.nextNode()) && remainingBonusLength > 0) {
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
      if (walker.currentNode) {
        walker.currentNode = null;
      }
      tempBonusDiv.cleanup();
      let result = content;
      if (bonusFound && bonusStartIndex >= 0 && bonusEndIndex > bonusStartIndex) {
        result = content.substring(0, bonusStartIndex) + content.substring(bonusEndIndex);
      }
      tempContentDiv.cleanup();
      return result;
    }
    tempBonusDiv.cleanup();
    tempContentDiv.cleanup();
    return content;
  } else {
    const bonusIndex = content.indexOf(cleanBonusText);
    const result = bonusIndex >= 0 ? 
                  content.substring(0, bonusIndex) + content.substring(bonusIndex + cleanBonusText.length) : 
                  content;
    tempBonusDiv.cleanup();
    return result;
  }
}

function stripBonusFromActiveElement(bonusText) {
  try {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const fullValue = activeElement.value;
      
      if (start !== end) {
        const selectedText = fullValue.substring(start, end);
        const strippedSelection = stripBonusText(selectedText, bonusText);
        if (selectedText !== strippedSelection) {
          const newContent = fullValue.substring(0, start) + strippedSelection + fullValue.substring(end);
          activeElement.value = newContent;
          activeElement.selectionStart = start;
          activeElement.selectionEnd = start + strippedSelection.length;
          return true;
        }
      } else {
        const originalContent = fullValue;
        const modifiedContent = stripBonusText(originalContent, bonusText);
        if (originalContent !== modifiedContent) {
          activeElement.value = modifiedContent;
          activeElement.selectionStart = activeElement.selectionEnd = start;
          return true;
        }
      }
    }
    else if (activeElement.isContentEditable || 
             activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      try {
        if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString();
          const strippedSelection = stripBonusText(selectedText, bonusText);
          if (selectedText !== strippedSelection) {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }
        } else {
          const originalContent = activeElement.innerHTML;
          const modifiedContent = stripBonusText(originalContent, bonusText);
          if (originalContent !== modifiedContent) {
            activeElement.innerHTML = modifiedContent;
            return true;
          }
        }
      } catch (e) {
        console.error('Error in selection processing:', e);
        if (selection) {
          selection.removeAllRanges();
        }
      }
    }
    else if (activeElement.tagName === 'BODY' && (document.body.isContentEditable || 
        document.body.getAttribute('contenteditable') === 'true')) {
      const selection = window.getSelection();
      try {
        if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString();
          const strippedSelection = stripBonusText(selectedText, bonusText);
          if (selectedText !== strippedSelection) {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }
        } else {
          const originalContent = document.body.innerHTML;
          const modifiedContent = stripBonusText(originalContent, bonusText);
          if (originalContent !== modifiedContent) {
            document.body.innerHTML = modifiedContent;
            return true;
          }
        }
      } catch (e) {
        console.error('Error in selection processing:', e);
        if (selection) {
          selection.removeAllRanges();
        }
      }
    }
    
    const possibleEditors = [
      document.body.isContentEditable || document.body.getAttribute('contenteditable') === 'true' ? document.body : null,
      document.querySelector('body.input-editor[contenteditable="true"]'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('.CodeMirror'),
      document.querySelector('.ql-editor'),
      document.querySelector('.ProseMirror'),
      document.querySelector('.input-editor')
    ].filter(Boolean);
    
    for (const editor of possibleEditors) {
      const selection = window.getSelection();
      try {
        if (selection && selection.rangeCount > 0 && 
            editor.contains(selection.anchorNode) && 
            selection.toString().trim() !== '') {
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString();
          const strippedSelection = stripBonusText(selectedText, bonusText);
          if (selectedText !== strippedSelection) {
            range.deleteContents();
            const textNode = document.createTextNode(strippedSelection);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }
        } else {
          const originalContent = editor.innerHTML;
          const modifiedContent = stripBonusText(originalContent, bonusText);
          if (originalContent !== modifiedContent) {
            editor.innerHTML = modifiedContent;
            return true;
          }
        }
      } catch (e) {
        console.error('Error in selection processing:', e);
        if (selection) {
          selection.removeAllRanges();
        }
      }
    }
    
    return false;
  } catch (e) {
    console.error('Error in stripBonusFromActiveElement:', e);
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    } catch (selectionError) {
      console.error('Error cleaning up selection:', selectionError);
    }
    return false;
  }
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

function directContentEditableBodyProcess(introText, bonusText) {
  if (bonusText) {
    return directBonusStrippingProcess(bonusText);
  }
  if (introText) {
    return directIntroStrippingProcess(introText);
  }
  return false;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'stripMarkdown') {
    try {
      const result = processContentEditableInFrame();
      sendResponse({success: result});
    } catch (e) {
      console.error('Error processing contenteditable:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  else if (request.action === 'insertGptPrompt') {
    try {
      const result = insertTextIntoActiveElement(request.promptText);
      sendResponse({success: result});
    } catch (e) {
      console.error('Error inserting GPT prompt:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  else if (request.action === 'stripIntro') {
    try {
      const success = stripIntroFromActiveElement(request.introText);
      sendResponse({success: success});
      if (window !== window.top && success) {
        window.top.postMessage({type: 'INTRO_STRIPPER_SUCCESS', frameUrl: window.location.href}, '*');
      }
    } catch (e) {
      console.error('Error stripping intro text:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  else if (request.action === 'stripBonus') {
    try {
      const success = stripBonusFromActiveElement(request.bonusText);
      sendResponse({success: success});
      if (window !== window.top && success) {
        window.top.postMessage({type: 'BONUS_STRIPPER_SUCCESS', frameUrl: window.location.href}, '*');
      }
    } catch (e) {
      console.error('Error stripping bonus text:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  else if (request.action === 'insertGeneralText') {
    try {
      const result = insertTextIntoActiveElement(request.generalText);
      sendResponse({success: result});
    } catch (e) {
      console.error('Error inserting general text:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  else if (request.action === 'insertLanguageText') {
    try {
      const result = insertTextIntoActiveElement(request.languageText);
      sendResponse({success: result});
    } catch (e) {
      console.error('Error inserting language text:', e);
      sendResponse({success: false, error: e.message});
    }
    return true; 
  }
  return true; 
});
let hasProcessedFrame = false;
if (window !== window.top) {
  if (!hasProcessedFrame) {
    hasProcessedFrame = true;
    setTimeout(() => {
      processContentEditableInFrame();
    }, 100);
  }
} 