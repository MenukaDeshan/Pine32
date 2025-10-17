#include "apcontrol.h"
#include <WiFi.h>
#include <AsyncJson.h>
#include <ArduinoJson.h>

void registerAPControlRoutes(AsyncWebServer &server, String &ssid, String &pass, String &security, int &channel) {
  server.on("/ap/status", HTTP_GET, [&ssid, &security, &channel](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(256);
    doc["ssid"] = ssid;
    doc["security"] = security;
    doc["channel"] = channel;
    String json;
    serializeJson(doc, json);
    request->send(200, "application/json", json);
  });

  AsyncCallbackJsonWebHandler *updateHandler = new AsyncCallbackJsonWebHandler("/ap/update",
    [&ssid, &pass, &security, &channel](AsyncWebServerRequest *request, JsonVariant &json) {
      JsonObject obj = json.as<JsonObject>();
      if (obj.containsKey("ssid")) ssid = obj["ssid"].as<String>();
      if (obj.containsKey("password")) pass = obj["password"].as<String>();
      if (obj.containsKey("security")) security = obj["security"].as<String>();
      if (obj.containsKey("channel")) channel = obj["channel"].as<int>();

      WiFi.softAPdisconnect(true);
      delay(200);
      if (security == "open") WiFi.softAP(ssid.c_str(), nullptr, channel);
      else WiFi.softAP(ssid.c_str(), pass.c_str(), channel);

      Serial.printf("🔧 AP updated: %s (%s)\n", ssid.c_str(), security.c_str());
      request->send(200, "application/json", "{\"msg\":\"Device AP updated\"}");
    });
  server.addHandler(updateHandler);

  server.on("/ap/stop", HTTP_POST, [](AsyncWebServerRequest *request) {
    WiFi.softAPdisconnect(true);
    request->send(200, "application/json", "{\"msg\":\"Device AP stopped\"}");
    Serial.println("🛑 Device AP stopped");
  });
}
