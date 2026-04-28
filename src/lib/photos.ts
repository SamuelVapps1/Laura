import imageCompression from 'browser-image-compression'
import imageCompressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url'

import type { PhotoKind } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { replaceSessionPhoto } from '@/db/repositories/photos'

const FULL_OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.4,
  fileType: 'image/webp',
  useWebWorker: true,
  libURL: imageCompressionWorkerUrl,
}

const THUMB_OPTIONS = {
  maxWidthOrHeight: 256,
  maxSizeMB: 0.03,
  fileType: 'image/webp',
  useWebWorker: true,
  libURL: imageCompressionWorkerUrl,
}

type PhotoProcessingOptions = {
  dogId: string
  appointmentId: string
  sessionId: string
  kind: PhotoKind
}

type ImageDimensions = {
  width: number | null
  height: number | null
}

export async function processAndStorePhoto(file: File, options: PhotoProcessingOptions): Promise<void> {
  try {
    const [fullBlob, thumbBlob] = await Promise.all([
      imageCompression(file, FULL_OPTIONS),
      imageCompression(file, THUMB_OPTIONS),
    ])
    const [fullDimensions, thumbDimensions] = await Promise.all([
      getImageDimensions(fullBlob),
      getImageDimensions(thumbBlob),
    ])

    await replaceSessionPhoto({
      sessionId: options.sessionId,
      kind: options.kind,
      full: {
        blob: fullBlob,
        width: fullDimensions.width,
        height: fullDimensions.height,
        sizeBytes: fullBlob.size,
      },
      thumb: {
        blob: thumbBlob,
        width: thumbDimensions.width,
        height: thumbDimensions.height,
        sizeBytes: thumbBlob.size,
      },
    })
  } catch (error) {
    if (error instanceof Error && isDatabaseErrorMessage(error.message)) {
      throw error
    }

    throw new Error(DB_ERROR.PHOTO_PROCESSING_FAILED)
  }
}

export function createObjectUrlFromBlob(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url)
}

async function getImageDimensions(blob: Blob): Promise<ImageDimensions> {
  if (!('createImageBitmap' in window)) {
    return { width: null, height: null }
  }

  try {
    const bitmap = await createImageBitmap(blob)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  } catch {
    return { width: null, height: null }
  }
}

function isDatabaseErrorMessage(message: string): boolean {
  return Object.values(DB_ERROR).some((code) => code === message)
}
