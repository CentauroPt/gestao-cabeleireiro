/**
 * Utilitário para redimensionamento e compressão de imagens no browser.
 * Evita o esgotamento da quota de 5MB do LocalStorage ao converter
 * fotos de telemóvel/câmera (2MB a 5MB) em miniaturas leves (< 25KB).
 */
export async function compressImage(
  file: File,
  maxDimension = 280,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se for SVG, não precisa de redimensionamento via canvas
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escala proporcional
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback caso não seja possível obter contexto 2D
          resolve((e.target?.result as string) || '');
          return;
        }

        // Fundo branco para imagens transparentes convertidas em JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenhar imagem redimensionada com suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Converte para JPEG comprimido (~15KB - 25KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        // Fallback em caso de erro no decode da imagem
        resolve((e.target?.result as string) || '');
      };

      img.src = (e.target?.result as string) || '';
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
