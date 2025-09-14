import { PayPay } from './index';
import * as readline from 'readline';

// ユーザー入力を受け取る関数
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // 基本的なログイン（電話番号とパスワード）
    const paypay = new PayPay("080-1234-5678", "your-password");
    
    // 2FA認証のURLまたはIDを入力
    const url = await askQuestion("2FA認証のURLまたはIDを入力してください: ");
    await paypay.login(url);
    
    console.log("ログイン成功!");
    console.log("アクセストークン:", paypay.access_token);
    console.log("リフレッシュトークン:", paypay.refresh_token);
    console.log("デバイスUUID:", paypay.device_uuid);
    console.log("クライアントUUID:", paypay.client_uuid);

    // 登録済みデバイスUUIDでのログイン
    const paypay2 = new PayPay("080-1234-5678", "your-password", "registered-device-uuid");
    console.log("登録済みデバイスでのログイン成功:", paypay2.access_token);

    // アクセストークンでの直接ログイン
    const paypay3 = new PayPay(undefined, undefined, undefined, undefined, "your-access-token");
    console.log("アクセストークンでのログイン成功");

    // トークンリフレッシュ
    await paypay.tokenRefresh("your-refresh-token");
    console.log("トークンリフレッシュ完了");
    console.log("新しいアクセストークン:", paypay.access_token);
    console.log("新しいリフレッシュトークン:", paypay.refresh_token);

    // プロフィール情報取得
    const profile = await paypay.getProfile();
    console.log("ユーザー名:", profile.name);
    console.log("外部ユーザーID:", profile.external_user_id);
    console.log("アイコンURL:", profile.icon);

    // 残高情報取得
    const balance = await paypay.getBalance();
    console.log("総残高:", balance.all_balance);
    console.log("使用可能残高:", balance.useable_balance);
    console.log("マネーライト:", balance.money_light);
    console.log("マネー:", balance.money);
    console.log("ポイント:", balance.points);

    // 取引履歴取得
    const history = await paypay.getHistory(20);
    console.log("取引履歴:", history);

    // チャットルーム一覧取得
    const chatRooms = await paypay.getChatRooms(20);
    console.log("チャットルーム一覧:", chatRooms);

    // チャットメッセージ取得
    const messages = await paypay.getChatRoomMessages("chat-room-id");
    console.log("チャットメッセージ:", messages);

    // ポイント履歴取得
    const pointHistory = await paypay.getPointHistory();
    console.log("ポイント履歴:", pointHistory);

    // リンク情報確認
    const linkInfo = await paypay.linkCheck("link-id");
    console.log("リンク金額:", linkInfo.amount);
    console.log("送信者名:", linkInfo.sender_name);
    console.log("パスワード設定:", linkInfo.has_password);
    console.log("ステータス:", linkInfo.status);

    // リンク受け取り
    await paypay.linkReceive("link-id", "passcode-if-needed", linkInfo);
    console.log("リンク受け取り完了");

    // リンク辞退
    await paypay.linkReject("link-id", linkInfo);
    console.log("リンク辞退完了");

    // リンクキャンセル
    await paypay.linkCancel("link-id", linkInfo);
    console.log("リンクキャンセル完了");

    // 送金リンク作成
    const createLink = await paypay.createLink(1000, "passcode");
    console.log("送金リンク作成完了");
    console.log("リンクURL:", createLink.link);
    console.log("チャットルームID:", createLink.chat_room_id);

    // P2Pコード作成
    const p2pCode = await paypay.createP2PCode(500);
    console.log("P2Pコード作成完了");
    console.log("P2PコードURL:", p2pCode.p2pcode);

    // 直接送金
    const sendResult = await paypay.sendMoney(1000, "receiver-external-id");
    console.log("送金完了");
    console.log("チャットルームID:", sendResult.chat_room_id);

    // メッセージ送信
    await paypay.sendMessage("chat-room-id", "ありがとうございます!");
    console.log("メッセージ送信完了");

    // 残高優先度設定
    await paypay.setMoneyPriority(false); // マネーライト優先
    console.log("残高優先度設定完了");

    // ユーザー検索（グローバル）
    const searchResult = await paypay.searchP2PUser("user-id");
    console.log("ユーザー検索結果:");
    console.log("名前:", searchResult.name);
    console.log("アイコン:", searchResult.icon);
    console.log("外部ID:", searchResult.external_id);

    // ユーザー検索（フレンド）
    const friendSearch = await paypay.searchP2PUser("display-name", 10, false, 0);
    console.log("フレンド検索結果:");
    console.log("名前:", friendSearch.name);
    console.log("外部ID:", friendSearch.external_id);

    // チャットルーム初期化
    const chatroom = await paypay.initializeChatroom("external-id");
    console.log("チャットルーム初期化完了");
    console.log("チャットルームID:", chatroom.chatroom_id);

    // セッション維持（Bot検知回避）
    await paypay.alive();
    console.log("セッション維持完了");

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// メイン関数を実行
if (require.main === module) {
  main();
}