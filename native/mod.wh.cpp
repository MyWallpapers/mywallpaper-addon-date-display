// @include MyWallpaper*.exe|mywallpaper*.exe|notepad.exe
#include <windows.h>
#include <stdio.h>

static void ToUtf8(PCWSTR value, char* output, int outputSize) {
    if (outputSize <= 0) {
        return;
    }

    if (!value || !*value) {
        output[0] = '\0';
        return;
    }

    int written = WideCharToMultiByte(CP_UTF8, 0, value, -1, output, outputSize, nullptr, nullptr);
    if (written <= 0) {
        output[0] = '\0';
    }
}

static void WriteProbe(PCWSTR phase) {
    WCHAR base[MAX_PATH];
    DWORD baseLen = GetEnvironmentVariableW(L"LOCALAPPDATA", base, MAX_PATH);
    if (baseLen == 0 || baseLen >= MAX_PATH) {
        baseLen = GetTempPathW(MAX_PATH, base);
        if (baseLen == 0 || baseLen >= MAX_PATH) {
            return;
        }
    }

    WCHAR appDir[MAX_PATH];
    WCHAR probeDir[MAX_PATH];
    WCHAR probePath[MAX_PATH];
    if (swprintf_s(appDir, L"%s\\MyWallpaper", base) < 0 ||
        swprintf_s(probeDir, L"%s\\native-probes", appDir) < 0 ||
        swprintf_s(probePath, L"%s\\date-display.txt", probeDir) < 0) {
        return;
    }

    CreateDirectoryW(appDir, nullptr);
    CreateDirectoryW(probeDir, nullptr);

    PCWSTR language = Wh_GetStringSetting(L"language");
    PCWSTR fontMode = Wh_GetStringSetting(L"fontMode");

    char phaseUtf8[64];
    char languageUtf8[128];
    char fontModeUtf8[128];
    ToUtf8(phase, phaseUtf8, sizeof(phaseUtf8));
    ToUtf8(language, languageUtf8, sizeof(languageUtf8));
    ToUtf8(fontMode, fontModeUtf8, sizeof(fontModeUtf8));

    char body[1024];
    int bodyLen = snprintf(
        body,
        sizeof(body),
        "addon=Date Display\nphase=%s\npid=%lu\nshowDate=%d\ndayFontSize=%d\nlanguage=%s\nfontMode=%s\n",
        phaseUtf8,
        GetCurrentProcessId(),
        Wh_GetIntSetting(L"showDate"),
        Wh_GetIntSetting(L"dayFontSize"),
        languageUtf8,
        fontModeUtf8);

    Wh_FreeStringSetting(language);
    Wh_FreeStringSetting(fontMode);

    if (bodyLen <= 0) {
        return;
    }
    if (bodyLen > static_cast<int>(sizeof(body))) {
        bodyLen = static_cast<int>(sizeof(body));
    }

    HANDLE file = CreateFileW(probePath, GENERIC_WRITE, FILE_SHARE_READ, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file == INVALID_HANDLE_VALUE) {
        return;
    }

    DWORD written = 0;
    WriteFile(file, body, static_cast<DWORD>(bodyLen), &written, nullptr);
    CloseHandle(file);
}

BOOL Wh_ModInit() {
    WriteProbe(L"init");
    return TRUE;
}

void Wh_ModSettingsChanged() {
    WriteProbe(L"settings");
}

void Wh_ModUninit() {
    WriteProbe(L"uninit");
}
