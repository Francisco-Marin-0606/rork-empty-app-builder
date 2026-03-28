/**
 * Helper functions for date formatting
 */

export const formatCommentTimestamp = (comment: { publishedAt?: string; createdAt?: string } | string | null): string => {
  // Si es un string, asumir que es publishedAt (compatibilidad hacia atrás)
  let dateString: string | null = null;
  let isYouTubeComment = false;
  
  if (typeof comment === 'string') {
    dateString = comment;
    isYouTubeComment = true; // String siempre se considera como publishedAt (YouTube)
  } else if (comment && typeof comment === 'object') {
    // Si tiene publishedAt, es de YouTube - no mostrar timestamp
    if (comment.publishedAt) {
      return '';
    }
    // Solo usar createdAt si no hay publishedAt (comentarios nativos)
    dateString = comment.createdAt || null;
  }
  
  if (!dateString || dateString.trim() === '') return 'Ahora';
  
  try {
    const now = new Date();
    const commentDate = new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(commentDate.getTime())) {
      return 'Ahora';
    }
    
    const diffInMs = now.getTime() - commentDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Ahora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}min`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 365) {
      return `${diffInDays}d`;
    } else {
      // Para fechas muy antiguas, mostrar fecha completa
      return commentDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Ahora';
  }
};
