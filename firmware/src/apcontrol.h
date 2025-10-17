#pragma once
#include <ESPAsyncWebServer.h>

void registerAPControlRoutes(AsyncWebServer &server, String &ssid, String &pass, String &security, int &channel);
