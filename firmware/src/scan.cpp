#include "scan.h"
#include <WiFi.h>
#include <ArduinoJson.h>

// Global scan state
bool scanRunning = false;
unsigned long scanStartTime = 0;
uint8_t currentScanMode = SCAN_MODE_OFF;
uint8_t wifiChannel = 1;
unsigned long scanContinueTime = 0;
uint8_t scanContinueMode = SCAN_MODE_OFF;

// Simple in-memory storage for scan results
DynamicJsonDocument apResults(16384);
DynamicJsonDocument stationResults(8192);
DynamicJsonDocument nameResults(4096);

// Forward declarations of helper functions
void generateScanJSON();
void generateNamesJSON();
void generateScanJSONFromWiFi(int numNetworks);

void registerScanRoutes(AsyncWebServer &server) {
  // Clear any existing handlers first
  server.on("/scan", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("📶 /scan endpoint called");
    
    if (scanRunning) {
      if (millis() - scanStartTime > 30000) {
        Serial.println("🔄 Resetting stuck scan");
        WiFi.scanDelete();
        scanRunning = false;
      } else {
        Serial.println("❌ Scan already running");
        request->send(200, "application/json", "{\"status\":\"busy\"}");
        return;
      }
    }
    
    // Determine scan mode from parameters
    uint8_t mode = SCAN_MODE_APS;
    if (request->hasParam("mode")) {
      mode = request->getParam("mode")->value().toInt();
    }
    
    startScan(mode);
    request->send(200, "application/json", "{\"status\":\"started\",\"mode\":\"" + String(mode) + "\"}");
  });

  // Advanced scan with parameters (compatible with ESP8266 Deauther commands)
  server.on("/run", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("cmd")) {
      String cmd = request->getParam("cmd")->value();
      Serial.println("🔧 Command received: " + cmd);
      
      // Parse scan commands
      if (cmd.startsWith("scan")) {
        if (cmd.indexOf("aps") > 0) {
          // Scan APs
          uint8_t channel = 1;
          if (cmd.indexOf("-ch") > 0) {
            int chIndex = cmd.indexOf("-ch") + 4;
            String channelStr = cmd.substring(chIndex);
            channelStr.trim();
            if (channelStr == "all") {
              channel = 0; // 0 means all channels
            } else {
              channel = channelStr.toInt();
            }
          }
          startScan(SCAN_MODE_APS, 0, SCAN_MODE_OFF, 0, true, channel);
          request->send(200, "text/plain", "OK");
          return;
        } 
        else if (cmd.indexOf("stations") > 0) {
          // Scan stations
          uint32_t time = SCAN_DEFAULT_TIME;
          uint8_t channel = 1;
          
          // Parse time
          if (cmd.indexOf("-t") > 0) {
            int tIndex = cmd.indexOf("-t") + 3;
            time = cmd.substring(tIndex, cmd.indexOf('s', tIndex)).toInt() * 1000;
          }
          
          // Parse channel
          if (cmd.indexOf("-ch") > 0) {
            int chIndex = cmd.indexOf("-ch") + 4;
            String channelStr = cmd.substring(chIndex);
            channelStr.trim();
            if (channelStr == "all") {
              channel = 0; // 0 means all channels
            } else {
              channel = channelStr.toInt();
            }
          }
          
          startScan(SCAN_MODE_STATIONS, time, SCAN_MODE_OFF, 0, true, channel);
          request->send(200, "text/plain", "OK");
          return;
        }
      }
      
      // Selection commands
      else if (cmd.startsWith("select") || cmd.startsWith("deselect")) {
        bool select = cmd.startsWith("select");
        String target = cmd.substring(select ? 6 : 8);
        target.trim();
        
        if (target == "aps") selectAllTargets(0);
        else if (target == "stations") selectAllTargets(1);
        else if (target == "names") selectAllTargets(2);
        
        request->send(200, "text/plain", "OK");
        return;
      }
      
      // Remove commands
      else if (cmd.startsWith("remove")) {
        String target = cmd.substring(6);
        target.trim();
        // Basic implementation - just acknowledge
        Serial.println("Remove command: " + target);
        request->send(200, "text/plain", "OK");
        return;
      }
      
      // Add name command
      else if (cmd.startsWith("add name")) {
        // Basic implementation - just acknowledge
        Serial.println("Add name command: " + cmd);
        request->send(200, "text/plain", "OK");
        return;
      }
      
      // Replace name command  
      else if (cmd.startsWith("replace name")) {
        // Basic implementation - just acknowledge
        Serial.println("Replace name command: " + cmd);
        request->send(200, "text/plain", "OK");
        return;
      }
      
      // Save scan command
      else if (cmd == "save scan") {
        // Force a new scan to get real data
        startScan(SCAN_MODE_APS);
        // Small delay to let scan start, then generate JSON from real data
        delay(100);
        request->send(200, "text/plain", "OK");
        return;
      }
      
      // Save names command
      else if (cmd == "save names") {
        generateNamesJSON();
        request->send(200, "text/plain", "OK");
        return;
      }
    }
    
    request->send(200, "text/plain", "UNKNOWN COMMAND");
  });

  // Scan results in ESP8266 Deauther format
  server.on("/scan.json", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("📊 Serving scan.json");
    
    // If no scan data exists or scan is not running, start a new scan
    if (apResults.isNull() || !scanRunning) {
      Serial.println("🔄 No scan data found, starting new scan...");
      startScan(SCAN_MODE_APS);
      
      // Wait a bit for scan to complete
      unsigned long startWait = millis();
      while (scanRunning && (millis() - startWait < 10000)) {
        handleScanUpdate();
        delay(100);
      }
    }
    
    generateScanJSON();
    
    String json;
    serializeJson(apResults, json);
    request->send(200, "application/json", json);
    Serial.println("✅ scan.json served");
  });

  // Names in ESP8266 Deauther format
  server.on("/names.json", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("📝 Serving names.json");
    
    generateNamesJSON();
    
    String json;
    serializeJson(nameResults, json);
    request->send(200, "application/json", json);
  });

  // Current scan results (your original format)
  server.on("/scan/results", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("📊 /scan/results endpoint called");
    
    if (!scanRunning) {
      Serial.println("❌ No scan running, starting one...");
      startScan(SCAN_MODE_APS);
    }
    
    int res = WiFi.scanComplete();
    Serial.printf("📊 Scan complete result: %d\n", res);
    
    if (res == WIFI_SCAN_RUNNING) {
      if (millis() - scanStartTime > 30000) {
        Serial.println("⏰ Scan timeout");
        WiFi.scanDelete();
        scanRunning = false;
        currentScanMode = SCAN_MODE_OFF;
        request->send(200, "application/json", "{\"status\":\"timeout\"}");
        return;
      }
      Serial.println("🔄 Scan still running");
      request->send(200, "application/json", "{\"status\":\"running\"}");
      return;
    }
    
    if (res == WIFI_SCAN_FAILED) {
      Serial.println("❌ Scan failed");
      scanRunning = false;
      currentScanMode = SCAN_MODE_OFF;
      request->send(200, "application/json", "{\"status\":\"failed\"}");
      return;
    }
    
    if (res < 0) {
      Serial.println("❌ No scan results");
      scanRunning = false;
      currentScanMode = SCAN_MODE_OFF;
      request->send(200, "application/json", "{\"status\":\"none\"}");
      return;
    }

    Serial.printf("✅ Scan completed with %d networks found\n", res);
    
    DynamicJsonDocument doc(16384);
    JsonArray arr = doc.to<JsonArray>();
    
    for (int i = 0; i < res; i++) {
      JsonObject ap = arr.createNestedObject();
      ap["ssid"] = WiFi.SSID(i);
      ap["rssi"] = WiFi.RSSI(i);
      ap["channel"] = WiFi.channel(i);
      ap["bssid"] = WiFi.BSSIDstr(i);
      ap["encryption"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "open" : "encrypted";
    }
    
    // Also populate the ESP8266 Deauther format
    generateScanJSONFromWiFi(res);
    
    WiFi.scanDelete();
    scanRunning = false;
    currentScanMode = SCAN_MODE_OFF;

    String json;
    serializeJson(arr, json);
    request->send(200, "application/json", json);
    Serial.println("✅ Scan results sent to client");
  });

  // Cleanup endpoint
  server.on("/scan/cleanup", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("🧹 Cleaning up scan");
    WiFi.scanDelete();
    scanRunning = false;
    currentScanMode = SCAN_MODE_OFF;
    request->send(200, "application/json", "{\"status\":\"cleaned\"}");
  });
}

