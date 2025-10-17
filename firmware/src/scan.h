#pragma once
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// Scan modes
#define SCAN_MODE_OFF 0
#define SCAN_MODE_APS 1
#define SCAN_MODE_STATIONS 2
#define SCAN_MODE_ALL 3
#define SCAN_MODE_SNIFFER 4

// Scan configuration
#define SCAN_DEFAULT_TIME 15000
#define SCAN_DEFAULT_CONTINUE_TIME 10000

// Global scan state
extern bool scanRunning;
extern unsigned long scanStartTime;
extern uint8_t currentScanMode;
extern uint8_t wifiChannel;

// Function declarations
void registerScanRoutes(AsyncWebServer &server);
void handleScanUpdate();
void startScan(uint8_t mode, uint32_t time = SCAN_DEFAULT_TIME, uint8_t nextMode = SCAN_MODE_OFF, 
               uint32_t continueTime = SCAN_DEFAULT_CONTINUE_TIME, bool channelHop = true, uint8_t channel = 1);
void stopScan();
bool isScanning();
bool isSniffing();
void setWifiChannel(uint8_t channel, bool force = false);
void selectAllTargets(uint8_t type);
void deselectAllTargets(uint8_t type);

// JSON generation functions
void generateScanJSON();
void generateNamesJSON();
void generateScanJSONFromWiFi(int numNetworks);