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

// 2. ConfigLocalCache.kt — Authoritative SharedPreferences + Room DAO Cache (Never Re-Injects Deleted Mocks)
package com.cyberking.shayarilok.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Transaction
import com.cyberking.shayarilok.data.model.ShayariConfig
import com.cyberking.shayarilok.data.model.ShayariItem
import com.google.gson.Gson

@Entity(tableName = "shayari_cache")
data class ShayariCacheEntity(
    @PrimaryKey val id: Int,
    val category: String,
    val text: String,
    val author: String,
    val imageUrl: String
)

@Dao
interface ShayariCacheDao {
    @Query("SELECT * FROM shayari_cache ORDER BY id DESC")
    suspend fun getAll(): List<ShayariCacheEntity>

    @Query("DELETE FROM shayari_cache")
    suspend fun deleteAll()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<ShayariCacheEntity>)

    // CRITICAL: Always wipe table first even when remote list is empty ([]).
    // Never use upsert/merge without deleteAll(), otherwise deleted mock items linger forever.
    @Transaction
    suspend fun replaceAllAuthoritatively(items: List<ShayariCacheEntity>) {
        deleteAll()
        if (items.isNotEmpty()) {
            insertAll(items)
        }
    }
}

class ConfigLocalCache(context: Context) {
    private val prefs = context.getSharedPreferences("shayarilok_authoritative_cache", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_CONFIG_JSON = "authoritative_config_json"
        private const val KEY_HAS_AUTHORITATIVE_SYNC = "has_authoritative_sync"
        private const val KEY_LEGACY_SEED_WIPED = "legacy_seed_wiped_v2"
    }

    init {
        // One-time cleanup of any legacy mock/seed keys from earlier app versions
        if (!prefs.getBoolean(KEY_LEGACY_SEED_WIPED, false)) {
            prefs.edit()
                .remove("seed_shayari_list")
                .remove("default_mock_cache")
                .remove("fallback_seed_applied")
                .putBoolean(KEY_LEGACY_SEED_WIPED, true)
                .apply()
        }
    }

    fun hasAuthoritativeSync(): Boolean = prefs.getBoolean(KEY_HAS_AUTHORITATIVE_SYNC, false)

    // Overwrite cache unconditionally (commit = true so app kills never lose deletion state).
    // Even if config.shayariList or config.notifications is emptyList(), persist it as truth.
    fun replaceConfigAuthoritatively(config: ShayariConfig) {
        prefs.edit()
            .putString(KEY_CONFIG_JSON, gson.toJson(config))
            .putBoolean(KEY_HAS_AUTHORITATIVE_SYNC, true)
            .commit()
    }

    suspend fun replaceRoomCacheAuthoritatively(dao: ShayariCacheDao, items: List<ShayariItem>) {
        val entities = items.map {
            ShayariCacheEntity(
                id = it.id,
                category = it.category,
                text = it.text,
                author = it.author,
                imageUrl = it.imageUrl
            )
        }
        dao.replaceAllAuthoritatively(entities)
    }

