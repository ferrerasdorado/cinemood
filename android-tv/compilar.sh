#!/bin/zsh
# Compila y firma CineMood-TV.apk (app nativa para Android TV) reutilizando tu clave de firma actual.
set -e
cd "$(dirname "$0")"

if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [ -z "$ANDROID_HOME" ] && [ -d "/opt/homebrew/share/android-commandlinetools" ]; then
  export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
fi
export ANDROID_SDK_ROOT="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"

# Clave de firma (se crea una vez y se reutiliza siempre para actualizar sin desinstalar)
mkdir -p firma
if [ ! -f firma/cinemood.keystore ]; then
  openssl rand -hex 16 > firma/clave.txt
  keytool -genkeypair -keystore firma/cinemood.keystore -alias cinemood -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat firma/clave.txt)" -keypass "$(cat firma/clave.txt)" -dname "CN=CineMood, O=Personal, C=ES" >/dev/null 2>&1
fi

# Asegura Gradle 8.6 local si no está instalado globalmente
GRADLE_VERSION="8.6"
GRADLE_DIR="$HOME/.cache/cinemood-gradle/gradle-$GRADLE_VERSION"
if command -v gradle >/dev/null 2>&1; then
  GRADLE_BIN="gradle"
else
  if [ ! -x "$GRADLE_DIR/bin/gradle" ]; then
    echo "Descargando Gradle $GRADLE_VERSION (solo la primera vez)…"
    mkdir -p "$HOME/.cache/cinemood-gradle"
    curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -o "$HOME/.cache/cinemood-gradle/gradle.zip"
    unzip -q -o "$HOME/.cache/cinemood-gradle/gradle.zip" -d "$HOME/.cache/cinemood-gradle"
    rm -f "$HOME/.cache/cinemood-gradle/gradle.zip"
  fi
  GRADLE_BIN="$GRADLE_DIR/bin/gradle"
fi

"$GRADLE_BIN" --no-daemon assembleRelease

APK_GENERADA=$(find build/outputs/apk/release -name "*.apk" | head -n 1)
if [ -z "$APK_GENERADA" ]; then
  echo "Error: no se encontró el APK generado." >&2
  exit 1
fi
cp "$APK_GENERADA" CineMood-TV.apk

BT="$ANDROID_SDK_ROOT/build-tools/34.0.0"
if [ -x "$BT/apksigner" ]; then
  "$BT/apksigner" verify CineMood-TV.apk
fi
echo "✓ CineMood-TV.apk lista (app nativa: Kotlin + Compose para TV + Media3). Para instalarla en la tele: ./instalar.sh. Tamaño: ($(du -h CineMood-TV.apk | cut -f1))"
