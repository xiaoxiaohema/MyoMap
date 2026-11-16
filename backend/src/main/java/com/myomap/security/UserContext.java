package com.myomap.security;

/** 当前登录用户上下文（ThreadLocal） */
public class UserContext {
    private static final ThreadLocal<Long> HOLDER = new ThreadLocal<>();

    public static void set(Long userId) {
        HOLDER.set(userId);
    }

    public static Long get() {
        return HOLDER.get();
    }

    public static Long require() {
        Long id = HOLDER.get();
        if (id == null) {
            throw new com.myomap.common.BizException("未登录或登录已过期");
        }
        return id;
    }

    public static void clear() {
        HOLDER.remove();
    }
}
