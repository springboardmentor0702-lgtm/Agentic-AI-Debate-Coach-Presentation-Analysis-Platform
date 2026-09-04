import { api } from "./api";

/**
 * Downloads a file the auth-token way: the browser can't be pointed
 * directly at a protected API URL (no way to attach the Authorization
 * header to a plain link click), so instead we fetch it as a blob
 * through our normal authenticated axios instance, then synthesize a
 * temporary download link for the browser to click.
 *
 * Shared between Reports.jsx (the aggregate progress report) and every
 * tool page's per-item "download PDF" button (Segment 17).
 */
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
