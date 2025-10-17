#include "auth.h"

void registerLoginRoutes(AsyncWebServer &server, String &rootPassword) {
  server.on("/login", HTTP_POST, [&rootPassword](AsyncWebServerRequest *request) {
    if (request->hasParam("password", true)) {
      String pw = request->getParam("password", true)->value();
      if (pw == rootPassword)
        request->send(200, "text/plain", "OK");
      else
        request->send(401, "text/plain", "Invalid password");
    } else {
      request->send(400, "text/plain", "Missing password");
    }
  });

  server.on("/logout", HTTP_POST, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "OK");
  });
}
