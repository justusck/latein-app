const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.justusck.latina';
const PKG_PATH = PACKAGE.replace(/\./g, '/');

// ── Kotlin: AppWidgetProvider ───────────────────────────────────────────

const WIDGET_KT = `package ${PACKAGE}

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class LatinaWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        scheduleMidnightAlarm(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE || intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, LatinaWidget::class.java))
            if (ids.isNotEmpty()) {
                onUpdate(context, mgr, ids)
            }
        }
    }

    companion object {
        const val ACTION_UPDATE = "${PACKAGE}.ACTION_UPDATE_SAYING"

        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val data = getDailySaying(context)
            val views = RemoteViews(context.packageName, R.layout.latina_widget_layout)

            views.setTextViewText(R.id.widget_latin, data.latin)
            views.setTextViewText(R.id.widget_german, data.german)
            views.setTextViewText(R.id.widget_source, data.source)

            // Tap to open app
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (intent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        // ── Deterministic daily selection ──────────────────────────

        private var cachedSayings: List<SayingData>? = null
        private var cachedDay: String? = null
        private var cachedSaying: SayingData? = null

        private fun loadSayings(context: Context): List<SayingData> {
            cachedSayings?.let { return it }
            return try {
                val json = context.assets.open("sayings.json").bufferedReader().readText()
                val arr = JSONArray(json)
                val list = (0 until arr.length()).map { i ->
                    val obj = arr.getJSONObject(i)
                    SayingData(
                        obj.optString("latin", ""),
                        obj.optString("german", ""),
                        obj.optString("source", "")
                    )
                }
                cachedSayings = list
                list
            } catch (_: Exception) {
                emptyList()
            }
        }

        private fun todayKey(): String {
            return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        }

        /** Simple deterministic hash — same algorithm as the app's TS code. */
        private fun hash01(s: String): Double {
            var h = 0
            for (c in s) {
                h = 31 * h + c.code
            }
            val unsigned = h.toLong() and 0xFFFFFFFFL
            return (unsigned % 1_000_000L).toDouble() / 1_000_000.0
        }

        private fun getDailySaying(context: Context): SayingData {
            val day = todayKey()

            // Return cached if same day
            if (cachedDay == day && cachedSaying != null) {
                return cachedSaying!!
            }

            // First try the app-written file (has personalised selection)
            val fileSaying = loadSayingFromFile(context)
            if (fileSaying != null) {
                cachedDay = day
                cachedSaying = fileSaying
                return fileSaying
            }

            // Fall back to deterministic selection from bundled sayings
            val sayings = loadSayings(context)
            if (sayings.isNotEmpty()) {
                val seed = hash01(day)
                val index = (seed * sayings.size).toInt().coerceIn(0, sayings.size - 1)
                cachedDay = day
                cachedSaying = sayings[index]
                return sayings[index]
            }

            return DEFAULT_SAYING
        }

        private fun loadSayingFromFile(context: Context): SayingData? {
            return try {
                val file = File(context.filesDir, "daily_saying.json")
                if (!file.exists()) return null
                val json = JSONObject(file.readText())
                SayingData(
                    json.optString("latin", DEFAULT_SAYING.latin),
                    json.optString("german", DEFAULT_SAYING.german),
                    json.optString("source", DEFAULT_SAYING.source)
                )
            } catch (_: Exception) {
                null
            }
        }

        // ── Midnight alarm ─────────────────────────────────────────

        private fun scheduleMidnightAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return

            val intent = Intent(context, LatinaWidget::class.java).apply {
                action = ACTION_UPDATE
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Next midnight
            val cal = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC,
                    cal.timeInMillis,
                    pendingIntent
                )
            } catch (_: Exception) {
                // Some devices don't support exact alarms — fall back to inexact
                try {
                    alarmManager.set(AlarmManager.RTC, cal.timeInMillis, pendingIntent)
                } catch (_: Exception) {
                    // Alarm scheduling failed — widget will still work, just not at exact midnight
                }
            }
        }

        private val DEFAULT_SAYING = SayingData(
            "Carpe diem!",
            "Nutze den Tag!",
            "Horaz, Carmina I,11,8"
        )
    }
}

data class SayingData(val latin: String, val german: String, val source: String)
`;

// ── Layout XML ─────────────────────────────────────────────────────────

const LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="#66023C"
    android:gravity="center_vertical"
    android:clickable="true"
    android:focusable="true">

    <TextView
        android:id="@+id/widget_latin"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#FFFFFF"
        android:fontFamily="serif"
        android:textSize="16sp"
        android:textStyle="italic"
        android:maxLines="3"
        android:ellipsize="end" />

    <TextView
        android:id="@+id/widget_german"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#DDFFFFFF"
        android:textSize="12sp"
        android:maxLines="2"
        android:ellipsize="end"
        android:layout_marginTop="6dp" />

    <TextView
        android:id="@+id/widget_source"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#88FFFFFF"
        android:textSize="10sp"
        android:maxLines="1"
        android:ellipsize="end"
        android:layout_marginTop="2dp" />
