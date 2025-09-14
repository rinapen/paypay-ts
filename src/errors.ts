export class PayPayError extends Error {
  constructor(message: string, public response?: any) {
    super(message);
    this.name = 'PayPayError';
  }
}

export class PayPayLoginError extends Error {
  constructor(message: string, public response?: any) {
    super(message);
    this.name = 'PayPayLoginError';
  }
}

export class PayPayNetworkError extends Error {
  constructor(message: string, public response?: any) {
    super(message);
    this.name = 'PayPayNetworkError';
  }
}