package com.chat.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "NativeNotifications",
    requestCodes = { NativeNotificationsPlugin.REQUEST_NOTIFICATION_PERMISSION }
)
public class NativeNotificationsPlugin extends Plugin {

    static final int REQUEST_NOTIFICATION_PERMISSION = 9001;
    private PluginCall pendingPermissionCall;

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean authorized = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            authorized = ContextCompat.checkSelfPermission(
                    getContext(), Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("isAuthorized", authorized);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("isAuthorized", true);
            call.resolve(ret);
            return;
        }
        if (ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("isAuthorized", true);
            call.resolve(ret);
            return;
        }
        pendingPermissionCall = call;
        ActivityCompat.requestPermissions(
                getActivity(),
                new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                REQUEST_NOTIFICATION_PERMISSION
        );
    }

    @Override
    public void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_NOTIFICATION_PERMISSION && pendingPermissionCall != null) {
            PluginCall call = pendingPermissionCall;
            pendingPermissionCall = null;
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            JSObject ret = new JSObject();
            ret.put("isAuthorized", granted);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray notifications = call.getArray("notifications", new JSArray());
        int count = 0;
        try {
            for (int i = 0; i < notifications.length(); i++) {
                JSONObject obj = notifications.optJSONObject(i);
                if (obj == null) continue;
                String title = obj.has("title") ? obj.getString("title") : "社交聊天";
                String body = obj.has("body") ? obj.getString("body") : "";
                int id = obj.has("id") ? obj.getInt("id") : (int) (System.currentTimeMillis() / 1000) + i;
                NativeNotificationService.showId(getContext(), title, body, id);
                count++;
            }
        } catch (JSONException e) {
            call.reject("Failed to parse notifications: " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("count", count);
        call.resolve(ret);
    }
}