    fun getCachedConfigOrNull(): ShayariConfig? {
        if (!hasAuthoritativeSync()) return null
        val raw = prefs.getString(KEY_CONFIG_JSON, null) ?: return null
        return try {
            gson.fromJson(raw, ShayariConfig::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun wipeAllMockAndSeedData() {
        prefs.edit()
            .remove(KEY_CONFIG_JSON)
            .putBoolean(KEY_HAS_AUTHORITATIVE_SYNC, true)
            .putBoolean(KEY_LEGACY_SEED_WIPED, true)
            .commit()
    }
}

// 3. ConfigRepository.kt — Multi-CDN Failover Fetcher with Authoritative Cache Replacement
package com.cyberking.shayarilok.data.remote

import com.cyberking.shayarilok.data.local.ConfigLocalCache
import com.cyberking.shayarilok.data.local.ShayariCacheDao
import com.cyberking.shayarilok.data.model.ShayariConfig
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

object ConfigRepository {
    private const val PRIMARY_URL = "${primaryUrl}"
    private const val FALLBACK_URL = "${fallbackUrl}"

    private val client = OkHttpClient.Builder()
        .cache(null) // Disable OkHttp disk cache so deleted items are never replayed from HTTP cache
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    suspend fun fetchLiveConfig(
        localCache: ConfigLocalCache? = null,
        roomDao: ShayariCacheDao? = null
    ): Result<ShayariConfig> = withContext(Dispatchers.IO) {
        val urls = listOf(PRIMARY_URL, FALLBACK_URL).distinct()
        var lastError: Exception? = null

        for (url in urls) {
            try {
                // Append timestamp query to bypass stale mobile carrier proxy caches
                val separator = if (url.contains("?")) "&" else "?"
                val freshUrl = "$url\${separator}t=\${System.currentTimeMillis()}"
                val request = Request.Builder()
                    .url(freshUrl)
                    .cacheControl(CacheControl.FORCE_NETWORK)
                    .header("Cache-Control", "no-cache, no-store")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val body = response.body?.string()
                        if (!body.isNullOrBlank()) {
                            val parsed = gson.fromJson(body, ShayariConfig::class.java)
                            // Replace local SharedPreferences + Room DB atomically; never merge with old seeds
                            localCache?.replaceConfigAuthoritatively(parsed)
                            if (localCache != null && roomDao != null) {
                                localCache.replaceRoomCacheAuthoritatively(roomDao, parsed.shayariList)
                            }
                            return@withContext Result.success(parsed)
                        }
                    }
                    lastError = IllegalStateException("HTTP \${response.code} from $url")
                }
            } catch (e: Exception) {
                lastError = e
            }
        }

        // Offline fallback ONLY reads already-synced authoritative cache — never re-seeds mock items
        val cached = localCache?.getCachedConfigOrNull()
        if (cached != null) {
            return@withContext Result.success(cached)
        }
        Result.failure(lastError ?: IllegalStateException("Unable to load config.json"))
    }
}`;
}

export function generateJavaZeroDepClient(
  primaryUrl: string,
  fallbackUrl: string
): string {
  return `// ShayariConfigManager.java — Zero third-party library required (uses built-in HttpURLConnection + org.json + Authoritative Cache)
package com.cyberking.shayarilok.remote;

import android.content.Context;
import android.content.SharedPreferences;
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
    private static final String PREF_NAME = "shayarilok_authoritative_cache";
    private static final String KEY_CONFIG_JSON = "authoritative_config_json";
    private static final String KEY_HAS_AUTHORITATIVE_SYNC = "has_authoritative_sync";
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

    public static void saveAuthoritativeCache(Context context, String rawJson) {
        if (context == null || rawJson == null) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(KEY_CONFIG_JSON, rawJson)
            .putBoolean(KEY_HAS_AUTHORITATIVE_SYNC, true)
            .commit();
    }

