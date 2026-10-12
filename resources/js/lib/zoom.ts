export const zoomIsEnabled = (config: ZoomConfigFields | null | undefined) =>
   Boolean(config?.zoom_enabled);
export const zoomSDKIsEnabled = (config: ZoomConfigFields | null | undefined) =>
   Boolean(config?.zoom_web_sdk && config?.zoom_sdk_client_id);
