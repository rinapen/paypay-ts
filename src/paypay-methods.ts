import { v4 as uuidv4 } from 'uuid';
import { PayPay } from './paypay';
import { PayPayError, PayPayLoginError, PayPayNetworkError } from './errors';
import { updateHeaderDeviceState } from './utils';
import {
  GetBalance,
  LinkInfo,
  CreateLink,
  SendMoney,
  P2PCode,
  Profile,
  P2PUser,
  InitializeChatRoom,
  PayPayResponse
} from './types';

export class PayPayMethods extends PayPay {
  
  async login(url: string): Promise<PayPayResponse> {
    if (url.includes("https://")) {
      url = url.replace("https://www.paypay.ne.jp/portal/oauth2/l?id=", "");
    }

    const headers = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "ja-JP,ja;q=0.9",
      "Cache-Control": "no-cache",
      "Client-Id": "pay2-mobile-app-client",
      "Client-OS-Type": "ANDROID",
      "Client-OS-Version": "29.0.0",
      "Client-Type": "PAYPAYAPP",
      "Client-Version": this.version,
      "Connection": "keep-alive",
      "Content-Type": "application/json",
      "Host": "www.paypay.ne.jp",
      "Origin": "https://www.paypay.ne.jp",
      "Pragma": "no-cache",
      "Referer": `https://www.paypay.ne.jp/portal/oauth2/l?id=${url}&client_id=pay2-mobile-app-client`,
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Android WebView";v="132"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": `Mozilla/5.0 (Linux; Android 10; SCV38 Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.163 Mobile Safari/537.36 jp.pay2.app.android/${this.version}`,
      "X-Requested-With": "jp.ne.paypay.android.app"
    };

    const confirmUrl = await this.makeRequest('POST', 'https://www.paypay.ne.jp/portal/api/v2/oauth2/extension/sign-in/2fa/otl/verify', { code: url }, null, headers);
    
    if (confirmUrl.header.resultCode !== "S0000") {
      throw new PayPayLoginError("OTL verification failed", confirmUrl);
    }

    const payload = {
      "params": {
        "extension_id": "user-main-2fa-v1",
        "data": {
          "type": "COMPLETE_OTL",
          "payload": null
        }
      }
    };

    const getUri = await this.makeRequest('POST', 'https://www.paypay.ne.jp/portal/api/v2/oauth2/extension/code-grant/update', payload, null, headers);
    
    if (getUri.header.resultCode !== "S0000") {
      throw new PayPayLoginError("Code grant update failed", getUri);
    }

    let uri: string[];
    try {
      uri = getUri.payload.redirect_uri.replace("paypay://oauth2/callback?", "").split("&");
    } catch {
      throw new PayPayLoginError('redirect_uriが見つかりませんでした\n' + JSON.stringify(getUri));
    }

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

