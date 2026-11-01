import sharp from 'sharp'

const MAX_PIXELS = 40_000_000

export class ImageProcessingError extends Error {
  readonly status = 422

  constructor(message: string) {
    super(message)
    this.name = 'ImageProcessingError'
  }
}

/**
 * Re-encode and downscale images before vision inference.
 *
 * This bounds decompression bombs, strips EXIF orientation problems and keeps
 * the base64 payload small enough for Cloudflare Workers AI.
 */
export async function prepareImageForVision(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, { failOn: 'error', limitInputPixels: MAX_PIXELS })
    const metadata = await image.metadata()
    const pixels = (metadata.width ?? 0) * (metadata.height ?? 0)
    if (pixels > MAX_PIXELS) {
      throw new ImageProcessingError('Ảnh có độ phân giải quá lớn. Vui lòng thu nhỏ dưới 40 megapixel.')
    }
    return await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error
    throw new ImageProcessingError('Không đọc được ảnh. Tệp có thể bị hỏng hoặc không hợp lệ.')
  }
}

export function imageToDataUrl(buffer: Buffer, mimeType = 'image/jpeg'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}
