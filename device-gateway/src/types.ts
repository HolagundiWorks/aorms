/**
 * Wire protocol — mirrors the attached development guide's §10 WebSocket
 * Protocol message envelopes exactly (device<->gateway) plus the
 * gateway's own HTTP control API (Esti API -> gateway, not in the guide
 * verbatim since the guide leaves the exact shape to the platform team —
 * kept minimal and consistent with the device-facing envelope).
 */

export type DeviceToGatewayMessage =
  | { type: "auth"; device_id: string; device_secret: string; capabilities?: Record<string, unknown>; app_version?: string }
  | { type: "heartbeat"; device_id: string; timestamp: string }
  | {
      type: "inference_response";
      request_id: string;
      status: "completed";
      result: { content: string };
    }
  | {
      type: "inference_response";
      request_id: string;
      status: "error";
      error: { code: string; message: string };
    };

export type GatewayToDeviceMessage =
  | { type: "auth_ack"; ok: true }
  | { type: "auth_ack"; ok: false; error: string }
  | {
      type: "inference_request";
      request_id: string;
      model: string;
      messages: { role: string; content: string }[];
      parameters?: { temperature?: number; max_tokens?: number };
    };

/** `POST /infer` request body — the Esti API's own call into this gateway. */
export type InferHttpRequest = {
  device_id?: string; // omit to route to any online device
  model: string;
  messages: { role: string; content: string }[];
  parameters?: { temperature?: number; max_tokens?: number };
};

export type InferHttpResponse =
  | { status: "completed"; device_id: string; content: string; latency_ms: number }
  | { status: "error"; error: string };
