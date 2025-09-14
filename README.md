# PayPay API Client for TypeScript/Node.js

TypeScript/Node.jsでPayPayのモバイルAPIを利用するためのクライアントライブラリです。

## 特徴

- 完全なTypeScriptサポート
- async/awaitパターンによる非同期処理
- 型安全性とIDEの自動補完
- 送金、受け取り、チャット、残高確認などの包括的な機能

## インストール

```bash
npm install paypay-ts
```

または

```bash
yarn add paypay-ts
```

## 開発環境

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発モードでの実行
npm run dev

# サンプルコードの実行
npm run example
```

## 注意事項

### アカウント保護
- ログインを3回連続で失敗するとアカウントが一時ロックされます
- 大量のセッション作成はアカウント凍結のリスクがあります
- 日本国内からのアクセスのみサポートされています

### 推奨事項
- 本番環境では適切なエラーハンドリングを実装してください
- レート制限を考慮した実装を行ってください
- 海外からのアクセスにはプロキシの使用を検討してください

## 基本的な使用例

### ログイン

```typescript
import { PayPay } from 'paypay-ts';

async function main() {
  try {
    // 電話番号とパスワードでログイン開始
    const paypay = new PayPay("080-1234-5678", "your-password");
    
    // 2FA認証（URLまたはIDを入力）
    const url = "TK4602"; // または完全なURL
    await paypay.login(url);
    
    console.log("アクセストークン:", paypay.access_token);
    console.log("リフレッシュトークン:", paypay.refresh_token);
    console.log("デバイスUUID:", paypay.device_uuid);
    
  } catch (error) {
    console.error("エラー:", error);
  }
}

main();
```

### アクセストークンでの直接ログイン

```typescript
// アクセストークンが既にある場合
const paypay = new PayPay(undefined, undefined, undefined, undefined, "your-access-token");

// 登録済みデバイスUUIDでのログイン
const paypay2 = new PayPay("080-1234-5678", "password", "registered-device-uuid");
```

## API リファレンス

### 認証・セッション管理

#### `login(url: string): Promise<PayPayResponse>`
2FA認証を完了してログインします。

#### `tokenRefresh(refreshToken: string): Promise<PayPayResponse>`
アクセストークンを更新します。

### 残高・履歴

#### `getBalance(): Promise<GetBalance>`
残高情報を取得します。

```typescript
const balance = await paypay.getBalance();
console.log("総残高:", balance.all_balance);
console.log("使用可能残高:", balance.useable_balance);
console.log("マネーライト:", balance.money_light);
console.log("マネー:", balance.money);
console.log("ポイント:", balance.points);
```

#### `getHistory(size?: number, cashback?: boolean): Promise<PayPayResponse>`
取引履歴を取得します。

#### `getPointHistory(): Promise<PayPayResponse>`
ポイント履歴を取得します。

### 送金・受け取り

#### `createLink(amount: number, passcode?: string, pochibukuro?: boolean, theme?: string): Promise<CreateLink>`
送金リンクを作成します。

```typescript
const link = await paypay.createLink(1000, "1234");
console.log("リンクURL:", link.link);
console.log("チャットルームID:", link.chat_room_id);
```

#### `linkCheck(url: string, webApi?: boolean): Promise<LinkInfo>`
リンク情報を確認します。

#### `linkReceive(url: string, passcode?: string, linkInfo?: LinkInfo): Promise<PayPayResponse>`
リンクから送金を受け取ります。

#### `linkReject(url: string, linkInfo?: LinkInfo): Promise<PayPayResponse>`
リンクを辞退します。

#### `linkCancel(url: string, linkInfo?: LinkInfo): Promise<PayPayResponse>`
リンクをキャンセルします。

#### `sendMoney(amount: number, receiverId: string, pochibukuro?: boolean, theme?: string): Promise<SendMoney>`
直接送金します。

### チャット機能

#### `getChatRooms(size?: number, lastMessage?: boolean): Promise<PayPayResponse>`
チャットルーム一覧を取得します。

#### `getChatRoomMessages(chatRoomId: string, prev?: number, next?: number, include?: boolean): Promise<PayPayResponse>`
チャットメッセージを取得します。

#### `sendMessage(chatRoomId: string, message: string): Promise<PayPayResponse>`
メッセージを送信します。

### ユーザー管理

#### `getProfile(): Promise<Profile>`
プロフィール情報を取得します。

#### `searchP2PUser(userId: string, size?: number, isGlobal?: boolean, order?: number): Promise<P2PUser>`
ユーザーを検索します。

#### `initializeChatroom(externalId: string): Promise<InitializeChatRoom>`
チャットルームを初期化します。

### その他

#### `createP2PCode(amount?: number): Promise<P2PCode>`
P2Pコード（QRコード）を作成します。

#### `setMoneyPriority(paypayMoney?: boolean): Promise<PayPayResponse>`
残高の優先度を設定します。

#### `alive(): Promise<void>`
セッションを維持します（Bot検知回避用）。

## 設定オプション

### プロキシ設定

```typescript
// 文字列で指定
const paypay = new PayPay("080-1234-5678", "password", undefined, undefined, undefined, "http://proxy.example.com:8080");

