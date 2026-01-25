import { type StandardRate } from "./types";

const DEFAULT_TIMEOUT_MS = 10000; // 10s default timeout

export abstract class RateProvider {
  abstract name: string;
  abstract weight: number;
  abstract fetch(base: string): Promise<StandardRate>;

  /**
   * 带超时的 fetch 封装
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${this.name} fetch timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}