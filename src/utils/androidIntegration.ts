import firebaseAppletConfig from '../../firebase-applet-config.json';
import type {
  GitHubSettings,
  ProxySettings,
  ShayariLokConfig,
} from '../types/config';
import { normalizeProxyUrl } from './proxyEngine';

export interface AndroidEndpointItem {
  id: string;
  label: string;
  badge: string;
  url: string;
  ready: boolean;
  description: string;
  format: 'flat_config_json' | 'firestore_rest_document';
}

export interface AndroidSchemaFieldDoc {
  key: string;
  type: string;
  controlPurpose: string;
}

export const ANDROID_SCHEMA_FIELDS: ReadonlyArray<AndroidSchemaFieldDoc> = [
  {
    key: 'app_name',
    type: 'String',
    controlPurpose: 'Toolbar / splash brand title shown inside user app.',
  },
  {
    key: 'latest_version_code',
    type: 'Int',
    controlPurpose:
      'Compare against BuildConfig.VERSION_CODE; if higher, trigger Force Update dialog.',
  },
  {
    key: 'force_update_url',
    type: 'String (URL)',
    controlPurpose: 'Play Store or APK link opened by the Update Now button.',
  },
  {
    key: 'maintenance_mode',
    type: 'Boolean',
    controlPurpose:
      'When true, locks the main user screen immediately on app startup.',
  },
  {
    key: 'maintenance_message',
    type: 'String',
    controlPurpose: 'Hindi/English message displayed inside the Maintenance screen.',
  },
  {
    key: 'privacy_policy_url',
    type: 'String (URL)',
    controlPurpose:
      'Standalone privacy.html URL opened from About / Settings menu.',
  },
  {
    key: 'social_link',
    type: 'String (URL)',
    controlPurpose: 'Telegram / Instagram community join link.',
  },
  {
    key: 'ads_enabled',
    type: 'Boolean',
    controlPurpose: 'Master switch to show or hide AdMob Banner & Interstitial ads.',
  },
  {
    key: 'banner_ad_id',
    type: 'String',
    controlPurpose: 'Dynamic AdMob Banner Unit ID loaded at runtime.',
  },
  {
    key: 'interstitial_ad_id',
    type: 'String',
    controlPurpose: 'Dynamic AdMob Interstitial Unit ID loaded at runtime.',
  },
  {
    key: 'announcement_title',
    type: 'String',
    controlPurpose: 'Home screen top announcement card title.',
  },
  {
    key: 'announcement_message',
    type: 'String',
    controlPurpose: 'Home screen announcement message body.',
  },
  {
    key: 'notifications',
    type: 'Array<NotificationItem>',
    controlPurpose: 'Bell icon notification list (id, title, message, badge, time_label).',
  },
  {
    key: 'categories',
    type: 'Array<String>',
    controlPurpose: 'Filter chips in user app ("All" always stays index 0).',
  },
  {
    key: 'shayari_list',
    type: 'Array<ShayariItem>',
    controlPurpose:
      'Live Shayari feed items (id, category, text, author, image_url for gallery photo).',
  },
];

