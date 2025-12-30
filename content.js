// 監聽 DOM 變化，檢查發文彈窗是否出現
const observer = new MutationObserver(() => {
  injectButton();
});

let gifWorkerScriptUrlPromise;

function getGifWorkerScriptUrl() {
  if (gifWorkerScriptUrlPromise) return gifWorkerScriptUrlPromise;

  gifWorkerScriptUrlPromise = fetch(chrome.runtime.getURL('vendor/gif.worker.js'))
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load gif.worker.js: ${res.status}`);
      return res.text();
    })
    .then((code) => {
      const blob = new Blob([code], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    });

  return gifWorkerScriptUrlPromise;
}

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初始化時執行一次
setTimeout(injectButton, 500);

function injectButton() {
  // 查找發佈按鈕 - 支援兩種類型
  const tweetButtons = document.querySelectorAll('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  
  tweetButtons.forEach((tweetButton) => {
    // 檢查是否已經注入過按鈕
    const buttonWrapper = tweetButton.parentElement;
    if (buttonWrapper.querySelector('.image-to-gif-btn')) {
      return;
    }
    
    console.log(`✓ 找到發佈按鈕，準備在旁邊添加 GIF 按鈕`);
    addGifButtonNextToTweetButton(tweetButton);
  });
}

function addGifButtonNextToTweetButton(tweetButton) {
  // 創建 GIF 按鈕容器
  const gifButton = document.createElement('button');
  gifButton.className = 'image-to-gif-btn css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-1cwvpvk r-2yi16 r-1qi8awa r-3pj75a r-o7ynqc r-6416eg r-1ny4l3l';
  gifButton.title = 'Convert Image to GIF';
  gifButton.type = 'button';
  gifButton.setAttribute('aria-label', 'Convert Image to GIF');
  gifButton.style.backgroundColor = 'rgb(239, 243, 244)';
  gifButton.style.borderColor = 'rgba(0, 0, 0, 0)';
  gifButton.style.marginLeft = '12px';
  gifButton.style.padding = '4px 8px';
  gifButton.style.display = 'flex';
  gifButton.style.alignItems = 'center';
  gifButton.style.justifyContent = 'center';
  gifButton.style.borderRadius = '20px';
  gifButton.style.cursor = 'pointer';
  gifButton.style.transition = 'background-color 0.2s';
  
  // 添加懸停效果
  gifButton.addEventListener('mouseenter', () => {
    gifButton.style.backgroundColor = 'rgb(229, 233, 234)';
  });
  gifButton.addEventListener('mouseleave', () => {
    gifButton.style.backgroundColor = 'rgb(239, 243, 244)';
  });
  
  // 創建 SVG 圖標
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.color = 'rgb(15, 20, 25)';
  svg.style.width = '30px';
  svg.style.height = '30px';
  
  svg.innerHTML = `
    <g>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="15" font-size="8" font-weight="bold" text-anchor="middle" fill="currentColor">GIF</text>
    </g>
  `;
  
  gifButton.appendChild(svg);
  
  // 添加點擊事件
  gifButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openImagePicker();
  });
  
  // 在發佈按鈕前插入 GIF 按鈕
  tweetButton.parentElement.insertBefore(gifButton, tweetButton);
  console.log('✓ GIF 按鈕已成功添加到發佈按鈕旁邊');
}

function openImagePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      convertToGif(files);
    }
  });
  
  input.click();
}

function convertToGif(files) {
  // 支援的圖片格式
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (typeof GIF === 'undefined') {
    showNotification('✗ GIF 轉換器未載入（請重新整理擴充功能）');
    return;
  }

  files.forEach((file, index) => {
    const fileType = (file.type || '').toLowerCase();
    if (!supportedFormats.includes(fileType)) {
      showNotification(`✗ 不支援的檔案格式: ${file.name}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const blob = new Blob([e.target.result], { type: file.type || 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          let canvas;
          let ctx;

          try {
            canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx = canvas.getContext('2d', { willReadFrequently: true });
            // 設定背景色以處理透明圖片
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          } catch (error) {
            console.error('轉換錯誤:', error);
            showNotification(`✗ 轉換失敗: ${error.message}`);
            URL.revokeObjectURL(url);
            return;
          }

          URL.revokeObjectURL(url);

          getGifWorkerScriptUrl()
            .then((workerScriptUrl) => {
              const gif = new GIF({
                workers: 2,
                quality: 10,
                repeat: 0,
                workerScript: workerScriptUrl,
                width: canvas.width,
                height: canvas.height
              });

              // 用兩個相同 frame，讓 Twitter 以「動畫 GIF」顯示 GIF 標籤
              gif.addFrame(ctx, { copy: true, delay: 200 });
              gif.addFrame(ctx, { copy: true, delay: 200 });

              gif.on('finished', (gifBlob) => {
                const gifName = file.name.replace(/\.[^/.]+$/, '') + '.gif';
                uploadToTwitter(gifBlob, gifName);
                showNotification(`✓ 圖片 ${index + 1} 已轉換並上傳`);
              });

              gif.on('abort', () => {
                showNotification('✗ GIF 轉換已中止');
              });

              gif.render();
            })
            .catch((err) => {
              console.error('載入 GIF worker 失敗:', err);
              showNotification(`✗ 轉換失敗: ${err.message}`);
            });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          showNotification(`✗ 圖片 ${index + 1} 無法載入`);
        };

        img.src = url;
      } catch (error) {
        showNotification(`✗ 轉換失敗: ${error.message}`);
      }
    };

    reader.onerror = () => {
      showNotification(`✗ 無法讀取檔案: ${file.name}`);
    };

    reader.readAsArrayBuffer(file);
  });
}

function uploadToTwitter(blob, fileName) {
  // 找到推特的檔案輸入元素
  const fileInput = document.querySelector('[data-testid="fileInput"]');
  
  if (!fileInput) {
    showNotification('✗ 找不到推特的檔案輸入框');
    return;
  }
  
  // 創建 DataTransfer 物件來模擬檔案選擇
  const dataTransfer = new DataTransfer();
  const file = new File([blob], fileName, { type: 'image/gif' });
  dataTransfer.items.add(file);
  
  // 設定檔案輸入的 files
  fileInput.files = dataTransfer.files;
  
  // 觸發 change 事件
  const event = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(event);
  
  console.log(`✓ 已上傳圖片到推特: ${fileName}`);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'image-to-gif-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}
