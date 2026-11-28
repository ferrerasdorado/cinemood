#!/bin/zsh
# Instala CineMood-TV.apk en la tele por ADB y la deja precompilada (va mucho más fluida desde el primer uso).
# Uso: ./instalar.sh            → la tele que ya esté conectada por ADB
#      ./instalar.sh IP:PUERTO  → conecta antes con esa tele (depuración inalámbrica activada)
set -e
cd "$(dirname "$0")"
ADB=adb; [ -x /opt/homebrew/share/android-commandlinetools/platform-tools/adb ] && ADB=/opt/homebrew/share/android-commandlinetools/platform-tools/adb
[ -n "$1" ] && $ADB connect "$1"
TELE=$($ADB devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator/ {print $1; exit}')
[ -z "$TELE" ] && { echo "No hay ninguna tele conectada por ADB." >&2; exit 1; }
APK=CineMood-TV.apk; [ -f "$APK" ] || APK=build/outputs/apk/release/CineMoodTV-release.apk
echo "Instalando en $TELE…"
$ADB -s "$TELE" install -r "$APK"
echo "Precompilando (unos segundos)…"
$ADB -s "$TELE" shell cmd package compile -m speed -f es.cinemood.tv
$ADB -s "$TELE" shell am start -n es.cinemood.tv/.MainActivity >/dev/null
echo "✓ CineMood abierta en la tele"
