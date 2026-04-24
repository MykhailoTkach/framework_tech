export async function fetchWithRetry(url, retries = 3, timeout = 5000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timer);
      if (attempt === retries - 1) throw error;
      const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
