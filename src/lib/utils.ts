import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateTicketNumber(lotteryId: string, sequence: number): string {
  const prefix = lotteryId.slice(0, 3).toUpperCase();
  return `${prefix}-${sequence.toString().padStart(6, '0')}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'sold':
      return 'text-green-600 bg-green-100';
    case 'inactive':
    case 'cancelled':
      return 'text-red-600 bg-red-100';
    case 'completed':
      return 'text-blue-600 bg-blue-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'text-purple-600 bg-purple-100';
    case 'seller':
      return 'text-blue-600 bg-blue-100';
    case 'viewer':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}