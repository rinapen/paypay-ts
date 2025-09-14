import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PKCE, generateDeviceState, updateHeaderDeviceState } from './utils';
import { PayPayError, PayPayLoginError, PayPayNetworkError } from './errors';
import {
  DeviceHeaders,
  GetBalance,
  LinkInfo,
  CreateLink,
  SendMoney,
  P2PCode,
  Profile,
  P2PUser,
  InitializeChatRoom,
  PayPayResponse,
  ProxyType
} from './types';

export class PayPay {
  private session: AxiosInstance;
  public device_uuid: string;
  public client_uuid: string;
  public access_token: string | null = null;
  public refresh_token: string | null = null;
  public code_verifier: string | null = null;
  public code_challenge: string | null = null;
  public version: string = "5.11.1";
  public headers: Record<string, string>;
  public params: Record<string, string>;
  private proxy: ProxyType;

  constructor(
    phone?: string,
    password?: string,
    device_uuid?: string,
    client_uuid: string = uuidv4(),
    access_token?: string,
    proxy?: ProxyType
  ) {
    // 電話番号のハイフン削除
    if (phone && phone.includes("-")) {
      phone = phone.replace(/-/g, "");
    }

    // セッション初期化
    this.session = axios.create();

    // デバイスUUID設定
    this.device_uuid = device_uuid || uuidv4();
    this.client_uuid = client_uuid;

    // プロキシ設定
    if (typeof proxy === 'string') {
      if (!proxy.includes("http")) {
        proxy = "http://" + proxy;
      }
      this.proxy = { https: proxy, http: proxy };
    } else {
      this.proxy = proxy || null;
    }

    // パラメータ設定
    this.params = {
      "payPayLang": "ja"
    };

    // デバイス状態生成
    const deviceState = generateDeviceState();
    
    // ヘッダー設定
    this.headers = {
      "Accept": "*/*",
      "Accept-Charset": "UTF-8",
      "Accept-Encoding": "gzip",
      "Client-Mode": "NORMAL",
      "Client-OS-Release-Version": "10",
      "Client-OS-Type": "ANDROID",
      "Client-OS-Version": "29.0.0",
      "Client-Type": "PAYPAYAPP",
      "Client-UUID": this.client_uuid,
      "Client-Version": this.version,
      "Connection": "Keep-Alive",
      "Content-Type": "application/x-www-form-urlencoded",
      "Device-Acceleration": deviceState.device_acceleration,
      "Device-Acceleration-2": deviceState.device_acceleration_2,
      "Device-Brand-Name": "KDDI",
      "Device-Hardware-Name": "qcom",
      "Device-In-Call": "false",
      "Device-Lock-App-Setting": "false",
      "Device-Lock-Type": "NONE",
      "Device-Manufacturer-Name": "samsung",
      "Device-Name": "SCV38",
      "Device-Orientation": deviceState.device_orientation,
      "Device-Orientation-2": deviceState.device_orientation_2,
      "Device-Rotation": deviceState.device_rotation,
      "Device-Rotation-2": deviceState.device_rotation_2,
      "Device-UUID": this.device_uuid,
      "Host": "app4.paypay.ne.jp",
      "Is-Emulator": "false",
      "Network-Status": "WIFI",
      "System-Locale": "ja",
      "Timezone": "Asia/Tokyo",
      "User-Agent": `PaypayApp/${this.version} Android10`
    };

    // アクセストークンが提供されている場合
    if (access_token) {
      this.access_token = access_token;
      this.headers["Authorization"] = `Bearer ${this.access_token}`;
      this.headers["content-type"] = "application/json";
    } else if (phone && password) {
      // 電話番号とパスワードでログイン開始
      this.initializeLogin(phone, password);
    }
  }

  private async initializeLogin(phone: string, password: string): Promise<void> {
    try {
      // PKCEペア生成
      const pkcePair = await PKCE.generatePKCEPair(43);
      this.code_verifier = pkcePair.codeVerifier;
      this.code_challenge = pkcePair.codeChallenge;

      // PAR (Pushed Authorization Request) リクエスト
      const payload = {
        "clientId": "pay2-mobile-app-client",
        "clientAppVersion": this.version,
        "clientOsVersion": "29.0.0",
        "clientOsType": "ANDROID",
        "redirectUri": "paypay://oauth2/callback",
        "responseType": "code",
        "state": PKCE.generateCodeVerifier(43),
        "codeChallenge": this.code_challenge,
        "codeChallengeMethod": "S256",
        "scope": "REGULAR",
        "tokenVersion": "v2",
        "prompt": "",
        "uiLocales": "ja"
      };

      const parResponse = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/oauth2/par?payPayLang=ja', payload);
      
      if (parResponse.header.resultCode !== "S0000") {
        throw new PayPayLoginError("PAR request failed", parResponse);
      }

      // 認証フロー開始
      await this.startAuthFlow(parResponse.payload.requestUri, phone, password);
    } catch (error) {
      if (error instanceof PayPayNetworkError) {
        throw error;
      }
      throw new PayPayNetworkError("日本以外からは接続できません");
    }
  }

