#pragma once
#include <ESPAsyncWebServer.h>
#include <Arduino.h>

void registerLoginRoutes(AsyncWebServer &server, String &rootPassword);