</LinearLayout>
`;

// ── Widget Info XML ─────────────────────────────────────────────────────

const INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="50dp"
    android:updatePeriodMillis="86400000"
    android:initialLayout="@layout/latina_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description" />
`;

// ── Plugin ──────────────────────────────────────────────────────────────

const withLatinaWidget = (config) => {
  // 1. Register widget receiver in AndroidManifest
  config = withAndroidManifest(config, (props) => {
    const app = props.modResults.manifest.application?.[0];
    if (!app) return props;

    app.receiver = app.receiver || [];

    // Check if already registered
    const already = app.receiver.some(
      (r) => r.$?.['android:name'] === `${PACKAGE}.LatinaWidget`
    );
    if (!already) {
      app.receiver.push({
        $: {
          'android:name': `${PACKAGE}.LatinaWidget`,
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/latina_widget_info',
            },
          },
        ],
      });

      // Add RECEIVE_BOOT_COMPLETED permission if not present
      const manifestRoot = props.modResults.manifest;
      if (manifestRoot['uses-permission'] == null) {
        manifestRoot['uses-permission'] = [];
      }
      const addPerm = (name) => {
        if (!manifestRoot['uses-permission'].some(
          (p) => p.$?.['android:name'] === name
        )) {
          manifestRoot['uses-permission'].push({
            $: { 'android:name': name },
          });
        }
      };
      addPerm('android.permission.RECEIVE_BOOT_COMPLETED');
      addPerm('android.permission.SCHEDULE_EXACT_ALARM');
    }
    return props;
  });

  // 2. Write native source files during prebuild
  config = withDangerousMod(config, [
    'android',
    (props) => {
      const root = props.modRequest.platformProjectRoot;
      if (!root) return props;

      const srcDir = path.join(root, 'app', 'src', 'main', 'java', ...PKG_PATH.split('/'));
      const layoutDir = path.join(root, 'app', 'src', 'main', 'res', 'layout');
      const xmlDir = path.join(root, 'app', 'src', 'main', 'res', 'xml');
      const valuesDir = path.join(root, 'app', 'src', 'main', 'res', 'values');

      const assetsDir = path.join(root, 'app', 'src', 'main', 'assets');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });
      fs.mkdirSync(assetsDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'LatinaWidget.kt'), WIDGET_KT);
      fs.writeFileSync(path.join(layoutDir, 'latina_widget_layout.xml'), LAYOUT_XML);
      fs.writeFileSync(path.join(xmlDir, 'latina_widget_info.xml'), INFO_XML);

      // Write sayings JSON for the widget (deterministic daily selection)
      const projectRoot = path.resolve(root, '..', '..');
      const sayingsTsPath = path.join(projectRoot, 'src', 'data', 'sayings.ts');
      if (fs.existsSync(sayingsTsPath)) {
        try {
          const sayingsTs = fs.readFileSync(sayingsTsPath, 'utf-8');
          const start = sayingsTs.indexOf('[');
          const end = sayingsTs.lastIndexOf('];');
          if (start >= 0 && end > start) {
            const arrayStr = sayingsTs.slice(start, end + 1);
            // The array items are plain JS objects — safe to eval at build time
            const sayings = new Function(`return ${arrayStr}`)();
            const json = JSON.stringify(sayings);
            fs.writeFileSync(path.join(assetsDir, 'sayings.json'), json);
            console.log(`[withLatinaWidget] Bundled ${sayings.length} sayings for widget`);
          }
        } catch (err) {
          console.warn('[withLatinaWidget] Failed to bundle sayings JSON:', err.message);
        }
      }

      // Add widget description string if not already present
      const stringsPath = path.join(valuesDir, 'strings.xml');
      let stringsContent = '';
      if (fs.existsSync(stringsPath)) {
        stringsContent = fs.readFileSync(stringsPath, 'utf-8');
      }
      if (!stringsContent.includes('widget_description')) {
        if (!stringsContent.includes('<resources>')) {
          stringsContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n`;
        }
        stringsContent = stringsContent.replace(
          '</resources>',
          '    <string name="widget_description">Lateinisches Sprichwort des Tages</string>\n</resources>'
        );
        fs.writeFileSync(stringsPath, stringsContent);
      }

      return props;
    },
  ]);

  return config;
};

module.exports = withLatinaWidget;