    public static AppConfig loadAuthoritativeCache(Context context) {
        if (context == null) return null;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_HAS_AUTHORITATIVE_SYNC, false)) return null;
        String raw = prefs.getString(KEY_CONFIG_JSON, null);
        if (raw == null || raw.isEmpty()) return null;
        try {
            return parseJson(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    public static void clearCache(Context context) {
        if (context == null) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_CONFIG_JSON).putBoolean(KEY_HAS_AUTHORITATIVE_SYNC, true).commit();
    }

    public static void fetch(Callback callback) {
        fetch(null, callback);
    }

    public static void fetch(Context context, Callback callback) {
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
                    conn.setRequestProperty("Cache-Control", "no-cache, no-store");

                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(
                            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
                        );
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();

                        String rawBody = sb.toString();
                        AppConfig parsed = parseJson(rawBody);
                        if (context != null) {
                            saveAuthoritativeCache(context, rawBody);
                        }
                        MAIN_HANDLER.post(() -> callback.onSuccess(parsed));
                        return;
                    }
                } catch (Exception e) {
                    lastErr = e;
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
            AppConfig cached = loadAuthoritativeCache(context);
            if (cached != null) {
                MAIN_HANDLER.post(() -> callback.onSuccess(cached));
                return;
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
  return `// RemoteGateController.kt — Enforce Maintenance Mode, Force Update & AdMob Control on Launch
object RemoteGateController {
    fun applyAdminRemoteControl(activity: AppCompatActivity, config: ShayariConfig) {
        // 1. Maintenance Mode Lock (Highest Priority)
        if (config.maintenanceMode) {
            AlertDialog.Builder(activity)
                .setTitle("\${config.appName} — Maintenance")
                .setMessage(config.maintenanceMessage)
                .setCancelable(false)
                .setPositiveButton("Close App") { _, _ -> activity.finishAffinity() }
                .show()
            return
        }

        // 2. Force Update Gate (Compare with BuildConfig.VERSION_CODE)
        if (config.latestVersionCode > BuildConfig.VERSION_CODE) {
            AlertDialog.Builder(activity)
                .setTitle("New Update Available (v\${config.latestVersionCode})")
                .setMessage("कृपया नए फ़ीचर्स और ताज़ा शायरियों के लिए ऐप अपडेट करें।")
                .setCancelable(false)
                .setPositiveButton("Update Now") { _, _ ->
                    activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(config.forceUpdateUrl)))
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
    }
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

export function generateFirestoreRealtimeListenerCode(
  siteId?: string | null
): string {
  const effectiveSiteId = siteId?.trim() || 'YOUR_ADMIN_UID';
  return `// FirestoreRealtimeRepository.kt — Instant Real-Time Live Sync + Authoritative Cache Wipe
package com.cyberking.shayarilok.data.remote

import com.cyberking.shayarilok.data.local.ConfigLocalCache
import com.cyberking.shayarilok.data.model.NotificationItem
import com.cyberking.shayarilok.data.model.ShayariConfig
import com.cyberking.shayarilok.data.model.ShayariItem
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges

class FirestoreRealtimeRepository(
    private val localCache: ConfigLocalCache? = null,
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance(
        FirebaseApp.getInstance(),
        "${firebaseAppletConfig.firestoreDatabaseId}"
    )
) {
    private var registration: ListenerRegistration? = null

    fun mapSnapshotToConfig(data: Map<String, Any>): ShayariConfig {
        val categories = (data["categories"] as? List<*>)
            ?.mapNotNull { it?.toString()?.trim()?.takeIf { s -> s.isNotEmpty() } }
            ?: listOf("All")

        val notifications = (data["notifications"] as? List<*>)?.mapNotNull { raw ->
            val m = raw as? Map<*, *> ?: return@mapNotNull null
            NotificationItem(
                id = (m["id"] as? Number)?.toInt() ?: 0,
                title = m["title"]?.toString().orEmpty(),
                message = m["message"]?.toString().orEmpty(),
                badge = m["badge"]?.toString() ?: "App Info",
                timeLabel = m["time_label"]?.toString() ?: "Today"
            )
        } ?: emptyList()

        val shayaris = (data["shayari_list"] as? List<*>)?.mapNotNull { raw ->
            val m = raw as? Map<*, *> ?: return@mapNotNull null
            ShayariItem(
                id = (m["id"] as? Number)?.toInt() ?: 0,
                category = m["category"]?.toString() ?: "Love",
                text = m["text"]?.toString().orEmpty(),
                author = m["author"]?.toString().orEmpty(),
                imageUrl = m["image_url"]?.toString().orEmpty()
            )
        } ?: emptyList()

        return ShayariConfig(
            appName = data["app_name"]?.toString() ?: "Shayari Lok",
            latestVersionCode = (data["latest_version_code"] as? Number)?.toInt() ?: 1,
            forceUpdateUrl = data["force_update_url"]?.toString().orEmpty(),
            maintenanceMode = data["maintenance_mode"] as? Boolean ?: false,
            maintenanceMessage = data["maintenance_message"]?.toString().orEmpty(),
            privacyPolicyUrl = data["privacy_policy_url"]?.toString().orEmpty(),
            socialLink = data["social_link"]?.toString().orEmpty(),
            adsEnabled = data["ads_enabled"] as? Boolean ?: true,
            bannerAdId = data["banner_ad_id"]?.toString().orEmpty(),
            interstitialAdId = data["interstitial_ad_id"]?.toString().orEmpty(),
            announcementTitle = data["announcement_title"]?.toString().orEmpty(),
            announcementMessage = data["announcement_message"]?.toString().orEmpty(),
            notifications = notifications,
            categories = if (categories.isEmpty()) listOf("All") else categories,
            shayariList = shayaris
        )
    }

    fun startLiveSync(
        onConfigUpdated: (Map<String, Any>) -> Unit,
        onBroadcastNotice: ((title: String, message: String) -> Unit)? = null,
        onError: (Exception) -> Unit
    ) {
        registration?.remove()
        registration = db.collection("publicSites")
            .document("${effectiveSiteId}")
            .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
                if (error != null) {
                    onError(error)
                    return@addSnapshotListener
                }
                if (snapshot == null || !snapshot.exists()) {
                    // Document deleted remotely -> wipe cached mock/seed state permanently
                    localCache?.wipeAllMockAndSeedData()
                    return@addSnapshotListener
                }
                val data = snapshot.data ?: return@addSnapshotListener
                // Persist authoritative snapshot immediately (even if shayari_list or notifications is empty [])
                val mappedConfig = mapSnapshotToConfig(data)
                localCache?.replaceConfigAuthoritatively(mappedConfig)

                // Delivers maintenance_mode, latest_version_code, categories, notifications, announcements, shayari_list, languages & theme instantaneously
                onConfigUpdated(data)

                val noticeTitle = data["announcement_title"]?.toString()?.trim().orEmpty()
                val noticeMsg = data["announcement_message"]?.toString()?.trim().orEmpty()
                if (onBroadcastNotice != null && (noticeTitle.isNotEmpty() || noticeMsg.isNotEmpty())) {
                    onBroadcastNotice(noticeTitle, noticeMsg)
                }
            }
    }

    fun stopLiveSync() {
        registration?.remove()
        registration = null
    }
}`;
}

export function generateAndroidLocaleSyncCode(
  siteId?: string | null
): string {
  const effectiveSiteId = siteId?.trim() || 'YOUR_ADMIN_UID';
  return `// LocaleSettingsManager.kt — Real-Time Multi-Language, Country & Dynamic Theme Sync
package com.cyberking.shayarilok.localization

import android.content.Context
import android.graphics.Color
import android.view.View
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration

data class RemoteLanguage(
    val code: String = "hi",
    val name: String = "Hindi",
    val nativeName: String = "हिन्दी",
    val flag: String = "🇮🇳",
    val rtl: Boolean = false,
    val enabled: Boolean = true,
    val uiLabels: Map<String, String> = emptyMap()
)

data class RemoteCountry(
    val code: String = "IN",
    val name: String = "India",
    val flag: String = "🇮🇳",
    val currency: String = "INR",
    val enabled: Boolean = true
)

class LocaleSettingsManager(
    private val context: Context,
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance("${firebaseAppletConfig.firestoreDatabaseId}")
) {
    private var registration: ListenerRegistration? = null
    private val prefs = context.getSharedPreferences("shayarilok_locale", Context.MODE_PRIVATE)

    fun observeLiveLanguagesAndTheme(
        onUpdate: (
            languages: List<RemoteLanguage>,
            countries: List<RemoteCountry>,
            primaryColorHex: String,
            accentColorHex: String
        ) -> Unit
    ) {
        registration?.remove()
        registration = db.collection("publicSites")
            .document("${effectiveSiteId}")
            .addSnapshotListener { snap, _ ->
                if (snap == null || !snap.exists()) {
                    prefs.edit().remove("selected_lang_code").putBoolean("has_synced_locales", true).commit()
                    onUpdate(emptyList(), emptyList(), "#4f46e5", "#e11d48")
                    return@addSnapshotListener
                }
                val data = snap.data ?: return@addSnapshotListener

                val rawLangs = (data["supported_languages"] as? List<*>) ?: emptyList<Any>()
                val languages = rawLangs.mapNotNull { item ->
                    val map = item as? Map<*, *> ?: return@mapNotNull null
                    val enabled = map["enabled"] as? Boolean ?: true
                    if (!enabled) return@mapNotNull null
                    val labelsMap = (map["uiLabels"] as? Map<*, *>)
                        ?.entries
                        ?.associate { it.key.toString() to it.value.toString() }
                        ?: emptyMap()
                    RemoteLanguage(
                        code = map["code"]?.toString() ?: "hi",
                        name = map["name"]?.toString() ?: "Hindi",
                        nativeName = map["nativeName"]?.toString() ?: "हिन्दी",
                        flag = map["flag"]?.toString() ?: "🌐",
                        rtl = map["rtl"] as? Boolean ?: false,
                        enabled = true,
                        uiLabels = labelsMap
                    )
                }

                // If Admin deleted or disabled the user's previously chosen language, purge it from SharedPreferences immediately
                val savedCode = prefs.getString("selected_lang_code", null)
                if (savedCode != null && languages.none { it.code == savedCode }) {
                    prefs.edit().remove("selected_lang_code").commit()
                }
                prefs.edit().putBoolean("has_synced_locales", true).commit()

                val rawCountries = (data["supported_countries"] as? List<*>) ?: emptyList<Any>()
                val countries = rawCountries.mapNotNull { item ->
                    val map = item as? Map<*, *> ?: return@mapNotNull null
                    val enabled = map["enabled"] as? Boolean ?: true
                    if (!enabled) return@mapNotNull null
                    RemoteCountry(
                        code = map["code"]?.toString() ?: "IN",
                        name = map["name"]?.toString() ?: "India",
                        flag = map["flag"]?.toString() ?: "🏳️",
                        currency = map["currency"]?.toString() ?: "INR",
                        enabled = true
                    )
                }

                val dynamicTheme = data["dynamic_theme"] as? Map<*, *>
                val presetId = dynamicTheme?.get("presetId")?.toString() ?: "indigo_editorial"
                val (fallbackPrimary, fallbackAccent) = resolvePresetPalette(presetId)
                val primaryHex = dynamicTheme?.get("primaryColor")?.toString() ?: fallbackPrimary
                val accentHex = dynamicTheme?.get("accentColor")?.toString() ?: fallbackAccent

                onUpdate(languages, countries, primaryHex, accentHex)
            }
    }

    fun resolvePresetPalette(presetId: String): Pair<String, String> = when (presetId) {
        "royal_midnight" -> "#6366f1" to "#f59e0b"
        "emerald_sufi" -> "#059669" to "#0d9488"
        "rose_shayari" -> "#be123c" to "#fb7185"
        "indigo_editorial" -> "#4f46e5" to "#e11d48"
        else -> "#4f46e5" to "#e11d48"
    }

    /**
     * Call when user taps any language in the User App Settings screen.
     * Switches Android app locale + layout direction + localized UI labels immediately.
     */
    fun selectUserLanguage(language: RemoteLanguage, rootView: View) {
        prefs.edit().putString("selected_lang_code", language.code).apply()
        rootView.layoutDirection = if (language.rtl) {
            View.LAYOUT_DIRECTION_RTL
        } else {
            View.LAYOUT_DIRECTION_LTR
        }
        AppCompatDelegate.setApplicationLocales(
            LocaleListCompat.forLanguageTags(language.code)
        )
    }

    fun parseThemeColor(hex: String, fallback: Int): Int =
        try { Color.parseColor(hex) } catch (_: Exception) { fallback }

    fun stop() {
        registration?.remove()
        registration = null
    }
}`;
}

export function generateCompleteAndroidAppPack(
  primaryUrl: string,
  fallbackUrl: string,
  siteId?: string | null
): string {
  const effectiveSiteId = siteId?.trim() || 'YOUR_ADMIN_UID';
  return `// ============================================================================
// ShayariLok_Complete_Kotlin_Pack.kt — Ready-to-Use Android Studio Integration
// Target Site / Document ID: publicSites/${effectiveSiteId}
// Firestore Database ID: ${firebaseAppletConfig.firestoreDatabaseId}
// Primary JSON Endpoint: ${primaryUrl}
// Fallback JSON Endpoint: ${fallbackUrl}
// ============================================================================

${generateKotlinModelsAndRepo(primaryUrl, fallbackUrl)}

${generateFirestoreRealtimeListenerCode(effectiveSiteId)}

${generateAndroidLocaleSyncCode(effectiveSiteId)}

object RemoteGateController {
    fun applyAdminRemoteControl(activity: AppCompatActivity, config: ShayariConfig) {
        if (config.maintenanceMode) {
            AlertDialog.Builder(activity)
                .setTitle("\${config.appName} — Maintenance")
                .setMessage(config.maintenanceMessage)
                .setCancelable(false)
                .setPositiveButton("Close") { _, _ -> activity.finishAffinity() }
                .show()
            return
        }
        if (config.latestVersionCode > BuildConfig.VERSION_CODE) {
            AlertDialog.Builder(activity)
                .setTitle("Update Required (v\${config.latestVersionCode})")
                .setMessage("कृपया नया वर्ज़न अपडेट करें।")
                .setCancelable(false)
                .setPositiveButton("Update Now") { _, _ ->
                    activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(config.forceUpdateUrl)))
                }
                .show()
        }
    }
}

