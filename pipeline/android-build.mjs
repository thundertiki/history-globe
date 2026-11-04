// Build the Android APK with Gradle (after `vite build && cap sync android`), then copy it to release/.
// Needs JDK 21 and the Android SDK; paths are this PC's (see claude-config machines/desktop-T95IN58.md)
// unless JAVA_HOME_21 / ANDROID_HOME are set.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sdk = process.env.ANDROID_HOME || 'C:/Users/Benjamen/venvs/android-sdk';
const jdk = process.env.JAVA_HOME_21 || 'C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot';
writeFileSync('android/local.properties', `sdk.dir=${sdk.split('\\').join('/')}\n`); // Gradle accepts forward slashes
const gradlew = resolve('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
execFileSync(`"${gradlew}"`, ['assembleDebug', '--no-daemon', '-q'], {
  cwd: resolve('android'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk },
});
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
mkdirSync('release', { recursive: true });
const out = `release/History-Globe-${version}.apk`;
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', out);
console.log('APK:', out);
