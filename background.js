chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'convertToGif') {
    sendResponse({
      success: true,
      gifData: request.imageData,
      gifName: request.fileName.replace(/\.[^/.]+$/, '') + '.gif'
    });
  }
});