class MainActivity : AppCompatActivity() {
    private val localCache by lazy { ConfigLocalCache(this) }
    private val firestoreSync by lazy { FirestoreRealtimeRepository(localCache = localCache) }
    private val localeManager by lazy { LocaleSettingsManager(this) }
    private var liveLanguages: List<RemoteLanguage> = emptyList()
    private var liveCountries: List<RemoteCountry> = emptyList()

    override fun onStart() {
        super.onStart()
        // Hydrate ONLY from authoritative remote cache on restart — never re-seed deleted dummy items
        localCache.getCachedConfigOrNull()?.let { cached ->
            RemoteGateController.applyAdminRemoteControl(this, cached)
        }

        firestoreSync.startLiveSync(
            onConfigUpdated = { data ->
                val cfg = firestoreSync.mapSnapshotToConfig(data)
                RemoteGateController.applyAdminRemoteControl(this, cfg)
            },
            onError = {
                // Offline fallback reads authoritative cache only; never injects hardcoded mock records
                localCache.getCachedConfigOrNull()?.let { cached ->
                    RemoteGateController.applyAdminRemoteControl(this, cached)
                }
            }
        )

        localeManager.observeLiveLanguagesAndTheme { langs, countries, _, _ ->
            liveLanguages = langs
            liveCountries = countries
        }
    }

    fun showLanguageAndCountryPickerDialog() {
        val labels = liveLanguages.map { "\${it.flag} \${it.nativeName} (\${it.name})" }.toTypedArray()
        if (labels.isEmpty()) return
        AlertDialog.Builder(this)
            .setTitle("Select Language & Region (\${liveCountries.size})")
            .setItems(labels) { _, idx ->
                val chosen = liveLanguages[idx]
                localeManager.selectUserLanguage(chosen, window.decorView)
                AppCompatDelegate.setApplicationLocales(
                    LocaleListCompat.forLanguageTags(chosen.code)
                )
            }
            .show()
    }

    override fun onStop() {
        super.onStop()
        firestoreSync.stopLiveSync()
        localeManager.stop()
    }
}`;
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