  private async startAuthFlow(requestUri: string, phone: string, password: string): Promise<void> {
    const headers = {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "ja-JP,ja;q=0.9",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Host": "www.paypay.ne.jp",
      "is-emulator": "false",
      "Pragma": "no-cache",
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Android WebView";v="132"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": `Mozilla/5.0 (Linux; Android 10; SCV38 Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.163 Mobile Safari/537.36 jp.pay2.app.android/${this.version}`,
      "X-Requested-With": "jp.ne.paypay.android.app"
    };

    // 認証ページにアクセス
    await this.makeRequest('GET', 'https://www.paypay.ne.jp/portal/api/v2/oauth2/authorize', null, {
      client_id: "pay2-mobile-app-client",
      request_uri: requestUri
    }, headers);

    // サインインページにアクセス
    await this.makeRequest('GET', 'https://www.paypay.ne.jp/portal/oauth2/sign-in', null, {
      client_id: "pay2-mobile-app-client",
      mode: "landing"
    }, headers);

    // PARチェック
    const parCheckHeaders = {
      ...headers,
      "Accept": "application/json, text/plain, */*",
      "Client-Id": "pay2-mobile-app-client",
      "Client-Type": "PAYPAYAPP",
      "Referer": "https://www.paypay.ne.jp/portal/oauth2/sign-in?client_id=pay2-mobile-app-client&mode=landing",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };

    const parCheck = await this.makeRequest('GET', 'https://www.paypay.ne.jp/portal/api/v2/oauth2/par/check', null, null, parCheckHeaders);
    
    if (parCheck.header.resultCode !== "S0000") {
      throw new PayPayLoginError("PAR check failed", parCheck);
    }

    // サインイン
    const signInHeaders = {
      ...parCheckHeaders,
      "Client-OS-Type": "ANDROID",
      "Client-OS-Version": "29.0.0",
      "Client-Version": this.version,
      "Content-Type": "application/json",
      "Origin": "https://www.paypay.ne.jp"
    };

    const signInPayload = {
      "username": phone,
      "password": password,
      "signInAttemptCount": 1
    };

    const signIn = await this.makeRequest('POST', 'https://www.paypay.ne.jp/portal/api/v2/oauth2/sign-in/password', signInPayload, null, signInHeaders);
    
    if (signIn.header.resultCode !== "S0000") {
      throw new PayPayLoginError("Sign in failed", signIn);
    }

    // デバイスUUIDが登録済みの場合
    if (this.device_uuid !== uuidv4()) {
      try {
        const uri = signIn.payload.redirectUrl.replace("paypay://oauth2/callback?", "").split("&");
        
        const confirmData = {
          "clientId": "pay2-mobile-app-client",
          "redirectUri": "paypay://oauth2/callback",
          "code": uri[0].replace("code=", ""),
          "codeVerifier": this.code_verifier
        };

        const getToken = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/oauth2/token', confirmData);
        
        if (getToken.header.resultCode !== "S0000") {
          throw new PayPayLoginError("Token request failed", getToken);
        }

        this.access_token = getToken.payload.accessToken;
        this.refresh_token = getToken.payload.refreshToken;
        this.headers["Authorization"] = `Bearer ${this.access_token}`;
        this.headers["content-type"] = "application/json";
        this.headers = updateHeaderDeviceState(this.headers);
      } catch (error) {
        throw new PayPayLoginError("登録されていないDevice-UUID");
      }
    } else {
      // 2FAフローが必要
      throw new PayPayLoginError("2FA認証が必要です。login()メソッドを使用してください。");
    }
  }

  protected async makeRequest(
    method: 'GET' | 'POST',
    url: string,
    data?: any,
    params?: any,
    customHeaders?: Record<string, string>
  ): Promise<PayPayResponse> {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: customHeaders || this.headers,
      params,
      data,
      proxy: this.proxy === null ? undefined : 
             typeof this.proxy === 'string' ? { http: this.proxy, https: this.proxy } : this.proxy as any
    };

    try {
      const response = await this.session(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      throw new PayPayNetworkError("ネットワークエラーが発生しました", error);
    }
  }

  // 公開メソッドの実装は次のファイルで続きます...
}
