// 簡單的 GIF 編碼器 - 將圖片轉換為 GIF 格式
class GIFEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
  }

  addFrame(canvas) {
    this.frames.push(canvas);
  }

  render() {
    if (this.frames.length === 0) {
      throw new Error('No frames added');
    }

    const canvas = this.frames[0];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return this.createGIF(imageData);
  }

  createGIF(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // 量化圖片為 256 色
    const { colorMap, indexedPixels } = this.quantizeImage(pixels, width, height);

    // 構建 GIF 檔案
    const gif = [];

    // 簽名和版本
    gif.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // 'GIF89a'

    // 邏輯屏幕描述符
    gif.push(width & 0xFF, (width >> 8) & 0xFF);
    gif.push(height & 0xFF, (height >> 8) & 0xFF);
    gif.push(0xF7); // 全局顏色表標誌
    gif.push(0x00); // 背景色索引
    gif.push(0x00); // 像素寬高比

    // 全局顏色表
    gif.push(...colorMap);

    // 圖像分隔符
    gif.push(0x2C);

    // 圖像位置和大小
    gif.push(0, 0, 0, 0);
    gif.push(width & 0xFF, (width >> 8) & 0xFF);
    gif.push(height & 0xFF, (height >> 8) & 0xFF);
    gif.push(0x00); // 無局部顏色表

    // LZW 編碼圖像數據
    const lzwData = this.lzwEncode(indexedPixels);
    gif.push(...lzwData);

    // 結束塊
    gif.push(0x3B);

    return new Blob([new Uint8Array(gif)], { type: 'image/gif' });
  }

  quantizeImage(pixels, width, height) {
    // 簡單的顏色量化 - 使用前 256 種顏色
    const colorMap = new Array(768).fill(0); // 256 * 3
    const colorIndex = {};
    let colorCount = 0;

    const indexedPixels = [];

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const key = `${r},${g},${b}`;

      if (!colorIndex[key]) {
        if (colorCount < 256) {
          colorIndex[key] = colorCount;
          colorMap[colorCount * 3] = r;
          colorMap[colorCount * 3 + 1] = g;
          colorMap[colorCount * 3 + 2] = b;
          colorCount++;
        } else {
          // 超過 256 色，使用最近的顏色
          colorIndex[key] = this.findNearestColor(r, g, b, colorMap, colorCount);
        }
      }

      indexedPixels.push(colorIndex[key]);
    }

    return { colorMap: colorMap.slice(0, colorCount * 3), indexedPixels };
  }

  findNearestColor(r, g, b, colorMap, colorCount) {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < colorCount; i++) {
      const dr = colorMap[i * 3] - r;
      const dg = colorMap[i * 3 + 1] - g;
      const db = colorMap[i * 3 + 2] - b;
      const distance = dr * dr + dg * dg + db * db;

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  lzwEncode(data) {
    const result = [];
    result.push(0x08); // LZW 最小代碼大小

    // 簡單的 LZW 編碼
    const encoded = this.simpleLZW(data);

    // 分塊輸出
    let offset = 0;
    while (offset < encoded.length) {
      const chunk = encoded.slice(offset, offset + 255);
      result.push(chunk.length);
      result.push(...chunk);
      offset += 255;
    }

    result.push(0x00); // 塊終止符
    return result;
  }

  simpleLZW(data) {
    // 簡化的 LZW 編碼 - 不使用複雜的字典
    const result = [];
    const clearCode = 256;
    const eofCode = 257;

    result.push(clearCode);

    for (let i = 0; i < data.length; i++) {
      result.push(data[i] & 0xFF);
    }

    result.push(eofCode);
    return result;
  }
}

// 導出全局變數供 content.js 使用
window.GIFEncoder = GIFEncoder;