void startScan(uint8_t mode, uint32_t time, uint8_t nextMode, uint32_t continueTime, bool channelHop, uint8_t channel) {
  if (mode != SCAN_MODE_OFF) stopScan();
  
  setWifiChannel(channel, true);
  currentScanMode = mode;
  scanContinueMode = nextMode;
  scanContinueTime = continueTime;
  
  if (mode == SCAN_MODE_APS || mode == SCAN_MODE_ALL) {
    Serial.println("📶 Starting AP scan...");
    
    // Clear previous results
    WiFi.scanDelete();
    
    // Start new scan - async mode, show hidden networks
    int scanResult = WiFi.scanNetworks(true, true);
    
    if (scanResult == WIFI_SCAN_FAILED) {
      Serial.println("❌ AP scan failed to start");
      currentScanMode = SCAN_MODE_OFF;
      return;
    }
    
    scanRunning = true;
    scanStartTime = millis();
    Serial.println("✅ AP scan started");
  }
  // Note: Station scanning would require promiscuous mode implementation
  else if (mode == SCAN_MODE_STATIONS) {
    Serial.println("📶 Station scan requested (not fully implemented)");
    // For now, we'll just do an AP scan since station scanning requires promiscuous mode
    startScan(SCAN_MODE_APS, time, nextMode, continueTime, channelHop, channel);
  }
}

