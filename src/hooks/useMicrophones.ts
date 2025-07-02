import { useState, useEffect } from 'react';

export interface MicrophoneInfo {
  deviceId: string;
  label: string;
}

export function useMicrophones() {
  const [microphones, setMicrophones] = useState<MicrophoneInfo[]>([]);

  const getMicrophoneList = async () => {
    try {
      // This check is important. Without permission, labels will be blank.
      const access = await window.overloadApi.getMicrophoneAccess();
      if (access !== 'granted') {
        console.warn('Microphone permission not granted. Device labels may be unavailable.');
        // We can still try to enumerate, but labels might be empty.
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === 'audioinput'
      );
      
      setMicrophones(
        audioInputDevices.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }))
      );
    } catch (error) {
      console.error('Failed to get microphone list:', error);
    }
  };

  useEffect(() => {
    getMicrophoneList();
    
    // Listen for device changes (e.g., plugging in a USB mic)
    navigator.mediaDevices.addEventListener('devicechange', getMicrophoneList);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getMicrophoneList);
    };
  }, []);

  return { microphones };
}
