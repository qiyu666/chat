package com.chat.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class NotificationBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.intent.action.BOOT_COMPLETED".equals(intent.getAction())) {
            NotificationHelper.createNotificationChannel(context);
        }
    }
}
