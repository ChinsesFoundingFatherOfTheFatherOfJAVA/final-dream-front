import { initUpload, mergeUpload, uploadChunk } from '@/api/courseware'

const CHUNK_SIZE = 5 * 1024 * 1024

async function fingerprint(file: File) {
  const first = await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer()
  const lastStart = Math.max(0, file.size - 512 * 1024)
  const last = await file.slice(lastStart).arrayBuffer()
  const bytes = new Uint8Array(first.byteLength + last.byteLength)
  bytes.set(new Uint8Array(first), 0)
  bytes.set(new Uint8Array(last), first.byteLength)
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `f-${file.name}-${file.size}-${file.lastModified}-${(hash >>> 0).toString(16)}`
}

export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
  chunkSize = CHUNK_SIZE
) {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))
  const uploadId = crypto.randomUUID()
  const md5 = await fingerprint(file)
  const initialized = await initUpload({
    fileName: file.name,
    fileSize: file.size,
    md5,
    chunkSize,
    totalChunks,
    uploadId
  })
  if (initialized.instant && initialized.storagePath) {
    onProgress?.(100)
    return {
      fileName: file.name,
      fileSize: file.size,
      storagePath: initialized.storagePath
    }
  }

  const uploaded = new Set(initialized.uploadedChunks ?? [])
  for (let index = 0; index < totalChunks; index++) {
    if (uploaded.has(index)) {
      onProgress?.(Math.round(((index + 1) / totalChunks) * 100))
      continue
    }
    const chunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize))
    await uploadChunk(initialized.uploadId, index, chunk)
    onProgress?.(Math.round(((index + 1) / totalChunks) * 100))
  }
  const merged = await mergeUpload(initialized.uploadId, file.name)
  return {
    fileName: file.name,
    fileSize: merged.fileSize,
    storagePath: merged.storagePath
  }
}