    return getToken;
  }

  async tokenRefresh(refreshToken: string): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const refData = {
      "clientId": "pay2-mobile-app-client",
      "refreshToken": refreshToken,
      "tokenVersion": "v2"
    };

    const refresh = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/oauth2/refresh', refData);

    if (refresh.header.resultCode === "S0001" || refresh.header.resultCode === "S1003") {
      throw new PayPayLoginError("Token refresh failed", refresh);
    }

    if (refresh.header.resultCode === "S0003") {
      throw new PayPayLoginError("Token refresh failed", refresh);
    }

    if (refresh.header.resultCode !== "S0000") {
      throw new PayPayError("Token refresh failed", refresh);
    }

    this.access_token = refresh.payload.accessToken;
    this.refresh_token = refresh.payload.refreshToken;
    this.headers["Authorization"] = `Bearer ${refresh.payload.accessToken}`;

    return refresh;
  }

  async getHistory(size: number = 20, cashback: boolean = false): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const params: any = {
      "pageSize": size.toString(),
      "orderTypes": "",
      "paymentMethodTypes": "",
      "signUpCompletedAt": "2021-01-02T10:16:24Z",
      "isOverdraftOnly": "false",
      "payPayLang": "ja"
    };

    if (cashback) {
      params["orderTypes"] = "CASHBACK";
    }

    const history = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v3/getPaymentHistory', null, params);

    if (history.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get history failed", history);
    }

    if (history.header.resultCode !== "S0000") {
      throw new PayPayError("Get history failed", history);
    }

    return history;
  }

  async getBalance(): Promise<GetBalance> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const params = {
      "includePendingBonusLite": "false",
      "includePending": "true",
      "noCache": "true",
      "includeKycInfo": "true",
      "includePayPaySecuritiesInfo": "true",
      "includePointInvestmentInfo": "true",
      "includePayPayBankInfo": "true",
      "includeGiftVoucherInfo": "true",
      "payPayLang": "ja"
    };

    const balance = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v1/getBalanceInfo', null, params);

    if (balance.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get balance failed", balance);
    }

    if (balance.header.resultCode !== "S0000") {
      throw new PayPayError("Get balance failed", balance);
    }

    let money: number | null = null;
    try {
      money = balance.payload.walletDetail.emoneyBalanceInfo.balance;
    } catch {
      money = null;
    }

    const money_light = balance.payload.walletDetail.prepaidBalanceInfo.balance;
    const all_balance = balance.payload.walletSummary.allTotalBalanceInfo.balance;
    const useable_balance = balance.payload.walletSummary.usableBalanceInfoWithoutCashback.balance;
    const points = balance.payload.walletDetail.cashBackBalanceInfo.balance;

    return {
      money,
      money_light,
      all_balance,
      useable_balance,
      points,
      raw: balance
    };
  }

  async linkCheck(url: string, webApi: boolean = false): Promise<LinkInfo> {
    if (url.includes("https://")) {
      url = url.replace("https://pay.paypay.ne.jp/", "");
    }

    let linkInfo: PayPayResponse;

    if (webApi) {
      const headers = {
        "Accept": "application/json, text/plain, */*",
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        "Content-Type": "application/json"
      };
      linkInfo = await this.makeRequest('GET', `https://www.paypay.ne.jp/app/v2/p2p-api/getP2PLinkInfo?verificationCode=${url}`, null, null, headers);
    } else {
      if (!this.access_token) {
        throw new PayPayLoginError("まずはログインしてください");
      }

      const params = {
        "verificationCode": url,
        "payPayLang": "ja"
      };
      linkInfo = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v2/getP2PLinkInfo', null, params);
    }

    if (linkInfo.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link check failed", linkInfo);
    }

    if (linkInfo.header.resultCode !== "S0000") {
      throw new PayPayError("Link check failed", linkInfo);
    }

    const sender_name = linkInfo.payload.sender.displayName;
    const sender_external_id = linkInfo.payload.sender.externalId;
    const sender_icon = linkInfo.payload.sender.photoUrl;
    const order_id = linkInfo.payload.pendingP2PInfo.orderId;
    const chat_room_id = linkInfo.payload.message.chatRoomId;
    const amount = linkInfo.payload.pendingP2PInfo.amount;
    const status = linkInfo.payload.message.data.status;
    const money_light = linkInfo.payload.message.data.subWalletSplit.senderPrepaidAmount;
    const money = linkInfo.payload.message.data.subWalletSplit.senderEmoneyAmount;
    const has_password = linkInfo.payload.pendingP2PInfo.isSetPasscode;

    return {
      sender_name,
      sender_external_id,
      sender_icon,
      order_id,
      chat_room_id,
      amount,
      status,
      money_light,
      money,
      has_password,
      raw: linkInfo
    };
  }

  async linkReceive(url: string, passcode?: string, linkInfo?: LinkInfo): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    if (url.includes("https://")) {
      url = url.replace("https://pay.paypay.ne.jp/", "");
    }

    let linkInfoData = linkInfo;
    if (!linkInfoData) {
      linkInfoData = await this.linkCheck(url);
    }

    const payload: any = {
      "requestId": uuidv4(),
      "orderId": linkInfoData!.order_id,
      "verificationCode": url,
      "passcode": null,
      "senderMessageId": linkInfoData!.raw.payload.message.messageId,
      "senderChannelUrl": linkInfoData!.raw.payload.message.chatRoomId
    };

    if (linkInfoData!.raw.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.header.resultCode !== "S0000") {
      throw new PayPayError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.payload.orderStatus !== "PENDING") {
      throw new PayPayError("すでに 受け取り / 辞退 / キャンセル されているリンクです");
    }

    if (linkInfoData!.raw.payload.pendingP2PInfo.isSetPasscode && !passcode) {
      throw new PayPayError("このリンクにはパスワードが設定されています");
    }

    if (linkInfoData!.raw.payload.pendingP2PInfo.isSetPasscode) {
      payload["passcode"] = passcode || null;
    }

    const receive = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/acceptP2PSendMoneyLink', payload, { "payPayLang": "ja", "appContext": "P2PMoneyTransferDetailScreen_linkReceiver" });

    if (receive.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link receive failed", receive);
    }

    if (receive.header.resultCode !== "S0000") {
      throw new PayPayError("Link receive failed", receive);
    }

    return receive;
  }

  async linkReject(url: string, linkInfo?: LinkInfo): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    if (url.includes("https://")) {
      url = url.replace("https://pay.paypay.ne.jp/", "");
    }

    let linkInfoData = linkInfo;
    if (!linkInfoData) {
      linkInfoData = await this.linkCheck(url);
    }

    const payload = {
      "requestId": uuidv4(),
      "orderId": linkInfoData!.order_id,
      "verificationCode": url,
      "senderMessageId": linkInfoData!.raw.payload.message.messageId,
      "senderChannelUrl": linkInfoData!.raw.payload.message.chatRoomId
    };

    if (linkInfoData!.raw.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.header.resultCode !== "S0000") {
      throw new PayPayError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.payload.orderStatus !== "PENDING") {
      throw new PayPayError("すでに 受け取り / 辞退 / キャンセル されているリンクです");
    }

    const reject = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/rejectP2PSendMoneyLink', payload);

    if (reject.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link reject failed", reject);
    }

    if (reject.header.resultCode !== "S0000") {
      throw new PayPayError("Link reject failed", reject);
    }

    return reject;
  }

  async linkCancel(url: string, linkInfo?: LinkInfo): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    if (url.includes("https://")) {
      url = url.replace("https://pay.paypay.ne.jp/", "");
    }

    let linkInfoData = linkInfo;
    if (!linkInfoData) {
      linkInfoData = await this.linkCheck(url);
    }

    const payload = {
      "orderId": linkInfoData!.order_id,
      "requestId": uuidv4(),
      "verificationCode": url
    };

    if (linkInfoData!.raw.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.header.resultCode !== "S0000") {
      throw new PayPayError("Link info failed", linkInfoData!.raw);
    }

    if (linkInfoData!.raw.payload.orderStatus !== "PENDING") {
      throw new PayPayError("すでに 受け取り / 辞退 / キャンセル されているリンクです");
    }

    const cancel = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v1/cancelP2PSendMoneyLink', payload);

    if (cancel.header.resultCode === "S0001") {
      throw new PayPayLoginError("Link cancel failed", cancel);
    }

    if (cancel.header.resultCode !== "S0000") {
      throw new PayPayError("Link cancel failed", cancel);
    }

    return cancel;
  }

  async createLink(amount: number, passcode?: string, pochibukuro: boolean = false, theme: string = "default-sendmoney"): Promise<CreateLink> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload: any = {
      "requestId": uuidv4(),
      "amount": amount,
      "socketConnection": "P2P",
      "theme": theme,
      "source": "sendmoney_home_sns"
    };

    if (passcode) {
      payload["passcode"] = passcode;
    }
    if (pochibukuro) {
      payload["theme"] = "pochibukuro";
    }

    const create = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v2/executeP2PSendMoneyLink', payload);

    if (create.header.resultCode === "S0001") {
      throw new PayPayLoginError("Create link failed", create);
    }

    if (create.header.resultCode !== "S0000") {
      throw new PayPayError("Create link failed", create);
    }

    const link = create.payload.link;
    const chat_room_id = create.payload.chatRoomId;
    const order_id = create.payload.orderId;

    return {
      link,
      chat_room_id,
      order_id,
      raw: create
    };
  }

  async sendMoney(amount: number, receiverId: string, pochibukuro: boolean = false, theme: string = "default-sendmoney"): Promise<SendMoney> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload: any = {
      "amount": amount,
      "theme": theme,
      "requestId": uuidv4(),
      "externalReceiverId": receiverId,
      "ackRiskError": false,
      "source": "sendmoney_history_chat",
      "socketConnection": "P2P"
    };

    if (pochibukuro) {
      payload["theme"] = "pochibukuro";
    }

    const send = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v3/executeP2PSendMoney', payload);

    if (send.header.resultCode === "S0001") {
      throw new PayPayLoginError("Send money failed", send);
    }

    if (send.header.resultCode !== "S0000") {
      throw new PayPayError("Send money failed", send);
    }

    const chat_room_id = send.payload.chatRoomId;
    const order_id = send.payload.orderId;

    return {
      chat_room_id,
      order_id,
      raw: send
    };
  }

  async sendMessage(chatRoomId: string, message: string): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload = {
      "channelUrl": chatRoomId,
      "message": message,
      "socketConnection": "P2P"
    };

    const send = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v1/sendP2PMessage', payload);

    if (send.header.resultCode === "S0001") {
      throw new PayPayLoginError("Send message failed", send);
    }

    if (send.header.resultCode !== "S0000") {
      throw new PayPayError("Send message failed", send);
    }

    return send;
  }

  async createP2PCode(amount?: number): Promise<P2PCode> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload: any = {
      "amount": null,
      "sessionId": null
    };

    if (amount) {
      payload["amount"] = amount;
      payload["sessionId"] = uuidv4();
    }

    const createP2PCode = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v1/createP2PCode', payload);

    if (createP2PCode.header.resultCode === "S0001") {
      throw new PayPayLoginError("Create P2P code failed", createP2PCode);
    }

    if (createP2PCode.header.resultCode !== "S0000") {
      throw new PayPayError("Create P2P code failed", createP2PCode);
    }

    const p2pcode = createP2PCode.payload.p2pCode;

    return {
      p2pcode,
      raw: createP2PCode
    };
  }

  async getProfile(): Promise<Profile> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const profile = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v2/getProfileDisplayInfo', null, {
      "includeExternalProfileSync": "true",
      "completedOptionalTasks": "ENABLED_NEARBY_DEALS",
      "payPayLang": "ja"
    });

    if (profile.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get profile failed", profile);
    }

    if (profile.header.resultCode !== "S0000") {
      throw new PayPayError("Get profile failed", profile);
    }

    const name = profile.payload.userProfile.nickName;
    const external_user_id = profile.payload.userProfile.externalUserId;
    const icon = profile.payload.userProfile.avatarImageUrl;

    return {
      name,
      external_user_id,
      icon,
      raw: profile
    };
  }

  async setMoneyPriority(paypayMoney: boolean = false): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const setting = paypayMoney ? { "moneyPriority": "MONEY_FIRST" } : { "moneyPriority": "MONEY_LITE_FIRST" };

    const smp = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v1/setMoneyPriority', setting, { "payPayLang": "ja" });

    if (smp.header.resultCode === "S0001") {
      throw new PayPayLoginError("Set money priority failed", smp);
    }

    if (smp.header.resultCode !== "S0000") {
      throw new PayPayError("Set money priority failed", smp);
    }

    return smp;
  }

  async getChatRooms(size: number = 20, lastMessage: boolean = true): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const params = {
      "pageSize": size.toString(),
      "customTypes": "P2P_CHAT,P2P_CHAT_INACTIVE,P2P_PUBLIC_GROUP_CHAT,P2P_LINK,P2P_OLD",
      "requiresLastMessage": lastMessage,
      "socketConnection": "P2P",
      "payPayLang": "ja"
    };

    const getchat = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/p2p/v1/getP2PChatRoomListLite', null, params);

    if (getchat.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get chat rooms failed", getchat);
    }

    if (getchat.header.resultCode === "S5000") {
      throw new PayPayError("チャットルームが見つかりませんでした");
    }

    if (getchat.header.resultCode !== "S0000") {
      throw new PayPayError("Get chat rooms failed", getchat);
    }

    return getchat;
  }

  async getChatRoomMessages(chatRoomId: string, prev: number = 15, next: number = 0, include: boolean = false): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    if (!chatRoomId.includes("sendbird_group_channel_")) {
      chatRoomId = "sendbird_group_channel_" + chatRoomId;
    }

    const params = {
      "chatRoomId": chatRoomId,
      "include": include,
      "prev": prev.toString(),
      "next": next.toString(),
      "payPayLang": "ja"
    };

    const getchat = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v1/getP2PMessageList', null, params);

    if (getchat.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get chat room messages failed", getchat);
    }

    if (getchat.header.resultCode === "S5000") {
      throw new PayPayError("チャットルームが見つかりませんでした");
    }

    if (getchat.header.resultCode !== "S0000") {
      throw new PayPayError("Get chat room messages failed", getchat);
    }

    return getchat;
  }

  async getPointHistory(): Promise<PayPayResponse> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const params = {
      "pageSize": "20",
      "orderTypes": "CASHBACK",
      "paymentMethodTypes": "",
      "signUpCompletedAt": "2021-01-02T10:16:24Z",
      "pointType": "REGULAR",
      "isOverdraftOnly": "false",
      "payPayLang": "ja"
    };

    const phistory = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v3/getPaymentHistory', null, params);

    if (phistory.header.resultCode === "S0001") {
      throw new PayPayLoginError("Get point history failed", phistory);
    }

    if (phistory.header.resultCode !== "S0000") {
      throw new PayPayError("Get point history failed", phistory);
    }

    return phistory;
  }

  async searchP2PUser(userId: string, size: number = 10, isGlobal: boolean = true, order: number = 0): Promise<P2PUser> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload: any = {
      "searchTerm": userId,
      "pageToken": "",
      "pageSize": size,
      "isIngressSendMoney": false,
      "searchTypes": "GLOBAL_SEARCH"
    };

    if (!isGlobal) {
      payload["searchTypes"] = "FRIEND_AND_CANDIDATE_SEARCH";
    }

    const p2puser = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v3/searchP2PUser', payload);

    if (p2puser.header.resultCode === "S0001") {
      throw new PayPayLoginError("Search P2P user failed", p2puser);
    }

    if (p2puser.header.resultCode !== "S0000") {
      if (p2puser.error?.displayErrorResponse?.description === "しばらく時間をおいて、再度お試しください") {
        throw new PayPayError("レート制限に達しました");
      }
      throw new PayPayError("Search P2P user failed", p2puser);
    }

    if (p2puser.payload.searchResultEnum === "NO_USERS_FOUND") {
      throw new PayPayError("ユーザーが見つかりませんでした");
    }

    let name: string, icon: string, external_id: string;

    if (isGlobal) {
      name = p2puser.payload.globalSearchResult.displayName;
      icon = p2puser.payload.globalSearchResult.photoUrl;
      external_id = p2puser.payload.globalSearchResult.externalId;
    } else {
      name = p2puser.payload.friendsAndCandidatesSearchResults.friends[order].displayName;
      icon = p2puser.payload.friendsAndCandidatesSearchResults.friends[order].photoUrl;
      external_id = p2puser.payload.friendsAndCandidatesSearchResults.friends[order].externalId;
    }

    return {
      name,
      icon,
      external_id,
      raw: p2puser
    };
  }

  async initializeChatroom(externalId: string): Promise<InitializeChatRoom> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const payload = {
      "returnChatRoom": true,
      "shouldCheckMessageForFriendshipAppeal": true,
      "externalUserId": externalId,
      "socketConnection": "P2P"
    };

    const initialize = await this.makeRequest('POST', 'https://app4.paypay.ne.jp/p2p/v1/initialiseOneToOneAndLinkChatRoom', payload);

    if (initialize.header.resultCode === "S0001") {
      throw new PayPayLoginError("Initialize chatroom failed", initialize);
    }

    if (initialize.header.resultCode === "S5000") {
      throw new PayPayError("チャットルームが見つかりませんでした");
    }

    if (initialize.header.resultCode !== "S0000") {
      throw new PayPayError("Initialize chatroom failed", initialize);
    }

    const chatroom_id = initialize.payload.chatRoom.chatRoomId;

    return {
      chatroom_id,
      raw: initialize
    };
  }

  async alive(): Promise<void> {
    if (!this.access_token) {
      throw new PayPayLoginError("まずはログインしてください");
    }

    const alive = await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v1/getGlobalServiceStatus?payPayLang=en');

    if (alive.header.resultCode === "S0001") {
      throw new PayPayLoginError("Alive check failed", alive);
    }

    if (alive.header.resultCode !== "S0000") {
      throw new PayPayError("Alive check failed", alive);
    }

    await this.makeRequest('POST', 'https://app4.paypay.ne.jp/bff/v3/getHomeDisplayInfo?payPayLang=ja', {
      "excludeMissionBannerInfoFlag": false,
      "includeBeginnerFlag": false,
      "includeSkinInfoFlag": false,
      "networkStatus": "WIFI"
    });

    await this.makeRequest('GET', 'https://app4.paypay.ne.jp/bff/v1/getSearchBar?payPayLang=ja');
  }
}
