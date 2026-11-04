#!/bin/sh
# Run this ONCE on your own computer (needs Java). It makes the Play "upload key". Keep the .jks file and both passwords somewhere safe
# (a password manager + an offline copy): if the upload key is lost you must ask Google Play support to reset it.
# Then add four GitHub secrets (repo Settings > Secrets and variables > Actions):
#   ANDROID_KEYSTORE_BASE64   = the output of:  base64 -w0 neon-defense-upload.jks    (on macOS: base64 -i neon-defense-upload.jks)
#   ANDROID_KEYSTORE_PASSWORD = the store password you choose below
#   ANDROID_KEY_ALIAS         = upload
#   ANDROID_KEY_PASSWORD      = the key password you choose below
keytool -genkeypair -v -storetype PKCS12 -keystore neon-defense-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Squatch Squad Studios, O=Squatch Squad Studios, C=US"
