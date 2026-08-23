package com.chat.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

@CapacitorPlugin(name = "NativeNotifications")
public class NativeNotificationsPlugin extends Plugin {

    private PluginCall pendingPermissionCall;
    private final ActivityResultLauncher<String> permissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            result -> {
                PluginCall call = pendingPermissionCall;
                pendingPermissionCall = null;
                if (call != null) {
                    JSObject ret = new JSObject();
                    ret.put("isAuthorized", Boolean.TRUE.equals(result));
                    call.resolve(ret);
                }
            }
    );

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
        permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray notifications = call.getArray("notifications", new JSArray());
        int count = 0;
        try {
            for (int i = 0; i < notifications.length(); i++) {
                JSObject n = notifications.getJSObject(i);
                if (n == null) continue;
                String title = n.getString("title", "社交聊天");
                String body = n.getString("body", "");
                int id = n.getInteger("id", (int) (System.currentTimeMillis() / 1000) + i);
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
