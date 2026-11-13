/**
 * Image attachment compression and clipboard helper
 */

/**
 * บีบอัดรูปภาพให้ขนาดเหมาะสมสำหรับการจัดเก็บใน Cloud (ไม่เกิน 1280px, คุณภาพ 80%)
 */
export async function compressImageFile(file: File, maxWidth = 1280, quality = 0.8): Promise<string> {
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  if (!ALLOWED_IMAGE_TYPES.includes((file.type || '').toLowerCase())) {
    throw new Error('รองรับเฉพาะไฟล์ภาพ PNG, JPG, WebP หรือ GIF เท่านั้น');
  }
  if (file.size > MAX_RAW_SIZE_BYTES) {
    throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกิน 10 MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง'));
          return;
        }
        // เติมพื้นหลังสีขาวป้องกัน PNG โปร่งใสกลายเป็นพื้นดำเมื่อแปลงเป็น JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, width, height);
        // แปลงเป็น webp หรือ jpeg เพื่อประหยัดพื้นที่
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * ดึงไฟล์รูปภาพจาก Clipboard Event (เมื่อผู้ใช้กด Ctrl + V ภาพหน้าจอ)
 */
export function getImageFilesFromClipboard(e: React.ClipboardEvent | ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

/**
 * ฟอร์แมตขนาดไฟล์ byte ให้เป็น KB / MB
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
