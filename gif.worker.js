// gif.js worker - 用於 GIF 編碼的 Web Worker
// 這是 gif.js 庫的 worker 文件

self.onmessage = function(e) {
  const { action, data } = e.data;
  
  if (action === 'encode') {
    // 簡單的 GIF 編碼實現
    const gif = encodeGIF(data);
    self.postMessage({ success: true, gif: gif });
  }
};

function encodeGIF(imageData) {
  // 返回圖片數據作為 GIF
  // 這是一個簡化版本，實際使用時會由主線程處理
  return imageData;
}
