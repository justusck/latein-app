const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.justusck.latina';
const PKG_PATH = PACKAGE.replace(/\./g, '/');

// ── Kotlin: AppWidgetProvider ───────────────────────────────────────────

const WIDGET_KT = `package ${PACKAGE}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

class LatinaWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val data = loadSaying(context)
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

        private fun loadSaying(context: Context): SayingData {
            return try {
                val file = File(context.filesDir, "daily_saying.json")
                if (!file.exists()) return DEFAULT_SAYING
                val json = JSONObject(file.readText())
                SayingData(
                    json.optString("latin", DEFAULT_SAYING.latin),
                    json.optString("german", DEFAULT_SAYING.german),
                    json.optString("source", DEFAULT_SAYING.source)
                )
            } catch (_: Exception) {
                DEFAULT_SAYING
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
    android:updatePeriodMillis="21600000"
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

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'LatinaWidget.kt'), WIDGET_KT);
      fs.writeFileSync(path.join(layoutDir, 'latina_widget_layout.xml'), LAYOUT_XML);
      fs.writeFileSync(path.join(xmlDir, 'latina_widget_info.xml'), INFO_XML);

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
