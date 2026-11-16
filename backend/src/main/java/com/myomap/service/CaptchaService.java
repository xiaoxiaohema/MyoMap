package com.myomap.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 图形运算验证码：生成一道随机算术题，答案存内存、一次性、限时有效。
 * 目的：提高脚本/机器人批量注册的门槛（配合接口限流）。
 */
@Service
public class CaptchaService {

    private static final long TTL_MS = 120_000;
    private static final int MAX_ENTRIES = 5000;

    private final SecureRandom rnd = new SecureRandom();
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    private static final class Entry {
        final String answer;
        final long expireAt;
        Entry(String answer, long expireAt) { this.answer = answer; this.expireAt = expireAt; }
    }

    /** 生成一道题，返回 {id, question} */
    public Map<String, String> generate() {
        int a = 1 + rnd.nextInt(9);
        int b = 1 + rnd.nextInt(9);
        boolean mul = rnd.nextBoolean();
        int ans = mul ? a * b : a + b;
        String question = a + (mul ? " × " : " + ") + b + " = ?";
        String id = UUID.randomUUID().toString().replace("-", "");
        store.put(id, new Entry(String.valueOf(ans), System.currentTimeMillis() + TTL_MS));
        if (store.size() > MAX_ENTRIES) {
            long now = System.currentTimeMillis();
            store.entrySet().removeIf(e -> e.getValue().expireAt < now);
        }
        Map<String, String> m = new HashMap<>();
        m.put("id", id);
        m.put("question", question);
        return m;
    }

    /** 校验答案（一次性：无论对错都会失效，防止暴力重试） */
    public boolean verify(String id, String answer) {
        if (id == null || id.isBlank() || answer == null) return false;
        Entry e = store.remove(id);
        if (e == null) return false;
        if (e.expireAt < System.currentTimeMillis()) return false;
        return e.answer.equals(answer.trim());
    }
}
