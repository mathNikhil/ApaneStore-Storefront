import { createContext, useContext } from 'react';

// Exposes the device-frame DOM node (the simulated phone/tablet/desktop box)
// so that modals anywhere in the preview tree can portal into it instead of
// the real browser viewport. This keeps every popup visually contained
// within the device, matching what a real customer will see once the store
// is live as its own standalone app (where "device" = the actual browser).
export const DeviceFrameContext = createContext(null);

export const useDeviceFrame = () => useContext(DeviceFrameContext);