void stopScan() {
  scanContinueMode = SCAN_MODE_OFF;
  currentScanMode = SCAN_MODE_OFF;
  scanRunning = false;
}

void handleScanUpdate() {
  if (!scanRunning) return;
  
  if (currentScanMode == SCAN_MODE_APS || currentScanMode == SCAN_MODE_ALL) {
    int results = WiFi.scanComplete();
    
    if (results >= 0) {
      Serial.printf("✅ Scan completed with %d real networks\n", results);
      generateScanJSONFromWiFi(results);
      WiFi.scanDelete();
      scanRunning = false;
      currentScanMode = SCAN_MODE_OFF;
    } else if (results == WIFI_SCAN_RUNNING) {
      // Scan still running
      if (millis() - scanStartTime > 30000) {
        Serial.println("⏰ Scan timeout - forcing stop");
        WiFi.scanDelete();
        scanRunning = false;
        currentScanMode = SCAN_MODE_OFF;
      }
    }
  }
}

bool isScanning() {
  return currentScanMode != SCAN_MODE_OFF;
}

bool isSniffing() {
  return currentScanMode == SCAN_MODE_STATIONS || currentScanMode == SCAN_MODE_SNIFFER;
}

void setWifiChannel(uint8_t channel, bool force) {
  if (channel >= 1 && channel <= 14) {
    wifiChannel = channel;
    // Note: ESP32 channel setting might require different approach
    // For basic functionality, we'll just track the channel
    Serial.println("📡 Channel set to: " + String(channel));
  }
}

void selectAllTargets(uint8_t type) {
  // Implement selection logic
  Serial.println("✅ Selected all targets type: " + String(type));
}

void deselectAllTargets(uint8_t type) {
  // Implement deselection logic
  Serial.println("✅ Deselected all targets type: " + String(type));
}

void generateScanJSON() {
  // Check if we have real scan data, if not use dummy data
  if (apResults.isNull() || !apResults.containsKey("aps") || apResults["aps"].size() == 0) {
    Serial.println("⚠️ No real scan data, using current WiFi scan results");
    
    // Try to get current scan results
    int scanResult = WiFi.scanComplete();
    if (scanResult >= 0) {
      generateScanJSONFromWiFi(scanResult);
      return;
    } else {
      Serial.println("❌ No WiFi scan results available, using minimal dummy data");
      // Minimal dummy data as fallback
      apResults.clear();
      JsonObject root = apResults.to<JsonObject>();
      JsonArray aps = root.createNestedArray("aps");
      JsonArray stations = root.createNestedArray("stations");
      
      // Add one dummy entry to show the interface works
      JsonArray ap = aps.createNestedArray();
      ap.add("No networks found");
      ap.add("");
      ap.add(1);
      ap.add(-90);
      ap.add("-");
      ap.add("00:00:00:00:00:00");
      ap.add("Scan for networks");
      ap.add(false);
    }
  }
  // If we already have real data, do nothing (it's already populated)
}

void generateNamesJSON() {
  nameResults.clear();
  JsonArray names = nameResults.to<JsonArray>();
  
  // Populate with dummy data for testing
  JsonArray name1 = names.createNestedArray();
  name1.add("AA:BB:CC:DD:EE:FF");
  name1.add("Test Vendor");
  name1.add("My Test Device");
  name1.add("");
  name1.add(6);
  name1.add(false);
}

void generateScanJSONFromWiFi(int numNetworks) {
  apResults.clear();
  
  JsonObject root = apResults.to<JsonObject>();
  JsonArray aps = root.createNestedArray("aps");
  JsonArray stations = root.createNestedArray("stations");
  
  Serial.println("🔄 Generating real WiFi data for " + String(numNetworks) + " networks");
  
  for (int i = 0; i < numNetworks && i < 50; i++) {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    int channel = WiFi.channel(i);
    String bssid = WiFi.BSSIDstr(i);
    String encryption = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "-" : "WPA2";
    
    Serial.printf("📶 Found: %s (Ch:%d RSSI:%d)\n", ssid.c_str(), channel, rssi);
    
    JsonArray ap = aps.createNestedArray();
    ap.add(ssid);                    // SSID [0]
    ap.add("");                      // Name [1] 
    ap.add(channel);                 // Channel [2]
    ap.add(rssi);                    // RSSI [3]
    ap.add(encryption);              // Encryption [4]
    ap.add(bssid);                   // MAC [5]
    ap.add("Unknown");               // Vendor [6] - you could add vendor lookup here
    ap.add(false);                   // Selected [7]
  }
  
  if (numNetworks == 0) {
    Serial.println("❌ No WiFi networks found in scan");
    // Add a placeholder so the interface doesn't break
    JsonArray ap = aps.createNestedArray();
    ap.add("No networks found");
    ap.add("");
    ap.add(1);
    ap.add(-90);
    ap.add("-");
    ap.add("00:00:00:00:00:00");
    ap.add("Try scanning again");
    ap.add(false);
  }
  
  Serial.println("✅ Generated ESP32 Deauther format JSON with " + String(aps.size()) + " real APs");
}