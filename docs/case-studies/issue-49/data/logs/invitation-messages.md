## Invitation messages and other fixes

Now when I press on `reset to default` in `Invitation messages`, it is not getting saved to our .lino configuration file, so on application restart it reverts to previous version of text. We also should check all other reset/clear buttons, everything that changes configuration, should trigger auto-save on debounce, and also notification, that each setting/parameter saved, so I will have visual feedback about each change.


