import { writable } from 'svelte/store';

export interface ProcessingTask {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  originalSize: number;
  compressedSize?: number;
  processingTime?: number;
  downloadUrl?: string;
  shareUrl?: string;
}

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  thumbnail?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  originalFile?: File;
  processedFile?: File;
  downloadUrl?: string;
  shareUrl?: string;
  processingTime?: number;
  compressionRatio?: number;
}

// Global state stores
export const processingQueue = writable<ProcessingTask[]>([]);
export const currentVideo = writable<VideoFile | null>(null);
export const isProcessing = writable<boolean>(false);
export const appConfig = writable({
  maxFileSize: 200 * 1024 * 1024, // 200MB
  supportedFormats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
  compressionQuality: 0.8,
  enableGoogleDrive: true,
  enableBitly: true
});

// Helper functions
export function addToQueue(file: File): string {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newTask: ProcessingTask = {
    id: taskId,
    file,
    status: 'pending',
    progress: 0,
    originalSize: file.size
  };
  
  processingQueue.update(queue => [...queue, newTask]);
  return taskId;
}

export function updateTaskProgress(taskId: string, progress: number, status?: ProcessingTask['status']) {
  processingQueue.update(queue => 
    queue.map(task => 
      task.id === taskId 
        ? { ...task, progress, ...(status && { status }) }
        : task
    )
  );
}

export function completeTask(taskId: string, result: Partial<ProcessingTask>) {
  processingQueue.update(queue => 
    queue.map(task => 
      task.id === taskId 
        ? { ...task, ...result, status: 'completed' }
        : task
    )
  );
}

export function removeTask(taskId: string) {
  processingQueue.update(queue => queue.filter(task => task.id !== taskId));
}

export function clearQueue() {
  processingQueue.set([]);
}
