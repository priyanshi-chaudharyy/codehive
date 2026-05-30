import toast from 'react-hot-toast';

/**
 * Toast notification wrapper with consistent styling.
 * Usage:
 *   showToast.success('Room created!');
 *   showToast.error('Failed to join room');
 *   showToast.info('User joined the room');
 */
const showToast = {
  success: (message) => {
    toast.success(message);
  },

  error: (message) => {
    toast.error(message);
  },

  info: (message) => {
    toast(message, {
      icon: 'ℹ️',
    });
  },

  loading: (message) => {
    return toast.loading(message);
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  promise: (promise, { loading, success, error }) => {
    return toast.promise(promise, { loading, success, error });
  },
};

export default showToast;
