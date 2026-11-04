// Build the Android APK with Gradle (after `vite build && cap sync android`), then copy it to release/.
// Needs JDK 21 and the Android SDK: set ANDROID_HOME and JAVA_HOME_21, or put
// { "sdk": "...", "jdk": "..." } in pipeline/android-build.local.json (git-ignored, per computer).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCAL = 'pipeline/android-build.local.json';
const local = existsSync(LOCAL) ? JSON.parse(readFileSync(LOCAL, 'utf8')) : {};
const sdk = process.env.ANDROID_HOME || local.sdk;
const jdk = process.env.JAVA_HOME_21 || local.jdk || process.env.JAVA_HOME;
if (!sdk || !jdk) throw new Error(`Set ANDROID_HOME and JAVA_HOME_21, or create ${LOCAL} with sdk and jdk paths`);
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
