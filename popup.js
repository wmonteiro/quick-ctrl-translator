const voiceSelect = document.getElementById("voiceSelect");
const rateSelect = document.getElementById("rateSelect");
const autoReplace = document.getElementById("autoReplace");

function loadVoices() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const currentVal = voiceSelect.value;

  voiceSelect.innerHTML = `<option value="">Padrão do Sistema (en-US)</option>`;
  voices.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(opt);
  });

  chrome.storage.local.get(["voiceName"], (res) => {
    if (res.voiceName) voiceSelect.value = res.voiceName;
    else if (currentVal) voiceSelect.value = currentVal;
  });
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

chrome.storage.local.get(["rate", "autoReplace"], (res) => {
  if (res.rate) rateSelect.value = res.rate;
  if (res.autoReplace) autoReplace.checked = res.autoReplace;
});

voiceSelect.addEventListener("change", () => {
  chrome.storage.local.set({ voiceName: voiceSelect.value });
});

rateSelect.addEventListener("change", () => {
  chrome.storage.local.set({ rate: rateSelect.value });
});

autoReplace.addEventListener("change", () => {
  chrome.storage.local.set({ autoReplace: autoReplace.checked });
});