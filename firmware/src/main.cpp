#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include "webserver.h"
#include "scan.h"
#include "auth.h"
#include "apcontrol.h"
#include "ssidmanager.h"

AsyncWebServer server(80);

String rootPassword = "pine32";
String currentSSID = "Pine32";
String currentPass = "disconnected";
String currentSecurity = "wpa2";
int currentChannel = 1;

void startAccessPoint() {
  if (currentSecurity == "open") {
    WiFi.softAP(currentSSID.c_str(), nullptr, currentChannel);
  } else {
    WiFi.softAP(currentSSID.c_str(), currentPass.c_str(), currentChannel);
  }
  Serial.printf("📡 AP started: SSID=%s, PASS=%s, CH=%d\n",
                currentSSID.c_str(), currentPass.c_str(), currentChannel);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 Starting Pine32 Firmware");

  startAccessPoint();

  if (!LittleFS.begin(true)) {
    Serial.println("❌ LittleFS mount failed!");
    return;
  }

  // ✅ REGISTER API ROUTES FIRST - This is the fix!
  registerLoginRoutes(server, rootPassword);
  registerScanRoutes(server);
  registerAPControlRoutes(server, currentSSID, currentPass, currentSecurity, currentChannel);
  registerSSIDRoutes(server);

  // ✅ Serve web interface AFTER API routes
  server.serveStatic("/", LittleFS, "/www/").setDefaultFile("login.html");

  // Optional: Add a catch-all handler for SPA routing
  server.onNotFound([](AsyncWebServerRequest *request) {
    // If it's an API call that doesn't exist
    if (request->url().startsWith("/api/") || 
        request->url().startsWith("/scan") ||
        request->url().startsWith("/ap/") ||
        request->url().startsWith("/ssid/")) {
      request->send(404, "application/json", "{\"error\":\"Endpoint not found\"}");
    } else {
      // For all other routes, serve the main page (SPA support)
      request->send(LittleFS, "/www/login.html", "text/html");
    }
  });

  server.begin();
  Serial.println("✅ Pine32 Web Server started at http://192.168.4.1");
  Serial.println("✅ API routes registered:");
  Serial.println("   - /scan");
  Serial.println("   - /scan/results");
  Serial.println("   - /ap/*");
  Serial.println("   - /ssid/*");
}

void loop() {
  // AsyncWebServer is event-driven, no loop code needed
}