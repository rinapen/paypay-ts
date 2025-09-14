import { PayPayMethods } from './paypay-methods';
import { PayPayError, PayPayLoginError, PayPayNetworkError } from './errors';
import { updateHeaderDeviceState } from './utils';

export class PayPay extends PayPayMethods {
  updateHeaderDeviceState(headers: Record<string, string>): Record<string, string> {
    return updateHeaderDeviceState(headers);
  }
}

export { PayPayError, PayPayLoginError, PayPayNetworkError };

export * from './types';


export const version = '2.3.3';
export const url = 'https://github.com/rinapen/paypay.ts';

export default PayPay;