export function buildAndroidEndpoints(
  gh: GitHubSettings,
  proxy: ProxySettings,
  uid?: string | null
): AndroidEndpointItem[] {
  const owner = gh.owner.trim() || 'YOUR_GITHUB_USERNAME';
  const repo = gh.repo.trim() || 'YOUR_CONFIG_REPO';
  const branch = gh.branch.trim() || 'main';
  const filePath = gh.path.trim().replace(/^\/+/, '') || 'config.json';
  const repoReady = Boolean(gh.owner.trim() && gh.repo.trim() && filePath);

  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const encodedBranch = encodeURIComponent(branch);

  const list: AndroidEndpointItem[] = [
    {
      id: 'jsdelivr-cdn',
      label: 'Primary Recommended: jsDelivr Global CDN JSON',
      badge: 'Fast · ISP Friendly',
      url: `https://cdn.jsdelivr.net/gh/${encodedOwner}/${encodedRepo}@${encodedBranch}/${filePath}`,
      ready: repoReady,
      description:
        'Flat 15-field config.json served via global edge CDN. Best primary URL for Indian mobile networks.',
      format: 'flat_config_json',
    },
    {
      id: 'raw-github',
      label: 'Direct GitHub Raw JSON URL',
      badge: 'Zero Cache Delay',
      url: `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/${encodedBranch}/${filePath}`,
      ready: repoReady,
      description:
        'Direct raw.githubusercontent.com JSON endpoint; updates immediately after GitHub Publish.',
      format: 'flat_config_json',
    },
    {
      id: 'statically-cdn',
      label: 'Backup Failover: Statically CDN JSON',
      badge: 'Failover Mirror',
      url: `https://cdn.statically.io/gh/${encodedOwner}/${encodedRepo}/${encodedBranch}/${filePath}`,
      ready: repoReady,
      description:
        'Secondary CDN fallback URL inside your Android repository class if primary route fails.',
      format: 'flat_config_json',
    },
  ];

  const cleanWorker = normalizeProxyUrl(proxy.primaryProxyUrl);
  if (cleanWorker) {
    list.unshift({
      id: 'worker-proxy-raw',
      label: 'Cloudflare Worker Custom Proxy JSON',
      badge: 'Private Proxy',
      url: `${cleanWorker}/raw/${encodedOwner}/${encodedRepo}/${encodedBranch}/${filePath}`,
      ready: repoReady,
      description:
        'Uses your private Cloudflare Worker proxy to bypass ISP throttling with CORS + clean JSON headers.',
      format: 'flat_config_json',
    });
  }

  const effectiveUid = uid?.trim() || 'YOUR_ADMIN_UID';
  list.push({
    id: 'firestore-rest',
    label: 'Instant Cloud Real-Time JSON (Firestore Public REST API)',
    badge: uid ? 'Live Cloud Sync' : 'Sign In for UID',
    url: `https://firestore.googleapis.com/v1/projects/${firebaseAppletConfig.projectId}/databases/${firebaseAppletConfig.firestoreDatabaseId}/documents/publicSites/${effectiveUid}`,
    ready: Boolean(uid),
    description:
      'Updates in real time from Firestore whenever you edit or click Publish Live Sync (no GitHub PAT needed; uses Firestore Document REST schema).',
    format: 'firestore_rest_document',
  });

  return list;
}

export function pickPrimaryAndroidEndpoint(
  endpoints: ReadonlyArray<AndroidEndpointItem>
): string {
  const preferred =
    endpoints.find((e) => e.id === 'worker-proxy-raw') ??
    endpoints.find((e) => e.id === 'jsdelivr-cdn') ??
    endpoints[0];
  return (
    preferred?.url ??
    'https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_CONFIG_REPO/main/config.json'
  );
}

export function pickFallbackAndroidEndpoint(
  endpoints: ReadonlyArray<AndroidEndpointItem>
): string {
  const fallback =
    endpoints.find((e) => e.id === 'raw-github') ??
    endpoints.find((e) => e.id === 'statically-cdn') ??
    endpoints[0];
  return (
    fallback?.url ??
    'https://cdn.statically.io/gh/YOUR_GITHUB_USERNAME/YOUR_CONFIG_REPO/main/config.json'
  );
}

