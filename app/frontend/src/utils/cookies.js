export function getCookie(name) {
  const cookie = document.cookie
    .split("; ")
    .filter((entry) => entry.startsWith(`${name}=`))
    .at(-1);
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
}

export function setCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];

  if (typeof options.maxAgeSeconds === "number") {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  if (options.secure !== false && window.location.protocol === "https:") {
    parts.push("Secure");
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  document.cookie = parts.join("; ");
}

export function deleteCookie(name, options = {}) {
  setCookie(name, "", { ...options, maxAgeSeconds: 0 });
}
