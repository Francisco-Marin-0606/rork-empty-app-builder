const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withScreenRecordingDetector = (config) => {
  // 1) Generate native files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosProjectRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName || 'Mental';
      const projectPath = path.join(iosProjectRoot, projectName);

      // Crear ScreenRecordingDetector.swift
      const swiftContent = `import Foundation
import React
import UIKit

@objc(ScreenRecordingDetector)
class ScreenRecordingDetector: RCTEventEmitter {
  
  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(captureDidChange),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
  
  @objc func captureDidChange() {
    sendEvent(withName: "ScreenCaptureChanged", body: ["isCaptured": UIScreen.main.isCaptured])
  }
  
  @objc func isCaptured(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIScreen.main.isCaptured)
  }
  
  override func supportedEvents() -> [String]! {
    return ["ScreenCaptureChanged"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}`;

      // Crear ScreenRecordingDetector.m
      const objcContent = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ScreenRecordingDetector, RCTEventEmitter)

RCT_EXTERN_METHOD(isCaptured:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end`;

      // Escribir archivos en la carpeta del proyecto
      const swiftPath = path.join(projectPath, 'ScreenRecordingDetector.swift');
      const objcPath = path.join(projectPath, 'ScreenRecordingDetector.m');

      console.log('Creating ScreenRecordingDetector files at:', projectPath);

      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }

      fs.writeFileSync(swiftPath, swiftContent);
      fs.writeFileSync(objcPath, objcContent);

      console.log('ScreenRecordingDetector files created successfully');

      return config;
    },
  ]);

  // 2) Ensure the files are added to the Xcode project build sources
  config = withXcodeProject(config, (config) => {
    const project = config.modResults; // xcode project instance
    const projectName = config.modRequest.projectName || 'Mental';

    // Paths relative to ios/
    const swiftFile = `${projectName}/ScreenRecordingDetector.swift`;
    const mFile = `${projectName}/ScreenRecordingDetector.m`;

    try {
      const targetUuid = project.getFirstTarget().uuid;
      const groupKey = project.findPBXGroupKey({ name: projectName }) || project.getFirstProject().firstProject; // fallback
      project.addSourceFile(swiftFile, { target: targetUuid }, groupKey);
      console.log('[withScreenRecordingDetector] Added Swift file to Sources:', swiftFile, 'group:', groupKey);
    } catch (e) {
      console.warn('Failed to add Swift file to Xcode project:', e);
    }

    try {
      const targetUuid = project.getFirstTarget().uuid;
      const groupKey = project.findPBXGroupKey({ name: projectName }) || project.getFirstProject().firstProject;
      project.addSourceFile(mFile, { target: targetUuid }, groupKey);
      console.log('[withScreenRecordingDetector] Added ObjC file to Sources:', mFile, 'group:', groupKey);
    } catch (e) {
      console.warn('Failed to add ObjC file to Xcode project:', e);
    }

    return config;
  });

  return config;
};

module.exports = withScreenRecordingDetector;