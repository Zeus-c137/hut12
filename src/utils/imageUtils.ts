/**
 * Utility to convert user-supplied image URLs into valid direct image URLs.
 * Automatically converts GitHub web page blob links (e.g. github.com/user/repo/blob/main/bg.png)
 * into direct raw image stream URLs (raw.githubusercontent.com/user/repo/main/bg.png).
 */
export function fixGitHubImageUrl(url?: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("github.com/") && clean.includes("/blob/")) {
    clean = clean.replace("github.com/", "raw.githubusercontent.com/").replace("/blob/", "/");
  } else if (clean.includes("github.com/") && clean.includes("/raw/")) {
    clean = clean.replace("github.com/", "raw.githubusercontent.com/").replace("/raw/", "/");
  }
  return clean;
}
