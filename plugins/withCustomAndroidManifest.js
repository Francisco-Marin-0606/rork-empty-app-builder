const { withAndroidManifest, withDangerousMod, withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withCustomAndroid(config) {
  // 1) AndroidManifest adjustments
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;

    // Ensure xmlns:tools on <manifest>
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application[0];

    // Ensure tools:replace includes the keys we manage
    application['$']['tools:replace'] = 'android:dataExtractionRules, android:fullBackupContent, android:appComponentFactory';

    // Set attributes within <application>
    application['$']['android:dataExtractionRules'] = '@xml/secure_store_data_extraction_rules';
    application['$']['android:fullBackupContent'] = '@xml/secure_store_backup_rules';
    application['$']['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return config;
  });

  // 2) Ensure required XML files exist in res/xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');

      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      const dataExtractionRulesPath = path.join(xmlDir, 'secure_store_data_extraction_rules.xml');
      if (!fs.existsSync(dataExtractionRulesPath)) {
        const content = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="sharedpref" path="RCTAsyncLocalStorage_V1" />
    <exclude domain="sharedpref" path="VisionCamera" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="sharedpref" path="RCTAsyncLocalStorage_V1" />
    <exclude domain="sharedpref" path="VisionCamera" />
  </device-transfer>
</data-extraction-rules>`;
        fs.writeFileSync(dataExtractionRulesPath, content);
      }

      const backupRulesPath = path.join(xmlDir, 'secure_store_backup_rules.xml');
      if (!fs.existsSync(backupRulesPath)) {
        const content = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="sharedpref" path="RCTAsyncLocalStorage_V1" />
  <exclude domain="sharedpref" path="VisionCamera" />
</full-backup-content>`;
        fs.writeFileSync(backupRulesPath, content);
      }

      return config;
    },
  ]);

  // 3) Force AndroidX + Jetifier and Gradle memory/workers to avoid OOM in CI/local
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const setProp = (name, value) => {
      const found = props.find((p) => p.name === name);
      if (found) found.value = value; else props.push({ type: 'property', name, value });
    };
    setProp('android.useAndroidX', 'true');
    setProp('android.enableJetifier', 'true');
    if (!props.find((p) => p.name === 'org.gradle.jvmargs')) {
      setProp('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    }
    if (!props.find((p) => p.name === 'org.gradle.workers.max')) {
      setProp('org.gradle.workers.max', '2');
    }
    return config;
  });

  // 4) Patch app/build.gradle to prevent duplicate classes/resources from legacy support libs
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Add packaging options to avoid META-INF duplicate resource from localbroadcastmanager
    if (buildGradle.includes('android {') && !buildGradle.includes('androidx.localbroadcastmanager_localbroadcastmanager.version')) {
      buildGradle = buildGradle.replace(
        /android\s*{/,
        `android {\n    packaging {\n        resources {\n            excludes += ['META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version']\n        }\n    }`
      );
    }

    // Globally exclude legacy support libraries to avoid class duplication with AndroidX
    if (!/configurations\s*\.\s*all\s*{[\s\S]*?exclude\s+group:\s*'com\.android\.support'/.test(buildGradle)) {
      buildGradle += `\n\nconfigurations.all {\n    exclude group: 'com.android.support'\n}\n`;
    }

    // Ensure androidx localbroadcastmanager present explicitly (some SDKs pull support variant)
    if (buildGradle.match(/dependencies\s*{/) && !buildGradle.includes('androidx.localbroadcastmanager:localbroadcastmanager')) {
      buildGradle = buildGradle.replace(
        /dependencies\s*{/,
        `dependencies {\n    implementation("androidx.localbroadcastmanager:localbroadcastmanager:1.1.0")`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  return config;
};