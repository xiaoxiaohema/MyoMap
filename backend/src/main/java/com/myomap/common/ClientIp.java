package com.myomap.common;

import jakarta.servlet.http.HttpServletRequest;

/** 解析真实客户端 IP（兼容 Nginx / Cloudflare 反向代理） */
public final class ClientIp {

    private ClientIp() {}

    public static String of(HttpServletRequest request) {
        if (request == null) return "unknown";
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // 取最左侧（原始客户端）
            return xff.split(",")[0].trim();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        String cf = request.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) {
            return cf.trim();
        }
        return request.getRemoteAddr();
    }
}
