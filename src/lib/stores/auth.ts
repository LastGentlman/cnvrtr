import { writable } from 'svelte/store';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  googleDriveQuota?: {
    used: number;
    total: number;
  };
}

export const currentUser = writable<User | null>(null);
export const isAuthenticated = writable<boolean>(false);
export const authLoading = writable<boolean>(false);

// Helper functions
export function setUser(user: User | null) {
  currentUser.set(user);
  isAuthenticated.set(!!user);
}

export function setAuthLoading(loading: boolean) {
  authLoading.set(loading);
}
