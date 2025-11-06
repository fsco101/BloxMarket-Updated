// Helper function to trigger custom messages from other components
export const sendMascotMessage = (message: string, type: 'talking' | 'celebrating' | 'thinking' | 'waving' = 'talking') => {
  window.dispatchEvent(new CustomEvent('mascot-message', {
    detail: { message, type }
  }));
};