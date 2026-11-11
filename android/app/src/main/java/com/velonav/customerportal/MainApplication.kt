package com.velonav.customerportal

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createSbtsAlertChannel()
    loadReactNative(this)
  }

  /**
   * Backend FCM payloads use android.notification.channel_id = "sbts_alerts"
   * with high priority. Channel must exist with IMPORTANCE_HIGH.
   */
  private fun createSbtsAlertChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel =
      NotificationChannel(
          "sbts_alerts",
          "SBTS Alerts",
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          description = "Smart Bus trip, alert, and message notifications"
          enableVibration(true)
          setShowBadge(true)
        }

    val manager = getSystemService(NotificationManager::class.java)
    manager?.createNotificationChannel(channel)
  }
}
