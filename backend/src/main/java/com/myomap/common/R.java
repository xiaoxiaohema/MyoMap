package com.myomap.common;

import lombok.Data;

/**
 * 统一响应体
 * 与前端约定：code = 1 成功，code = 0 失败
 */
@Data
public class R<T> {
    private int code;
    private String msg;
    private T data;

    public static <T> R<T> ok(T data) {
        R<T> r = new R<>();
        r.code = 1;
        r.msg = "success";
        r.data = data;
        return r;
    }

    public static <T> R<T> ok() {
        return ok(null);
    }

    public static <T> R<T> fail(String msg) {
        R<T> r = new R<>();
        r.code = 0;
        r.msg = msg;
        return r;
    }
}
