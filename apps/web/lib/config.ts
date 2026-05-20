/**
 * Centralized API configuration for the WCE frontend.
 *
 * Server components (app/):  reads NEXT_PUBLIC_API_URL at build time.
 * Client components ('use client'): reads NEXT_PUBLIC_API_URL at runtime in browser.
 *
 * Set NEXT_PUBLIC_API_URL in Vercel → Project → Environment Variables
 * e.g. https://wce-api.onrender.com
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";
