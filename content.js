let speakerBtn = null;
let translationBox = null;
let selectedText = "";
let selectionRect = null;
let savedRange = null;
let ctrlPressedAlone = false;
let altPressedAlone = false;

let settings = {
  rate: 1.0,
  voiceName: "",
  autoReplace: false
};

// Carrega as preferências salvas
chrome.storage.local.get(["rate", "voiceName", "autoReplace"], (res) => {
  if (res.rate) settings.rate = parseFloat(res.rate);
  if (res.voiceName !== undefined) settings.voiceName = res.voiceName;
  if (res.autoReplace !== undefined) settings.autoReplace = res.autoReplace;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.rate) settings.rate = parseFloat(changes.rate.newValue);
  if (changes.voiceName) settings.voiceName = changes.voiceName.newValue;
  if (changes.autoReplace) settings.autoReplace = changes.autoReplace.newValue;
});

function removeUI() {
  if (speakerBtn) {
    speakerBtn.remove();
    speakerBtn = null;
  }
  if (translationBox) {
    translationBox.remove();
    translationBox = null;
  }
  window.speechSynthesis.cancel();
}

function speakEnglish(text) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = settings.rate || 1.0;

  if (settings.voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find((v) => v.name === settings.voiceName);
    if (matched) utterance.voice = matched;
  }

  window.speechSynthesis.speak(utterance);
}

function replaceSelectionInPage(range, originalText, translatedText) {
  if (!range) return;
  try {
    range.deleteContents();
    const span = document.createElement("span");
    span.className = "ext-replaced-highlight";
    span.textContent = translatedText;
    span.title = `Original: "${originalText}" (clique para restaurar)`;

    span.addEventListener("click", (e) => {
      e.stopPropagation();
      span.replaceWith(document.createTextNode(originalText));
    });

    range.insertNode(span);
    window.getSelection().removeAllRanges();
  } catch (err) {
    console.warn("Não foi possível substituir neste elemento:", err);
  }
}

function showSpeakerIcon(rect) {
  removeUI();

  speakerBtn = document.createElement("div");
  speakerBtn.id = "ext-speaker-btn";
  speakerBtn.title = "Ouvir em inglês (ou aperte Alt) | Aperte Ctrl para traduzir";
  speakerBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  `;

  const top = Math.min(window.innerHeight - 42, rect.bottom + 8);
  const left = Math.min(window.innerWidth - 42, Math.max(8, rect.left));

  speakerBtn.style.top = `${top}px`;
  speakerBtn.style.left = `${left}px`;

  speakerBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    speakEnglish(selectedText);
  });

  document.body.appendChild(speakerBtn);
}

function showTranslation(rect, text, isFinal = false, originalText = "") {
  removeUI();

  translationBox = document.createElement("div");
  translationBox.id = "ext-translation-box";

  const textDiv = document.createElement("div");
  textDiv.id = "ext-translation-text";
  textDiv.textContent = text;
  translationBox.appendChild(textDiv);

  if (isFinal) {
    const actionsDiv = document.createElement("div");
    actionsDiv.id = "ext-translation-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "ext-action-btn";
    copyBtn.textContent = "Copiar";
    copyBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copiado!";
      setTimeout(() => (copyBtn.textContent = "Copiar"), 1200);
    });

    const replaceBtn = document.createElement("button");
    replaceBtn.className = "ext-action-btn";
    replaceBtn.textContent = "Substituir no texto";
    replaceBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      replaceSelectionInPage(savedRange, originalText, text);
      removeUI();
    });

    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(replaceBtn);
    translationBox.appendChild(actionsDiv);
  }

  const top = Math.min(window.innerHeight - 140, rect.bottom + 8);
  const left = Math.min(window.innerWidth - 390, Math.max(8, rect.left));

  translationBox.style.top = `${top}px`;
  translationBox.style.left = `${left}px`;

  document.body.appendChild(translationBox);
}

document.addEventListener("mouseup", (e) => {
  if (e.target.closest("#ext-speaker-btn") || e.target.closest("#ext-translation-box")) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && selection.rangeCount > 0) {
      selectedText = text;
      savedRange = selection.getRangeAt(0).cloneRange();
      selectionRect = savedRange.getBoundingClientRect();
      showSpeakerIcon(selectionRect);
    } else {
      selectedText = "";
      savedRange = null;
      removeUI();
    }
  }, 10);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Control" && selectedText.length > 0 && speakerBtn) {
    ctrlPressedAlone = true;
  } else {
    ctrlPressedAlone = false;
  }

  if (e.key === "Alt" && selectedText.length > 0 && (speakerBtn || translationBox)) {
    altPressedAlone = true;
  } else {
    altPressedAlone = false;
  }

  if (e.key === "Escape") {
    removeUI();
  }
});

document.addEventListener("keyup", (e) => {
  // Alt solto: reproduz áudio em inglês
  if (e.key === "Alt" && altPressedAlone && selectedText.length > 0) {
    e.preventDefault();
    altPressedAlone = false;
    speakEnglish(selectedText);
    return;
  }

  // Ctrl solto: traduz para português
  if (e.key === "Control" && ctrlPressedAlone && selectedText.length > 0) {
    ctrlPressedAlone = false;
    const currentRect = selectionRect;
    const textToTranslate = selectedText;
    const currentRange = savedRange;

    showTranslation(currentRect, "Traduzindo...", false);

    chrome.runtime.sendMessage(
      { action: "translate", text: textToTranslate },
      (response) => {
        if (response && response.success) {
          if (settings.autoReplace) {
            replaceSelectionInPage(currentRange, textToTranslate, response.translation);
            removeUI();
          } else {
            showTranslation(currentRect, response.translation, true, textToTranslate);
          }
        } else {
          showTranslation(currentRect, "Erro ao traduzir o texto.", false);
        }
      }
    );
  }
});

window.addEventListener("scroll", () => {
  if (speakerBtn || translationBox) {
    removeUI();
  }
}, { passive: true });