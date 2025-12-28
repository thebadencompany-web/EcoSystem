declare module '@sentry/node' {
  export function init(options: any): void;
  export function captureException(exception: any): void;
  export function withScope(callback: (scope: any) => void): void;
  // Add other necessary type declarations here
}