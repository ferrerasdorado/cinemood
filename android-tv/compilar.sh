#!/bin/zsh
# Compila la APK de CineMood para Android TV sin Gradle: aapt2 → javac → d8 → zip → zipalign → apksigner
set -e
cd "$(dirname "$0")"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"
SDK=/opt/homebrew/share/android-commandlinetools
BT=$SDK/build-tools/34.0.0
JAR=$SDK/platforms/android-34/android.jar
rm -rf build && mkdir -p build/res build/gen build/clases build/dex
# clave de firma (se crea una vez y se reutiliza: sin ella no se puede actualizar la app instalada)
mkdir -p firma
if [ ! -f firma/cinemood.keystore ]; then
  openssl rand -hex 16 > firma/clave.txt
  keytool -genkeypair -keystore firma/cinemood.keystore -alias cinemood -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat firma/clave.txt)" -keypass "$(cat firma/clave.txt)" -dname "CN=CineMood, O=Personal, C=ES" >/dev/null 2>&1
fi
$BT/aapt2 compile --dir res -o build/res/res.zip
$BT/aapt2 link -o build/sin-dex.apk -I $JAR --manifest AndroidManifest.xml --java build/gen build/res/res.zip --auto-add-overlay
javac -source 8 -target 8 -bootclasspath $JAR -classpath $JAR -d build/clases $(find src build/gen -name '*.java') 2>&1 | grep -v "warning: \[options\]" || true
$BT/d8 --min-api 24 --lib $JAR --output build/dex $(find build/clases -name '*.class')
cp build/sin-dex.apk build/sin-firma.apk
(cd build/dex && zip -q -j ../sin-firma.apk classes.dex)
$BT/zipalign -f -p 4 build/sin-firma.apk build/alineada.apk
$BT/apksigner sign --ks firma/cinemood.keystore --ks-key-alias cinemood --ks-pass pass:"$(cat firma/clave.txt)" --key-pass pass:"$(cat firma/clave.txt)" --out CineMood-TV.apk build/alineada.apk
$BT/apksigner verify CineMood-TV.apk && echo "✓ CineMood-TV.apk lista ($(du -h CineMood-TV.apk | cut -f1))"
