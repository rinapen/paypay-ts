export interface DeviceHeaders {
  device_orientation: string;
  device_orientation_2: string;
  device_rotation: string;
  device_rotation_2: string;
  device_acceleration: string;
  device_acceleration_2: string;
}

export interface GetBalance {
  money: number | null;
  money_light: number;
  all_balance: number;
  useable_balance: number;
  points: number;
  raw: any;
}

export interface LinkInfo {
  sender_name: string;
  sender_external_id: string;
  sender_icon: string;
  order_id: string;
  chat_room_id: string;
  amount: number;
  status: string;
  money_light: number;
  money: number;
  has_password: boolean;
  raw: any;
}

export interface CreateLink {
  link: string;
  chat_room_id: string;
  order_id: string;
  raw: any;
}

export interface SendMoney {
  chat_room_id: string;
  order_id: string;
  raw: any;
}

export interface P2PCode {
  p2pcode: string;
  raw: any;
}

export interface Profile {
  name: string;
  external_user_id: string;
  icon: string;
  raw: any;
}

export interface P2PUser {
  name: string;
  icon: string;
  external_id: string;
  raw: any;
}

export interface InitializeChatRoom {
  chatroom_id: string;
  raw: any;
}

export interface PayPayResponse {
  header: {
    resultCode: string;
    resultMessage?: string;
  };
  payload?: any;
  error?: any;
}

export interface ProxyConfig {
  https?: string;
  http?: string;
}

export type ProxyType = string | ProxyConfig | null;
