package com.myomap.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** 鉴权拦截器：解析 Authorization 中的 JWT */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws java.io.IOException {
        // 预检请求直接放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String auth = request.getHeader("Authorization");
        if (auth != null && !auth.isBlank()) {
            String token = auth.startsWith("Bearer ") ? auth.substring(7) : auth;
            Long userId = jwtUtil.parseUserId(token);
            if (userId != null) {
                UserContext.set(userId);
                return true;
            }
        }
        // 未携带令牌或令牌无效：直接返回 401，避免下游以空用户身份继续执行
        return unauthorized(response);
    }

    /** 统一未认证响应体，与全局响应格式保持一致 */
    private boolean unauthorized(HttpServletResponse response) throws java.io.IOException {
        if (response.isCommitted()) {
            return false;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":401,\"msg\":\"未登录或登录已过期\",\"data\":null}");
        return false;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
