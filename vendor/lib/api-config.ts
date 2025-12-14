// Centralized API URL configuration
// For Android development, use your local network IP address
// Set NEXT_PUBLIC_API_URL in .env.local or use the default below

export const API_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000")
    : (process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000");

// For server-side rendering compatibility
export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.35:5000";
};