// オブジェクトで指定
const paypay2 = new PayPay("080-1234-5678", "password", undefined, undefined, undefined, {
  http: "http://proxy.example.com:8080",
  https: "https://proxy.example.com:8080"
});
```

## 実用的な使用例

### 自動送金ボット

```typescript
import { PayPay } from 'paypay-ts';

class PayPayBot {
  private paypay: PayPay;

  constructor(accessToken: string) {
    this.paypay = new PayPay(undefined, undefined, undefined, undefined, accessToken);
  }

  async sendPayment(amount: number, receiverId: string, message?: string) {
    try {
      // 送金実行
      const result = await this.paypay.sendMoney(amount, receiverId);
      
      // メッセージ送信（オプション）
      if (message) {
        await this.paypay.sendMessage(result.chat_room_id, message);
      }
      
      return result;
    } catch (error) {
      console.error("送金エラー:", error);
      throw error;
    }
  }

  async checkBalance() {
    const balance = await this.paypay.getBalance();
    return {
      total: balance.all_balance,
      available: balance.useable_balance
    };
  }
}
```

### リンク監視システム

```typescript
class LinkMonitor {
  private paypay: PayPay;

  constructor(accessToken: string) {
    this.paypay = new PayPay(undefined, undefined, undefined, undefined, accessToken);
  }

  async monitorLink(url: string, autoAccept: boolean = false, passcode?: string) {
    try {
      const linkInfo = await this.paypay.linkCheck(url);
      
      console.log(`送信者: ${linkInfo.sender_name}`);
      console.log(`金額: ${linkInfo.amount}円`);
      console.log(`ステータス: ${linkInfo.status}`);
      
      if (autoAccept && linkInfo.status === "PENDING") {
        await this.paypay.linkReceive(url, passcode, linkInfo);
        console.log("自動受け取り完了");
      }
      
      return linkInfo;
    } catch (error) {
      console.error("リンク監視エラー:", error);
      throw error;
    }
  }
}
```

## エラーハンドリング

```typescript
import { PayPay, PayPayError, PayPayLoginError, PayPayNetworkError } from 'paypay-ts';

try {
  const paypay = new PayPay("080-1234-5678", "password");
  await paypay.login("TK4602");
} catch (error) {
  if (error instanceof PayPayLoginError) {
    console.error("ログインエラー:", error.message);
    // ログイン関連のエラー処理
  } else if (error instanceof PayPayNetworkError) {
    console.error("ネットワークエラー:", error.message);
    // ネットワーク関連のエラー処理
  } else if (error instanceof PayPayError) {
    console.error("PayPayエラー:", error.message);
    // 一般的なPayPayエラー処理
  } else {
    console.error("予期しないエラー:", error);
  }
}
```

## 型定義

このライブラリは完全なTypeScript型定義を提供しています：

- `GetBalance` - 残高情報
- `LinkInfo` - リンク情報
- `CreateLink` - リンク作成結果
- `SendMoney` - 送金結果
- `Profile` - プロフィール情報
- `P2PUser` - ユーザー情報
- `PayPayResponse` - APIレスポンス

## ライセンス

MIT License