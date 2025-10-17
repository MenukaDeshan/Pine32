#include "ssidmanager.h"
#include <AsyncJson.h>
#include <ArduinoJson.h>

void registerSSIDRoutes(AsyncWebServer &server) {
  AsyncCallbackJsonWebHandler *ssidCreateHandler = new AsyncCallbackJsonWebHandler(
    "/ssid/create",
    [](AsyncWebServerRequest *request, JsonVariant &json) {
      JsonObject obj = json.as<JsonObject>();
      String name = obj["name"] | "TestSSID";
      int count = obj["count"] | 1;
      String security = obj["security"] | "open";
      Serial.printf("📡 Requested SSID batch: name=%s, count=%d, security=%s\n",
                    name.c_str(), count, security.c_str());
      request->send(200, "application/json", "{\"msg\":\"SSIDs created (simulation)\"}");
    });
  server.addHandler(ssidCreateHandler);
}
