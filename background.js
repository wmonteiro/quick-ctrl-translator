chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(request.text)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const translatedText = data[0].map((item) => item[0]).join("");
        sendResponse({ success: true, translation: translatedText });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});