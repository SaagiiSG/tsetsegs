// User-friendly error messages for database operations

export function getUserFriendlyError(error: any, context?: string): string {
  const message = error?.message || error?.toString() || '';
  
  // Check constraint violations
  if (message.includes('check constraint')) {
    if (message.includes('test_number')) {
      return 'Invalid test number. Please use a number between 1 and 20.';
    }
    if (message.includes('score')) {
      return 'Invalid score value. Please check the allowed range.';
    }
    if (message.includes('listening') || message.includes('reading') || message.includes('writing') || message.includes('speaking')) {
      return 'Invalid skill score. IELTS scores should be between 0 and 9.';
    }
    return 'Invalid data value. Please check your input.';
  }
  
  // Duplicate key violations
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    if (message.includes('phone')) {
      return 'This phone number is already registered.';
    }
    if (message.includes('student')) {
      return 'This student record already exists.';
    }
    return 'This record already exists. Try refreshing the page.';
  }
  
  // Foreign key violations
  if (message.includes('foreign key') || message.includes('violates foreign key')) {
    return 'Related data not found. The record may have been deleted.';
  }
  
  // RLS policy violations
  if (message.includes('row-level security') || message.includes('RLS')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Request took too long. Please try again.';
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'The requested data was not found.';
  }
  
  // Validation errors from Zod or similar
  if (message.includes('required') || message.includes('invalid')) {
    return message; // These are usually already user-friendly
  }
  
  // Context-specific fallbacks
  if (context) {
    return `Failed to ${context}. Please try again.`;
  }
  
  // Generic fallback
  return 'Something went wrong. Please try again.';
}

// Helper to format error for toast
export function getErrorToast(error: any, context?: string): { title: string; description: string } {
  return {
    title: context ? `Could not ${context}` : 'Error',
    description: getUserFriendlyError(error, context),
  };
}
