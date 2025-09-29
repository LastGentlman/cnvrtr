// Minimal File System Access API helpers (Chromium-based browsers only)
// Docs: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

export interface SavedFileHandle {
  fileHandle: FileSystemFileHandle;
  directoryHandle: FileSystemDirectoryHandle;
  suggestedName: string;
}

export async function ensurePermissions(handle: FileSystemHandle, mode: 'read' | 'readwrite' = 'readwrite'): Promise<void> {
  const opts = { mode } as any;
  const anyHandle = handle as any;
  if ((await anyHandle.queryPermission?.(opts)) === 'granted') return;
  const result = await anyHandle.requestPermission?.(opts);
  if (result !== 'granted') {
    throw new Error('Permission to access the selected directory was denied.');
  }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // @ts-ignore
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
  await ensurePermissions(handle, 'readwrite');
  return handle;
}

export async function saveFileToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  file: File,
  suggestedName?: string
): Promise<SavedFileHandle> {
  await ensurePermissions(directoryHandle, 'readwrite');
  const fileName = suggestedName || file.name;
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return { fileHandle, directoryHandle, suggestedName: fileName };
}

export async function readBackFile(fileHandle: FileSystemFileHandle): Promise<File> {
  const file = await fileHandle.getFile();
  return new File([await file.arrayBuffer()], file.name, { type: file.type || 'application/octet-stream' });
}

export async function deleteSavedFile(directoryHandle: FileSystemDirectoryHandle, fileName: string): Promise<void> {
  await ensurePermissions(directoryHandle, 'readwrite');
  const anyDir = directoryHandle as any;
  await anyDir.removeEntry(fileName);
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

