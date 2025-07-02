# Vosk Integration Notes

## Current Status

The Vosk speech recognition engine integration is currently stubbed out due to native module compilation issues with Electron.

## Issue Details

When attempting to install the `vosk` npm package, we encounter compilation errors with the `ffi-napi` dependency:

```
error: no matching function for call to 'napi_add_finalizer'
```

This is a known issue with Electron and native modules that use older versions of N-API.

## Temporary Solution

The application currently:
1. Uses Web Speech API when online (fully functional)
2. Shows a fallback message when offline
3. Has all the infrastructure ready for Vosk integration

## Future Resolution

To complete the Vosk integration:

1. **Option 1**: Wait for Vosk to update their native bindings to be compatible with newer Electron versions
2. **Option 2**: Use electron-rebuild to rebuild native modules for the specific Electron version
3. **Option 3**: Consider alternative offline speech recognition solutions like:
   - Whisper.cpp with Node.js bindings
   - PocketSphinx
   - DeepSpeech

## Implementation Status

✅ Completed:
- HybridTranscriptionService with mode switching
- VoskModelManager for model download and management
- Complete infrastructure for offline transcription

❌ Pending:
- Actual Vosk native module integration
- Model download implementation
- Audio processing pipeline for Vosk

## Testing Offline Mode

To test the offline fallback:
1. Enable Privacy Mode in the UI
2. The app will attempt to use Vosk
3. You'll see a fallback message indicating offline transcription is not available

The application remains fully functional with online transcription via Web Speech API.