export function generateKotlinModelsAndRepo(
  primaryUrl: string,
  fallbackUrl: string
): string {
  return `// 1. ShayariConfig.kt — Exact 15-field schema matching Shayari Lok Admin config.json
package com.cyberking.shayarilok.data.model

import com.google.gson.annotations.SerializedName

data class ShayariConfig(
    @SerializedName("app_name") val appName: String = "Shayari Lok",
    @SerializedName("latest_version_code") val latestVersionCode: Int = 1,
    @SerializedName("force_update_url") val forceUpdateUrl: String = "",
    @SerializedName("maintenance_mode") val maintenanceMode: Boolean = false,
    @SerializedName("maintenance_message") val maintenanceMessage: String = "",
    @SerializedName("privacy_policy_url") val privacyPolicyUrl: String = "",
    @SerializedName("social_link") val socialLink: String = "",
    @SerializedName("ads_enabled") val adsEnabled: Boolean = true,
    @SerializedName("banner_ad_id") val bannerAdId: String = "",
    @SerializedName("interstitial_ad_id") val interstitialAdId: String = "",
    @SerializedName("announcement_title") val announcementTitle: String = "",
    @SerializedName("announcement_message") val announcementMessage: String = "",
    @SerializedName("notifications") val notifications: List<NotificationItem> = emptyList(),
    @SerializedName("categories") val categories: List<String> = listOf("All"),
    @SerializedName("shayari_list") val shayariList: List<ShayariItem> = emptyList()
)

data class NotificationItem(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("title") val title: String = "",
    @SerializedName("message") val message: String = "",
    @SerializedName("badge") val badge: String = "App Info",
    @SerializedName("time_label") val timeLabel: String = "Today"
)

data class ShayariItem(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("category") val category: String = "Love",
    @SerializedName("text") val text: String = "",
    @SerializedName("author") val author: String = "",
    @SerializedName("image_url") val imageUrl: String = ""
)

// 2. ConfigRepository.kt — Multi-CDN Failover Fetcher (OkHttp + Gson + Coroutines)
package com.cyberking.shayarilok.data.remote

import com.cyberking.shayarilok.data.model.ShayariConfig
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

object ConfigRepository {
    private const val PRIMARY_URL = "${primaryUrl}"
    private const val FALLBACK_URL = "${fallbackUrl}"

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    suspend fun fetchLiveConfig(): Result<ShayariConfig> = withContext(Dispatchers.IO) {
        val urls = listOf(PRIMARY_URL, FALLBACK_URL).distinct()
        var lastError: Exception? = null

        for (url in urls) {
            try {
                // Append timestamp query to bypass stale mobile carrier proxy caches
                val separator = if (url.contains("?")) "&" else "?"
                val freshUrl = "$url\${separator}t=\${System.currentTimeMillis()}"
                val request = Request.Builder()
                    .url(freshUrl)
                    .header("Cache-Control", "no-cache")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val body = response.body?.string()
                        if (!body.isNullOrBlank()) {
                            val parsed = gson.fromJson(body, ShayariConfig::class.java)
                            return@withContext Result.success(parsed)
                        }
                    }
                    lastError = IllegalStateException("HTTP \${response.code} from $url")
                }
            } catch (e: Exception) {
                lastError = e
            }
        }
        Result.failure(lastError ?: IllegalStateException("Unable to load config.json"))
    }
}`;
}

export function generateJavaZeroDepClient(
  primaryUrl: string,
  fallbackUrl: string
): string {
  return `// ShayariConfigManager.java — Zero third-party library required (uses built-in HttpURLConnection + org.json)
package com.cyberking.shayarilok.remote;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ShayariConfigManager {
    private static final String[] ENDPOINTS = new String[]{
        "${primaryUrl}",
        "${fallbackUrl}"
    };

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());

    public interface Callback {
        void onSuccess(AppConfig config);
        void onError(String message);
    }

    public static class Shayari {
        public int id;
        public String category;
        public String text;
        public String author;
        public String imageUrl;
    }

    public static class AppNotification {
        public int id;
        public String title;
        public String message;
        public String badge;
        public String timeLabel;
    }

    public static class AppConfig {
        public String appName;
        public int latestVersionCode;
        public String forceUpdateUrl;
        public boolean maintenanceMode;
        public String maintenanceMessage;
        public String privacyPolicyUrl;
        public String socialLink;
        public boolean adsEnabled;
        public String bannerAdId;
        public String interstitialAdId;
        public String announcementTitle;
        public String announcementMessage;
        public List<String> categories = new ArrayList<>();
        public List<AppNotification> notifications = new ArrayList<>();
        public List<Shayari> shayariList = new ArrayList<>();
    }

    public static void fetch(Callback callback) {
        EXECUTOR.execute(() -> {
            Exception lastErr = null;
            for (String baseUrl : ENDPOINTS) {
                HttpURLConnection conn = null;
                try {
                    String sep = baseUrl.contains("?") ? "&" : "?";
                    URL url = new URL(baseUrl + sep + "t=" + System.currentTimeMillis());
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(12000);
                    conn.setUseCaches(false);

                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(
                            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
                        );
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();

                        AppConfig parsed = parseJson(sb.toString());
                        MAIN_HANDLER.post(() -> callback.onSuccess(parsed));
                        return;
                    }
                } catch (Exception e) {
                    lastErr = e;
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
            String errMsg = lastErr != null ? lastErr.getMessage() : "Failed to fetch config";
            MAIN_HANDLER.post(() -> callback.onError(errMsg));
        });
    }

    private static AppConfig parseJson(String raw) throws Exception {
        JSONObject obj = new JSONObject(raw);
        AppConfig cfg = new AppConfig();
        cfg.appName = obj.optString("app_name", "Shayari Lok");
        cfg.latestVersionCode = obj.optInt("latest_version_code", 1);
        cfg.forceUpdateUrl = obj.optString("force_update_url", "");
        cfg.maintenanceMode = obj.optBoolean("maintenance_mode", false);
        cfg.maintenanceMessage = obj.optString("maintenance_message", "");
        cfg.privacyPolicyUrl = obj.optString("privacy_policy_url", "");
        cfg.socialLink = obj.optString("social_link", "");
        cfg.adsEnabled = obj.optBoolean("ads_enabled", true);
        cfg.bannerAdId = obj.optString("banner_ad_id", "");
        cfg.interstitialAdId = obj.optString("interstitial_ad_id", "");
        cfg.announcementTitle = obj.optString("announcement_title", "");
        cfg.announcementMessage = obj.optString("announcement_message", "");

        JSONArray cats = obj.optJSONArray("categories");
        if (cats != null) {
            for (int i = 0; i < cats.length(); i++) cfg.categories.add(cats.optString(i));
        }
        JSONArray notifs = obj.optJSONArray("notifications");
        if (notifs != null) {
            for (int i = 0; i < notifs.length(); i++) {
                JSONObject n = notifs.getJSONObject(i);
                AppNotification item = new AppNotification();
                item.id = n.optInt("id");
                item.title = n.optString("title");
                item.message = n.optString("message");
                item.badge = n.optString("badge");
                item.timeLabel = n.optString("time_label");
                cfg.notifications.add(item);
            }
        }
        JSONArray list = obj.optJSONArray("shayari_list");
        if (list != null) {
            for (int i = 0; i < list.length(); i++) {
                JSONObject s = list.getJSONObject(i);
                Shayari item = new Shayari();
                item.id = s.optInt("id");
                item.category = s.optString("category");
                item.text = s.optString("text");
                item.author = s.optString("author");
                item.imageUrl = s.optString("image_url", "");
                cfg.shayariList.add(item);
            }
        }
        return cfg;
    }
}`;
}

