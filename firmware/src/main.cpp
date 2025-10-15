#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include <LittleFS.h>       // Make sure to include built-in LittleFS
#include <ArduinoJson.h>

AsyncWebServer server(80);
String rootPassword = "pine32"; // default

void setup() {
  Serial.begin(115200);

  // Start AP
  WiFi.softAP("Pine32", "disconnected");

  // Mount filesystem
  if (!LittleFS.begin(true)) {  // 'true' formats if mount fails
    Serial.println("LittleFS Mount Failed");
    return;
  }

  // Load password from config.json
  File configFile = LittleFS.open("/www/config.json", "r");
  if (configFile) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, configFile);
    if (!err && doc.containsKey("root_password")) {
      rootPassword = doc["root_password"].as<String>();
    }
    configFile.close();
  } else {
    Serial.println("Config file not found");
  }

  // Serve static files
  server.serveStatic("/", LittleFS, "/www/").setDefaultFile("login.html");

  // Login handler
  server.on("/login", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("password", true)) {
      String pw = request->getParam("password", true)->value();
      if (pw == rootPassword) {
        request->send(200, "text/plain", "OK");  // login success
      } else {
        request->send(401, "text/plain", "Invalid password");
      }
    } else {
      request->send(400, "text/plain", "Missing password");
    }
  });

  // Logout handler
  server.on("/logout", HTTP_POST, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "OK");
  });

  server.begin();
  Serial.println("✅ PicoPine Server Started: http://192.168.4.1");
}

void loop() {
  // nothing here for AsyncWebServer
}
