import { useEffect, useState } from 'react'

import { createObjectUrlFromBlob, revokeObjectUrl } from '@/lib/photos'

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const nextUrl = createObjectUrlFromBlob(blob)
    setUrl(nextUrl)

    return () => {
      revokeObjectUrl(nextUrl)
    }
  }, [blob])

  return url
}