export function generateRemoteControlGateCode(): string {
  return `// MainActivity.kt — Enforce Maintenance Mode, Force Update & AdMob Control on Launch
private fun applyAdminRemoteControl(config: ShayariConfig) {
    // 1. Maintenance Mode Lock (Highest Priority)
    if (config.maintenanceMode) {
        AlertDialog.Builder(this)
            .setTitle("\${config.appName} — Maintenance")
            .setMessage(config.maintenanceMessage)
            .setCancelable(false)
            .setPositiveButton("Close App") { _, _ -> finishAffinity() }
            .show()
        return
    }

    // 2. Force Update Gate (Compare with BuildConfig.VERSION_CODE)
    if (config.latestVersionCode > BuildConfig.VERSION_CODE) {
        AlertDialog.Builder(this)
            .setTitle("New Update Available (v\${config.latestVersionCode})")
            .setMessage("कृपया नए फ़ीचर्स और ताज़ा शायरियों के लिए ऐप अपडेट करें।")
            .setCancelable(false)
            .setPositiveButton("Update Now") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(config.forceUpdateUrl)))
            }
            .show()
        return
    }

    // 3. Apply Dynamic AdMob & Privacy Policy URL
    if (config.adsEnabled && config.bannerAdId.isNotBlank()) {
        loadAdMobBanner(config.bannerAdId)
    } else {
        hideBannerContainer()
    }
    savePrivacyPolicyUrl(config.privacyPolicyUrl)

    // 4. Bind Live Categories, Bell Notifications & Shayari List to RecyclerView
    bindCategories(config.categories)
    bindBellNotifications(config.notifications)
    bindShayariFeed(config.shayariList)
}`;
}

export function generateManifestAndFirestoreSnippet(
  firestoreUrl: string
): string {
  return `<!-- 1. AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- 2. build.gradle.kts (Module :app) -->
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}

// 3. Optional: Real-Time Firestore REST Endpoint (for instant admin-to-app updates before GitHub commit)
// GET ${firestoreUrl}
// Note: Firestore REST API wraps fields under "fields.<key>.stringValue / booleanValue / integerValue / arrayValue".
// For zero-boilerplate flat JSON in Android, prefer the jsDelivr CDN or GitHub Raw URL shown above.`;
}

export function summarizeConfigStats(config: ShayariLokConfig): {
  totalBytes: number;
  shayariCount: number;
  categoryCount: number;
  notificationCount: number;
} {
  const json = JSON.stringify(config);
  return {
    totalBytes: new TextEncoder().encode(json).length,
    shayariCount: config.shayari_list.length,
    categoryCount: Math.max(0, config.categories.length - 1),
    notificationCount: config.notifications.length,
  };
}
